import { t } from "@/core/i18n/i18n.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ExtendedComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { APIRole, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, Role, StringSelectMenuInteraction, User, bold, roleMention, userMention } from "discord.js"
import { setAccountCurrencyAmount } from "../services/accounts-services.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { SnowflakeSchema } from "@/schemas/utils.js"
import { validate } from "@/lib/validation.js"


export class AccountGiveFlow extends UserFlow {
    public id = "account-give"
    protected components: Map<string, ExtendedComponent> = new Map()

    protected selectedCurrency: Currency | null = null 
    
    private target: User | null = null
    protected amount: number | null = null

    protected locale = "userFlows.accountGive" as const

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${t(`${this.locale}.errorMessages.cantGiveMoney`)} ${t("errorMessages.noCurrencies")}`)
    
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

    protected override initComponents(): void {
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
    
        this.components.set(currencySelectMenu.customId, currencySelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()
        
        if (!this.selectedCurrency || !this.target || !this.amount) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetId = SnowflakeSchema.parse(this.target.id)

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const currentBalance = account.currencies[this.selectedCurrency.id] || 0
        const [error2, _] = await setAccountCurrencyAmount(targetId, this.selectedCurrency.id, currentBalance + this.amount)

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
            logToDiscord(interaction.guild, `${interaction.member} gave **${this.amount} ${this.selectedCurrency.name}** to ${userMention(this.target.id)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)
    }
}

export class BulkAccountGiveFlow extends AccountGiveFlow {
    private targetRole: Role | APIRole | null = null

    public override id = "bulk-account-give"

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {

        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${t(`${this.locale}.errorMessages.cantGiveMoney`)} ${t("errorMessages.noCurrencies")}`)
    
        const targetRole = interaction.options.getRole("role")
        const amount = interaction.options.getNumber("amount")
    
        if (!targetRole || !amount) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        this.targetRole = targetRole
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return t(
            `${this.locale}.messages.bulkGive`, 
            { 
                amount: bold(`${this.amount}`), 
                currency: bold(`[${this.selectedCurrency?.name || t("defaultComponents.selectCurrency")}]`), 
                role: roleMention(this.targetRole!.id) 
            }
        )
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()
        
        if (!this.selectedCurrency || !this.targetRole || !this.amount) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetUsersIds = (await interaction.guild?.roles.fetch(this.targetRole.id))?.members.map(m => m.user.id) || []

        for (const userId of targetUsersIds) {
            const [error, targetId] = validate(SnowflakeSchema, userId)
            if (error) return updateAsErrorMessage(interaction, error.message)

            const [error1, account] = await getOrCreateAccount(targetId)
            if (error1) return updateAsErrorMessage(interaction, error1.message)
            
            const currentBalance = account.currencies[this.selectedCurrency.id] || 0
            const [error2, _] = await setAccountCurrencyAmount(targetId, this.selectedCurrency.id, currentBalance + this.amount)

            if (error2) return updateAsErrorMessage(interaction, error2.message)
        }

        const message = t(
            `${this.locale}.messages.bulkGiveSuccess`, 
            { 
                amount: bold(`${this.amount}`), 
                currency: this.selectedCurrency.name, 
                role: roleMention(this.targetRole.id) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} gave **${this.amount} ${this.selectedCurrency.name}** to ${roleMention(this.targetRole.id)}`)
        }

        return await updateAsSuccessMessage(interaction, message)
    }
}
