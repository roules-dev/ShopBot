import { t } from "@/core/i18n/i18n.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { NanoId } from "@/database/database.types.js"
import { Currency } from "@/features/currencies/database/currencies.types.js"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showConfirmationModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { SnowflakeSchema } from "@/schemas/utils.js"
import { ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, User, bold, userMention } from "discord.js"
import { emptyAccount, setAccountCurrencyAmount } from "../services/accounts.services.js"


export class AccountTakeFlow extends UserFlow {
    public override get id(): string { 
        return "account-take" 
    }

    private selectedCurrency: Currency & Identifiable<NanoId> | null = null
    
    private target: User | null = null
    private amount: number | null = null

    

    public async start(interaction: ChatInputCommandInteraction) {

        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${t(`userFlows.accountTake.errorMessages.cantTakeMoney`)} ${t("errorMessages.noCurrencies")}`)
    
        const target = interaction.options.getUser("target")
        const amount = interaction.options.getNumber("amount")
    
        if (!target || !amount) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        this.target = target
        this.amount = amount

        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage() {
        return t(
            `userFlows.accountTake.messages.default`, 
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
            (interaction, selectedCurrency) => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`userFlows.accountTake.components.submitButton`),
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
                label: t(`userFlows.accountTake.components.takeAllButton`),
                emoji: "🔥",
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                if (!this.selectedCurrency || !this.target) return this.updateInteraction(interaction)

                if (!this.target || !this.selectedCurrency) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

                const [error, account] = await getOrCreateAccount(SnowflakeSchema.parse(this.target.id))
                if (error) return updateAsErrorMessage(interaction, error.message)

                this.amount = account.currencies[this.selectedCurrency.id] || 0
                this.success(interaction)
            }
        )

        const emptyAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+empty-account`,
                label: t(`userFlows.accountTake.components.emptyAccountButton`),
                emoji: "🗑️",
                style: ButtonStyle.Danger,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                if (!this.target) return updateAsErrorMessage(modalSubmitInteraction, t("errorMessages.insufficientParameters"))                    

                const [error] = await emptyAccount(SnowflakeSchema.parse(this.target.id), "currencies")
                if (error) return updateAsErrorMessage(modalSubmitInteraction, error.message)

                await updateAsSuccessMessage(modalSubmitInteraction, t(`userFlows.accountTake.messages.successfullyEmptied`, { user: userMention(this.target.id) }))
            }
        )


        return [
            createComponent(currencySelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedCurrency != null)),
            createComponent(takeAllButton, () => takeAllButton.toggle(this.selectedCurrency != null && this.target != null)),
            createComponent(emptyAccountButton),
        ]
    }


    protected async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.selectedCurrency || !this.target || !this.amount) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetId = SnowflakeSchema.parse(this.target.id)

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const currentBalance = account.currencies[this.selectedCurrency.id] || 0
        const newBalance = Math.max(currentBalance - this.amount, 0)
        
        const [error2, _] = await setAccountCurrencyAmount(targetId, this.selectedCurrency.id, newBalance)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        const successMessage = t(
            `userFlows.accountTake.messages.success`, 
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