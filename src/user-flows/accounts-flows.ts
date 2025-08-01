import { APIRole, bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, Role, roleMention, StringSelectMenuInteraction, User, userMention } from "discord.js"
import { emptyAccount, getOrCreateAccount, setAccountCurrencyAmount } from "../database/accounts/accounts-database"
import { getCurrencies, getCurrencyName } from "../database/currencies/currencies-database"
import { Currency } from "../database/currencies/currencies-types"
import { DatabaseError } from "../database/database-types"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showConfirmationModal } from "../user-interfaces/extended-components"
import { ErrorMessages } from "../utils/constants"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/discord"
import { UserFlow } from "./user-flow"

export class AccountGiveFlow extends UserFlow {
    public id = 'account-give'
    protected components: Map<string, ExtendedComponent> = new Map()

    protected selectedCurrency: Currency | null = null
    
    private target: User | null = null
    protected amount: number | null = null

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `Can't give money. ${ErrorMessages.NoCurrencies}`)
    
        const target = interaction.options.getUser('target')
        const amount = interaction.options.getNumber('amount')
    
        if (!target || !amount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        this.target = target
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Give ${bold(`${this.amount} [${getCurrencyName(this.selectedCurrency?.id) || 'Select Currency'}]`)} to ${bold(`${this.target}`)}`
    }

    protected override initComponents(): void {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: 'Select a currency', time: 120_000 },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            { 
                customId: `${this.id}+submit`, 
                label: 'Submit', 
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
            if (!this.selectedCurrency || !this.target || !this.amount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const currentBalance = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency.id)?.amount || 0
            await setAccountCurrencyAmount(this.target!.id, this.selectedCurrency.id, currentBalance + this.amount)

            return await updateAsSuccessMessage(interaction, `You successfully gave ${bold(`${this.amount}`)} ${getCurrencyName(this.selectedCurrency.id)} to ${userMention(this.target.id)}`)
            
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class BulkAccountGiveFlow extends AccountGiveFlow {
    private targetRole: Role | APIRole | null = null

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return replyErrorMessage(interaction, `Can't give money. ${ErrorMessages.NoCurrencies}`)
    
        const targetRole = interaction.options.getRole('role')
        const amount = interaction.options.getNumber('amount')
    
        if (!targetRole || !amount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        this.targetRole = targetRole
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const roleString = this.targetRole ? roleMention(this.targetRole.id) : bold('Select Role')
        return `Give ${bold(`${this.amount} [${getCurrencyName(this.selectedCurrency?.id) || 'Select Currency'}]`)} to all users with role ${roleString}`
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()
        
        try {
            if (!this.selectedCurrency || !this.targetRole || !this.amount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
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
        if (!currencies.size) return replyErrorMessage(interaction, `Can't take money. ${ErrorMessages.NoCurrencies}`)
    
        const target = interaction.options.getUser('target')
        const amount = interaction.options.getNumber('amount')
    
        if (!target || !amount) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)

        this.target = target
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return `Take ${bold(`${this.amount} [${getCurrencyName(this.selectedCurrency?.id) || 'Select Currency'}]`)} from ${bold(`${this.target}`)}`
    }

    protected override initComponents() {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: 'Select a currency', time: 120_000 },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: 'Submit',
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
                label: 'Take all',
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
                label: 'Empty account',
                emoji: '🗑️',
                style: ButtonStyle.Danger,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                await emptyAccount(this.target!.id, 'currencies')
                await updateAsSuccessMessage(modalSubmitInteraction, `You successfully emptied ${bold(`${this.target}`)} account`)
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
            if (!this.selectedCurrency) return replyErrorMessage(interaction, ErrorMessages.InsufficientParameters)
            
            const currentBalance = (await getOrCreateAccount(this.target!.id)).currencies.get(this.selectedCurrency.id)?.amount || 0
            const newBalance = Math.max(currentBalance - this.amount!, 0)
            
            await setAccountCurrencyAmount(this.target!.id, this.selectedCurrency.id, newBalance)

            return await updateAsSuccessMessage(interaction, `You successfully took ${bold(`${this.amount}`)} ${getCurrencyName(this.selectedCurrency.id)} from ${bold(`${this.target}`)}`)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}