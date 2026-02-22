import { takeCurrencyFromAccounts } from "@/features/accounts/database/accounts-database.js"
import { getShopName, getShopsWithCurrency } from "@/features/shops/database/shops-database.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { defaultComponents, errorMessages, getLocale } from "@/lib/localization/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { showConfirmationModal } from "@/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, italic, MessageFlags, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js"
import { getCurrencies, getCurrencyName, removeCurrency } from "../database/currencies-database.js"
import { Currency } from "../database/currencies-types.js"
import { replaceTemplates } from "@/lib/localization/translate.js"


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
        (interaction) => this.updateInteraction(interaction),
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

        if (this.selectedCurrency == null) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

        await takeCurrencyFromAccounts(this.selectedCurrency.id)

        const currencyName = getCurrencyName(this.selectedCurrency.id) || ''

        await removeCurrency(this.selectedCurrency.id)
        return await updateAsSuccessMessage(interaction, replaceTemplates(this.locale.messages.success, {currency: bold(currencyName)}))
    }
}
