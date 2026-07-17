import { t } from "@/core/i18n/i18n.js"
import { deleteCurrency, getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { NanoId } from "@/database/database.types.js"
import { takeCurrencyFromAccounts } from "@/features/accounts/services/accounts.services.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/components/button.js"
import { createComponent } from "@/lib/ui/components/extended-components.js"
import { doAfterConfirmation } from "@/lib/ui/components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonStyle, ChatInputCommandInteraction } from "discord.js"
import { Currency } from "../../database/currencies.types.js"


export class CurrencyRemoveFlow extends UserFlow {
    public override get id(): string {
        return "currency-remove"
    }
    private selectedCurrency: Currency & Identifiable<NanoId> | null = null

    public override async prepare(_interaction: ChatInputCommandInteraction) {
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
                emoji: "⛔",
                style: ButtonStyle.Danger,
                disabled: this.selectedCurrency == null,
                time: 120_000,
            },
            async (interaction) => {
                doAfterConfirmation(interaction, 
                    async i => await this.success(i),
                    async i => await this.updateInteraction(i) ,
                    t(`userFlows.currencyRemove.components.confirmationModalTitle`, { 
                        currency: formattedEmojiableName(this.selectedCurrency)! 
                    })
                )
            }
        )

        return [
            createComponent(currencySelect),
            createComponent(submitButton, () => {
                submitButton.toggle((this.selectedCurrency != null) && (this.selectedCurrency.refCount == 0)) 
            })
        ]
    }
    
    getMessage() {  
        if (this.selectedCurrency) {
            if (this.selectedCurrency.refCount > 0) {
                return t(`userFlows.currencyRemove.errorMessages.cantRemoveCurrency`, {
                    currency: bold(formattedEmojiableName(this.selectedCurrency) || t("defaultComponents.selectCurrency"))
                })
            }
        }

        const message = t(`userFlows.currencyRemove.messages.default`, {
            currency: bold(formattedEmojiableName(this.selectedCurrency) || t("defaultComponents.selectCurrency"))
        })

        return message
    }

    protected async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        if (this.selectedCurrency == null) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (this.selectedCurrency.refCount > 0) {
            return updateAsErrorMessage(interaction, t("userFlows.currencyRemove.errorMessages.cantRemoveCurrency", {
                currency: bold(formattedEmojiableName(this.selectedCurrency))
            }))
        }

        const [error] = await takeCurrencyFromAccounts(this.selectedCurrency.id)
        if (error) return updateAsErrorMessage(interaction, error.message)


        const [error2] = await deleteCurrency(this.selectedCurrency.id)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        return await updateAsSuccessMessage(interaction, t(`userFlows.currencyRemove.messages.success`, {currency: bold(formattedEmojiableName(this.selectedCurrency))}))
    }
}
