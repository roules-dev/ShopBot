import { t } from "@/core/i18n/i18n.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { err, ok } from "@/lib/error-handling.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showConfirmationModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonStyle, ChatInputCommandInteraction } from "discord.js"
import { Currency } from "../database/currencies.types.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"


export class CurrencyRemoveFlow extends UserFlow {
    public override get id(): string {
        return "currency-remove"
    }
    private selectedCurrency: Currency | null = null

    public override async prestart(_interaction: ChatInputCommandInteraction) {
        const currencies = getCurrencies()
        if (currencies.size == 0) return err(t("errorMessages.noCurrencies"))

        return ok(true)
    }

    protected override initComponents() {
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
                label: t(`userFlows.currencyRemove.components.submitButton`),
                emoji: {name: "⛔"},
                style: ButtonStyle.Danger,
                disabled: this.selectedCurrency == null,
                time: 120_000,
            },
            async (interaction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)
                
                if (confirmed) return this.success(modalSubmitInteraction)
                
                return this.updateInteraction(modalSubmitInteraction)
            }
        )

        return [
            createComponent(currencySelect),
            createComponent(submitButton, () => {
                const shopsWithCurrency = new Map([["TODO: do real check here", true]])

                submitButton.toggle((this.selectedCurrency != null) && (shopsWithCurrency.size == 0)) 
            })
        ]
    }
    
    getMessage() {  
        if (this.selectedCurrency) {
            // const itemsWithCurrency = 
           
            // if (shopsWithCurrency.size > 0) {
            //     const shopsWithCurrencyNames = Array.from(shopsWithCurrency.values()).map(shop => bold(italic(shop.name))).join(", ")

            //     const errorMessage = t(`userFlows.currencyRemove.errorMessages.cantRemoveCurrency`, {
            //         currency: bold(this.selectedCurrency.name || ""),
            //         shops: shopsWithCurrencyNames
            //     })
            //     const tipMessage = t(`userFlows.currencyRemove.errorMessages.changeShopsCurrencies`)

            //     return `${errorMessage}\n${tipMessage}`
            // }
            // TODO: check if items have this currency in their price and display them in the message as well
            
        }

        const message = t(`userFlows.currencyRemove.messages.default`, {
            currency: bold(formattedEmojiableName(this.selectedCurrency) || t("defaultComponents.selectCurrency"))
        })

        return message
    }

    protected async success(_interaction: UserInterfaceInteraction) {
        throw new Error("Method not implemented.")
        // this.disableComponents()

        // if (this.selectedCurrency == null) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        // const [error] = await takeCurrencyFromAccounts(this.selectedCurrency.id)
        // if (error) return updateAsErrorMessage(interaction, error.message)

        // const currencyName = this.selectedCurrency.name || ""

        // const [error2] = await removeCurrency(this.selectedCurrency.id)
        // if (error2) return updateAsErrorMessage(interaction, error2.message)

        // return await updateAsSuccessMessage(interaction, t(`userFlows.currencyRemove.messages.success`, {currency: bold(currencyName)}))
    }
}
