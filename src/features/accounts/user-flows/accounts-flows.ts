import { replyErrorMessage, updateAsSuccessMessage } from "@//lib/discord.js"
import { emptyAccount, getOrCreateAccount, setAccountCurrencyAmount } from "@/features/accounts/database/accounts-database.js"
import { getCurrencies, getCurrencyName } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { defaultComponents, errorMessages, getLocale, replaceTemplates } from "@/lib/localisation.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showConfirmationModal } from "@/user-interfaces/extended-components.js"
import { APIRole, bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, Role, roleMention, StringSelectMenuInteraction, User, userMention } from "discord.js"


export class AccountGiveFlow extends UserFlow {
    public id = 'account-give'
    protected components: Map<string, ExtendedComponent> = new Map()

    protected selectedCurrency: Currency | null = null
    
    private target: User | null = null
    protected amount: number | null = null

    protected locale = getLocale().userFlows.accountGive

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${this.locale.errorMessages?.cantGiveMoney} ${errorMessages().noCurrencies}`)
    
        const target = interaction.options.getUser('target')
        const amount = interaction.options.getNumber('amount')
    
        if (!target || !amount) return replyErrorMessage(interaction, errorMessages().insufficientParameters)

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
            this.locale.messages?.default, 
            { 
                amount: bold(`${this.amount}`), 
                currency: bold(`[${getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency}]`), 
                user: userMention(this.target!.id) 
            }
        )
    }

    protected override initComponents(): void {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: defaultComponents().selectCurrency, time: 120_000 },
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
                label: this.locale.components.submitButton, 
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
        
        if (!this.selectedCurrency || !this.target || !this.amount) return replyErrorMessage(interaction, errorMessages().insufficientParameters)
        
        const currentBalance = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency.id)?.amount || 0
        const [error, _] = await setAccountCurrencyAmount(this.target!.id, this.selectedCurrency.id, currentBalance + this.amount)

        if (error) return replyErrorMessage(interaction, error.message)

        
        const successMessage = replaceTemplates(
            this.locale.messages?.success, 
            { 
                amount: bold(`${this.amount}`), 
                currency: getCurrencyName(this.selectedCurrency.id)!, 
                user: userMention(this.target.id) 
            }
        )

        return await updateAsSuccessMessage(interaction, successMessage)
    }
}

export class BulkAccountGiveFlow extends AccountGiveFlow {
    private targetRole: Role | APIRole | null = null

    public override id = 'bulk-account-give'

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {

        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${this.locale.errorMessages?.cantGiveMoney} ${errorMessages().noCurrencies}`)
    
        const targetRole = interaction.options.getRole('role')
        const amount = interaction.options.getNumber('amount')
    
        if (!targetRole || !amount) return replyErrorMessage(interaction, errorMessages().insufficientParameters)

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
            this.locale.messages?.bulkGive, 
            { 
                amount: bold(`${this.amount}`), 
                currency: bold(`[${getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency}]`), 
                role: roleMention(this.targetRole!.id) 
            }
        )
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()
        
        if (!this.selectedCurrency || !this.targetRole || !this.amount) return replyErrorMessage(interaction, errorMessages().insufficientParameters)
        
        const targetUsersIds = (await interaction.guild?.roles.fetch(this.targetRole.id))?.members.map(m => m.user.id) || []

        for (const userId of targetUsersIds) {
            const currentBalance = (await getOrCreateAccount(userId)).currencies.get(this.selectedCurrency.id)?.amount || 0
            const [error, _] = await setAccountCurrencyAmount(userId, this.selectedCurrency.id, currentBalance + this.amount)

            if (error) return replyErrorMessage(interaction, error.message)
        }

        const message = replaceTemplates(
            this.locale.messages.bulkGiveSuccess, 
            { 
                amount: bold(`${this.amount}`), 
                currency: getCurrencyName(this.selectedCurrency.id)!, 
                role: roleMention(this.targetRole.id) 
            }
        )

        return await updateAsSuccessMessage(interaction, message)
    }
}

export class AccountTakeFlow extends UserFlow {
    public id = 'account-take'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    
    private target: User | null = null
    private amount: number | null = null

    protected locale = getLocale().userFlows.accountTake

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {

        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `${this.locale.errorMessages?.cantTakeMoney} ${errorMessages().noCurrencies}`)
    
        const target = interaction.options.getUser('target')
        const amount = interaction.options.getNumber('amount')
    
        if (!target || !amount) return replyErrorMessage(interaction, errorMessages().insufficientParameters)

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
            this.locale.messages?.default, 
            { 
                amount: bold(`${this.amount}`), 
                currency: bold(`[${getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency}]`), 
                user: userMention(this.target!.id) 
            }
        )
    }

    protected override initComponents() {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: defaultComponents().selectCurrency, time: 120_000 },
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
                label: this.locale.components.submitButton,
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
                label: this.locale.components.takeAllButton,
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
                label: this.locale.components.emptyAccountButton,
                emoji: '🗑️',
                style: ButtonStyle.Danger,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                await emptyAccount(this.target!.id, 'currencies')
                await updateAsSuccessMessage(modalSubmitInteraction, replaceTemplates(this.locale.messages.successfullyEmptied, { user: userMention(this.target!.id) }))
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

        if (!this.selectedCurrency) return replyErrorMessage(interaction, errorMessages().insufficientParameters)
        
        const currentBalance = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency.id)?.amount || 0
        const newBalance = Math.max(currentBalance - this.amount!, 0)
        
        const [error, _] = await setAccountCurrencyAmount(this.target!.id, this.selectedCurrency.id, newBalance)
        if (error) return replyErrorMessage(interaction, error.message)

        const successMessage = replaceTemplates(
            this.locale.messages?.success, 
            { 
                amount: bold(`${this.amount}`), 
                currency: getCurrencyName(this.selectedCurrency.id)!, 
                user: userMention(this.target!.id) 
            }
        )

        return await updateAsSuccessMessage(interaction, successMessage)

    }
}