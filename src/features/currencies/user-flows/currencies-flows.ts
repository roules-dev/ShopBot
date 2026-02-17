
import { UserFlow } from "@/user-flows/user-flow.js"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showConfirmationModal } from "@/user-interfaces/extended-components.js"
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { EMOJI_REGEX } from "@/utils/constants.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/utils/discord.js"
import { defaultComponents, errorMessages, getLocale, replaceTemplates } from "@/utils/localisation.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, italic, MessageFlags, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js"
import { getCurrencies, getCurrencyName, removeCurrency, updateCurrency } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { DatabaseError } from "@/database/database-types.js"
import { takeCurrencyFromAccounts } from "@/features/accounts/database/accounts-database.js" // external dependency, should be refactored
import { getShopsWithCurrency, getShopName } from "@/features/shops/database/shops-database.js" // external dependency, should be refactored
import { assertNeverReached } from "@/lib/error-handling.js"


export class CurrencyRemoveFlow extends UserFlow {
    id = 'currency-remove'
    protected components: Map<string, ExtendedComponent> = new Map()
    private selectedCurrency: Currency | null = null

    private locale = getLocale().userFlows.currencyRemove

    async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, errorMessages().noCurrencies)

        this.selectedCurrency = null

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return 
    }

    initComponents(): void {
        const currencySelect = new ExtendedStringSelectMenuComponent<Currency>({
            customId: `${this.id}+select-currency`,
            placeholder: defaultComponents().selectCurrency,
            time: 120_000
        }, getCurrencies(),
        (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
            this.selectedCurrency = selectedCurrency
            this.updateInteraction(interaction)
        })

        const submitButton = new ExtendedButtonComponent({
            customId: `${this.id}+submit`,
            label: this.locale.components?.submitButton,
            emoji: {name: '⛔'},
            style: ButtonStyle.Danger,
            disabled: this.selectedCurrency == null,
            time: 120_000,
        },
        async (interaction: ButtonInteraction) => {
            const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)
            
            if (confirmed) return this.success(modalSubmitInteraction)
            
            return this.updateInteraction(modalSubmitInteraction)
        })

        this.components.set(currencySelect.customId, currencySelect)
        this.components.set(submitButton.customId, submitButton)
    }
    
    getMessage(): string {  
        if (this.selectedCurrency) {
            const shopsWithCurrency = getShopsWithCurrency(this.selectedCurrency.id)

            if (shopsWithCurrency.size > 0) {
                const shopsWithCurrencyNames = Array.from(shopsWithCurrency.values()).map(shop => bold(italic(getShopName(shop.id) || ''))).join(', ')

                const errorMessage = replaceTemplates(this.locale.errorMessages.cantRemoveCurrency, {
                    currency: bold(getCurrencyName(this.selectedCurrency.id) || ''),
                    shops: shopsWithCurrencyNames
                })
                const tipMessage = this.locale.errorMessages.changeShopsCurrencies

                return `${errorMessage}\n${tipMessage}`
            }
        }

        const message = replaceTemplates(this.locale.messages.default, {
            currency: bold(getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency)
        })

        return message
    }

    protected updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        const shopsWithCurrency = getShopsWithCurrency(this.selectedCurrency?.id || '')

        submitButton.toggle((this.selectedCurrency != null) && (shopsWithCurrency.size == 0)) 
    }

    protected async success(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (this.selectedCurrency == null) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

            await takeCurrencyFromAccounts(this.selectedCurrency.id)

            const currencyName = getCurrencyName(this.selectedCurrency.id) || ''

            await removeCurrency(this.selectedCurrency.id)
            return await updateAsSuccessMessage(interaction, replaceTemplates(this.locale.messages.success, {currency: bold(currencyName)}))
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
        
    }
}

export enum EditCurrencyOption {
    NAME = 'name',
    EMOJI = 'emoji'
}

export class EditCurrencyFlow extends UserFlow {
    id = 'currency-edit'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private updateOption: EditCurrencyOption | null = null
    private updateOptionValue: string | null = null

    protected locale = getLocale().userFlows.currencyEdit

    async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, errorMessages().noCurrencies)    

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !Object.values(EditCurrencyOption).includes(subcommand as EditCurrencyOption)) return replyErrorMessage(interaction, errorMessages().invalidSubcommand)
        this.updateOption = subcommand as EditCurrencyOption

        this.updateOptionValue = this.getUpdateValue(interaction, this.updateOption)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const message = replaceTemplates(this.locale.messages.default, {
            currency: bold(getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency),
            option: bold(this.getUpdateOptionName(this.updateOption!)),
            value: bold(this.updateOptionValue!)
        })

        return message
    }

    protected override initComponents(): void {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent<Currency>(
            { customId: `${this.id}+select-currency`, placeholder: defaultComponents().selectCurrency, time: 120_000 },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )
    
        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: this.locale.components.submitButton,
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: this.selectedCurrency == null,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.success(interaction),
        )

        this.components.set(currencySelectMenu.customId, currencySelectMenu)
        this.components.set(submitButton.customId, submitButton)
        
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected override async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        try {
            if (!this.selectedCurrency) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            if (!this.updateOption || this.updateOptionValue == undefined) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            
            const oldName = getCurrencyName(this.selectedCurrency.id) || ''

            await updateCurrency(this.selectedCurrency.id, { [this.updateOption.toString()]: this.updateOptionValue } )

            const message = replaceTemplates(this.locale.messages.success, {
                currency: bold(oldName),
                option: bold(this.getUpdateOptionName(this.updateOption)),
                value: bold(this.updateOptionValue)
            })

            return await updateAsSuccessMessage(interaction, message)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }

    private getUpdateOptionName(option: EditCurrencyOption): string {
        return this.locale.editOptions[option] ?? option
    }

    private getUpdateValue(interaction: ChatInputCommandInteraction, option: EditCurrencyOption): string {
        switch (option) {
            case EditCurrencyOption.NAME:
                return interaction.options.getString(`new-${option}`)?.replaceSpaces() || ''
            case EditCurrencyOption.EMOJI: {
                const emojiOption = interaction.options.getString(`new-${option}`)
                return emojiOption?.match(EMOJI_REGEX)?.[0] || ''
            }
            default:
                assertNeverReached(option)
        }
    }
}