import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { t } from "@/lib/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { showConfirmationModal } from "@/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, StringSelectMenuInteraction, User, bold, userMention } from "discord.js"
import { emptyAccount, getOrCreateAccount, setAccountCurrencyAmount } from "../database/accounts-database.js"


export class AccountTakeFlow extends UserFlow {
    public id = "account-take"
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    
    private target: User | null = null
    private amount: number | null = null

    protected locale = "userFlows.accountTake" as const

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {

        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${t(`${this.locale}.errorMessages.cantTakeMoney`)} ${t("errorMessages.noCurrencies")}`)
    
        const target = interaction.options.getUser("target")
        const amount = interaction.options.getNumber("amount")
    
        if (!target || !amount) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        this.target = target
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return t(
            `${this.locale}.messages.default`, 
            { 
                amount: bold(`${this.amount}`), 
                currency: bold(`[${this.selectedCurrency?.name || t("defaultComponents.selectCurrency")}]`), 
                user: userMention(this.target!.id) 
            }
        )
    }

    protected override initComponents() {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: t("defaultComponents.selectCurrency"), time: 120_000 },
            getCurrencies(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`${this.locale}.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const takeAllButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+take-all`,
                label: t(`${this.locale}.components.takeAllButton`),
                emoji: "🔥",
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                if (!this.selectedCurrency || !this.target) return this.updateInteraction(interaction)

                if (!this.target || !this.selectedCurrency) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

                const [error, account] = await getOrCreateAccount(this.target.id)
                if (error) return updateAsErrorMessage(interaction, error.message)

                this.amount = account.currencies.get(this.selectedCurrency.id)?.amount || 0
                this.success(interaction)
            }
        )

        const emptyAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+empty-account`,
                label: t(`${this.locale}.components.emptyAccountButton`),
                emoji: "🗑️",
                style: ButtonStyle.Danger,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                if (!this.target) return updateAsErrorMessage(modalSubmitInteraction, t("errorMessages.insufficientParameters"))                    

                const [error] = await emptyAccount(this.target.id, "currencies")
                if (error) return updateAsErrorMessage(modalSubmitInteraction, error.message)

                await updateAsSuccessMessage(modalSubmitInteraction, t(`${this.locale}.messages.successfullyEmptied`, { user: userMention(this.target.id) }))
            }
        )

        this.components.set(currencySelectMenu.customId, currencySelectMenu)
        this.components.set(submitButton.customId, submitButton)
        this.components.set(takeAllButton.customId, takeAllButton)
        this.components.set(emptyAccountButton.customId, emptyAccountButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (submitButton instanceof ExtendedButtonComponent) {
            submitButton.toggle(this.selectedCurrency != null)
        }

        const takeAllButton = this.components.get(`${this.id}+take-all`)
        if (takeAllButton instanceof ExtendedButtonComponent) {
            takeAllButton.toggle(this.selectedCurrency != null && this.target != null)
        }
    }

    protected async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        if (!this.selectedCurrency || !this.target || !this.amount) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const [error, account] = await getOrCreateAccount(this.target.id)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const currentBalance = account.currencies.get(this.selectedCurrency.id)?.amount || 0
        const newBalance = Math.max(currentBalance - this.amount, 0)
        
        const [error2, _] = await setAccountCurrencyAmount(this.target.id, this.selectedCurrency.id, newBalance)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        const successMessage = t(
            `${this.locale}.messages.success`, 
            { 
                amount: bold(`${this.amount}`), 
                currency: this.selectedCurrency.name, 
                user: userMention(this.target.id) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} took **${this.amount} ${this.selectedCurrency.name}** from ${userMention(this.target.id)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)

    }
}