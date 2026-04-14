import { t } from "@/core/i18n/i18n.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { replyErrorMessage } from "@/lib/discord.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ExtendedComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showConfirmationModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, ModalSubmitInteraction } from "discord.js"
import { Currency } from "../database/currencies.types.js"

export class CurrencyRemoveFlow extends UserFlow {
    id = "currency-remove"
    protected components: Map<string, ExtendedComponent> = new Map()
    private selectedCurrency: Currency | null = null

    private locale = "userFlows.currencyRemove" as const

    async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, t("errorMessages.noCurrencies"))

        this.selectedCurrency = null

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return 
    }

    initComponents() {
        const currencySelect = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-currency`,
                placeholder: t("defaultComponents.selectCurrency"),
                time: 120_000
            }, 
            getCurrencies(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction, selectedCurrency) => {
            this.selectedCurrency = selectedCurrency
            this.updateInteraction(interaction)
        })

        const submitButton = new ExtendedButtonComponent({
            customId: `${this.id}+submit`,
            label: t(`${this.locale}.components.submitButton`),
            emoji: {name: "⛔"},
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
            // const itemsWithCurrency = 
           
            // if (shopsWithCurrency.size > 0) {
            //     const shopsWithCurrencyNames = Array.from(shopsWithCurrency.values()).map(shop => bold(italic(shop.name))).join(", ")

            //     const errorMessage = t(`${this.locale}.errorMessages.cantRemoveCurrency`, {
            //         currency: bold(this.selectedCurrency.name || ""),
            //         shops: shopsWithCurrencyNames
            //     })
            //     const tipMessage = t(`${this.locale}.errorMessages.changeShopsCurrencies`)

            //     return `${errorMessage}\n${tipMessage}`
            // }
            // TODO: check if items have this currency in their price and display them in the message as well
            
        }

        const message = t(`${this.locale}.messages.default`, {
            currency: bold(this.selectedCurrency?.name || t("defaultComponents.selectCurrency"))
        })

        return message
    }

    protected updateComponents() {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        const shopsWithCurrency = new Map([["TODO: do real check here", true]])

        submitButton.toggle((this.selectedCurrency != null) && (shopsWithCurrency.size == 0)) 
    }

    protected async success(_interaction: ButtonInteraction | ModalSubmitInteraction): Promise<unknown> {
        throw new Error("Method not implemented.")
        // this.disableComponents()

        // if (this.selectedCurrency == null) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        // const [error] = await takeCurrencyFromAccounts(this.selectedCurrency.id)
        // if (error) return updateAsErrorMessage(interaction, error.message)

        // const currencyName = this.selectedCurrency.name || ""

        // const [error2] = await removeCurrency(this.selectedCurrency.id)
        // if (error2) return updateAsErrorMessage(interaction, error2.message)

        // return await updateAsSuccessMessage(interaction, t(`${this.locale}.messages.success`, {currency: bold(currencyName)}))
    }
}
