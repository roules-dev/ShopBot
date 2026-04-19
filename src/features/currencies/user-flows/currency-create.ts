import { t } from "@/core/i18n/i18n.js"
import { createCurrency } from "@/core/services/currencies/currencies.services.js"
import { replyErrorMessage, replySuccessMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
import { optionalOrNull } from "@/schemas/optional-to-null.js"
import { EmojiSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { ChatInputCommandInteraction, bold } from "discord.js"
import z from "zod"

const CreateCurrencyParamsSchema = z.object({
    name: z.string().refine((name) => name.removeCustomEmojis().length > 0).overwrite((name) => name.replaceSpaces()),

    emoji: optionalOrNull(EmojiSchema).catch(null)
})

export async function createCurrencyFlow(interaction: ChatInputCommandInteraction) {
    const [error1, params] = validateCommandOptions(interaction.options, CreateCurrencyParamsSchema)
    if (error1) {
        return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
    }

    const [error2, currency] = await createCurrency(params)
    if (error2) {
        return await replyErrorMessage(interaction, error2.message)
    }

    const currencyName = bold(formattedEmojiableName(currency))
    await replySuccessMessage(interaction, t("userFlows.currencyCreate.messages.success", { currency: currencyName }))

}

