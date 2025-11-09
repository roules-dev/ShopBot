import { APIRole, bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, Role, roleMention, StringSelectMenuInteraction, User, userMention } from "discord.js"
import { emptyAccount, getOrCreateAccount, setAccountCurrencyAmount } from "../database/accounts/accounts-database"
import { getCurrencies, getCurrencyName } from "../database/currencies/currencies-database"
import { Currency } from "../database/currencies/currencies-types"
import { DatabaseError } from "../database/database-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showConfirmationModal } from "../user-interfaces/extended-components"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/discord"
import { UserFlow } from "./user-flow"
import { LocaleStrings, replaceTemplates } from "../utils/localisation"
import { getLocale } from ".."

export class AccountGiveFlow extends UserFlow {
    public id = 'account-give'
    protected components: Map<string, ExtendedComponent> = new Map()

    protected selectedCurrency: Currency | null = null
    
    private target: User | null = null
    protected amount: number | null = null


    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${getLocale().userFlows.accountGive.errorMessages?.cantGiveMoney} ${getLocale().errorMessages.noCurrencies}`)
    
        const target = interaction.options.getUser('target')
        const amount = interaction.options.getNumber('amount')
    
        if (!target || !amount) return replyErrorMessage(interaction, getLocale().errorMessages.insufficientParameters)

        this.target = target
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return replaceTemplates(
            getLocale().userFlows.accountGive.messages?.default, 
            { 
                amount: bold(`${this.amount}`), 
                currency: bold(`[${getCurrencyName(this.selectedCurrency?.id) || getLocale().defaultComponents.selectCurrencyPlaceholder}]`), 
                user: userMention(this.target!.id) 
            }
        )
    }

    protected override initComponents(): void {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: getLocale().defaultComponents.selectCurrencyPlaceholder, time: 120_000 },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            { 
                customId: `${this.id}+submit`, 
                label: getLocale().userFlows.accountGive.components?.submitButtonLabel, 
                emoji: '✅', 
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
        
        try {
            if (!this.selectedCurrency || !this.target || !this.amount) return replyErrorMessage(interaction, getLocale().errorMessages.insufficientParameters)
            
            const currentBalance = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency.id)?.amount || 0
            await setAccountCurrencyAmount(this.target!.id, this.selectedCurrency.id, currentBalance + this.amount)

            const successMessage = replaceTemplates(
                getLocale().userFlows.accountGive.messages?.success, 
                { 
                    amount: bold(`${this.amount}`), 
                    currency: getCurrencyName(this.selectedCurrency.id)!, 
                    user: userMention(this.target.id) 
                }
            )

            return await updateAsSuccessMessage(interaction, successMessage)
            
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class BulkAccountGiveFlow extends AccountGiveFlow {
    private targetRole: Role | APIRole | null = null

    public override id = 'bulk-account-give'

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {

        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${getLocale().userFlows.accountGive.errorMessages?.cantGiveMoney} ${getLocale().errorMessages.noCurrencies}`)
    
        const targetRole = interaction.options.getRole('role')
        const amount = interaction.options.getNumber('amount')
    
        if (!targetRole || !amount) return replyErrorMessage(interaction, getLocale().errorMessages.insufficientParameters)

        this.targetRole = targetRole
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return replaceTemplates(
            getLocale().userFlows.accountGive.messages?.bulkGive, 
            { 
                amount: bold(`${this.amount}`), 
                currency: bold(`[${getCurrencyName(this.selectedCurrency?.id) || getLocale().defaultComponents.selectCurrencyPlaceholder}]`), 
                role: roleMention(this.targetRole!.id) 
            }
        )
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()
        
        try {
            if (!this.selectedCurrency || !this.targetRole || !this.amount) return replyErrorMessage(interaction, getLocale().errorMessages.insufficientParameters)
            
            const targetUsersIds = (await interaction.guild?.roles.fetch(this.targetRole.id))?.members.map(m => m.user.id) || []

            for (const userId of targetUsersIds) {
                const currentBalance = (await getOrCreateAccount(userId)).currencies.get(this.selectedCurrency.id)?.amount || 0
                await setAccountCurrencyAmount(userId, this.selectedCurrency.id, currentBalance + this.amount)
            }

            return await updateAsSuccessMessage(interaction, `You successfully gave ${bold(`${this.amount}`)} ${getCurrencyName(this.selectedCurrency.id)} to to all users with role ${roleMention(this.targetRole.id)}`)
            
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class AccountTakeFlow extends UserFlow {
    public id = 'account-take'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    
    private target: User | null = null
    private amount: number | null = null

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {

        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${getLocale().userFlows.accountTake.errorMessages?.cantTakeMoney} ${getLocale().errorMessages.noCurrencies}`)
    
        const target = interaction.options.getUser('target')
        const amount = interaction.options.getNumber('amount')
    
        if (!target || !amount) return replyErrorMessage(interaction, getLocale().errorMessages.insufficientParameters)

        this.target = target
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return replaceTemplates(
            getLocale().userFlows.accountTake.messages?.default, 
            { 
                amount: bold(`${this.amount}`), 
                currency: bold(`[${getCurrencyName(this.selectedCurrency?.id) || getLocale().defaultComponents.selectCurrencyPlaceholder}]`), 
                user: userMention(this.target!.id) 
            }
        )
    }

    protected override initComponents() {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: getLocale().defaultComponents.selectCurrencyPlaceholder, time: 120_000 },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: getLocale().userFlows.accountTake.components?.submitButtonLabel,
                emoji: '✅',
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const takeAllButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+take-all`,
                label: getLocale().userFlows.accountTake.components?.takeAllButtonLabel,
                emoji: '🔥',
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                if (!this.selectedCurrency || !this.target) return this.updateInteraction(interaction)

                this.amount = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency!.id)?.amount || 0
                this.success(interaction)
            }
        )

        const emptyAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+empty-account`,
                label: getLocale().userFlows.accountTake.components?.emptyAccountButtonLabel,
                emoji: '🗑️',
                style: ButtonStyle.Danger,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                await emptyAccount(this.target!.id, 'currencies')
                await updateAsSuccessMessage(modalSubmitInteraction, replaceTemplates(getLocale().userFlows.accountTake.messages.successfullyEmptied, { user: userMention(this.target!.id) }))
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
        try {
            if (!this.selectedCurrency) return replyErrorMessage(interaction, getLocale().errorMessages.insufficientParameters)
            
            const currentBalance = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency.id)?.amount || 0
            const newBalance = Math.max(currentBalance - this.amount!, 0)
            
            await setAccountCurrencyAmount(this.target!.id, this.selectedCurrency.id, newBalance)

            const successMessage = replaceTemplates(
                getLocale().userFlows.accountTake.messages?.success, 
                { 
                    amount: bold(`${this.amount}`), 
                    currency: getCurrencyName(this.selectedCurrency.id)!, 
                    user: userMention(this.target!.id) 
                }
            )

            return await updateAsSuccessMessage(interaction, successMessage)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}