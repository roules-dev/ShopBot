import { t } from "@/core/i18n/i18n.js"
import { getCurrencies, updateCurrency } from "@/core/services/currencies/currencies.services.js"
import { NanoId } from "@/database/database.types.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { optionalOrNull } from "@/schemas/optional-to-null.js"
import { emojiSchema } from "@/schemas/utils.js"
import { formattedEmojiableName, getDisplayOptionValue } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction } from "discord.js"
import z from "zod"
import { Currency } from "../../database/currencies.types.js"


export const editCurrencyParamsSchema = z.discriminatedUnion("kind", [
    z.object({ 
        kind: z.literal("name"), 
        name: z.string() 
    }),
    z.object({ 
        kind: z.literal("emoji"),
        emoji: optionalOrNull(emojiSchema).catch(null) 
    }),
])


export class EditCurrencyFlow extends UserFlow<z.infer<typeof editCurrencyParamsSchema>> {
    public override get id(): string { 
        return "currency-edit" 
    }

    private selectedCurrency: Currency & Identifiable<NanoId> | null = null
    
    protected override async prestart(_interaction: ChatInputCommandInteraction) {
        const currencies = getCurrencies()
        if (currencies.size == 0) return err(t("errorMessages.noCurrencies"))

        return ok(true)
    }

    protected override getMessage() {
        const message = t(`userFlows.currencyEdit.messages.default`, {
            currency: bold(formattedEmojiableName(this.selectedCurrency) || t("defaultComponents.selectCurrency")),
            option: bold(this.params.kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })

        return message
    }

    protected override initComponents() {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: t("defaultComponents.selectCurrency"), time: 120_000 },
            getCurrencies(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction , selectedCurrency) => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`userFlows.currencyEdit.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: this.selectedCurrency == null,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.success(interaction),
        )

        return [
            createComponent(currencySelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedCurrency != null)),
        ]
    }

    protected override async success(interaction: UserInterfaceInteraction) {
        if (!this.selectedCurrency) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const oldName = formattedEmojiableName(this.selectedCurrency)
        const { kind, ...option } = this.params

        const [error] = await updateCurrency(this.selectedCurrency.id, option)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.currencyEdit.messages.success`, {
            currency: bold(oldName),
            option: bold(kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}
