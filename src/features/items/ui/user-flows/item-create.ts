import { t } from "@/core/i18n/i18n.js"
import { createItem } from "@/core/services/items/items.services.js"
import { replyErrorMessage, replySuccessMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
import { optionalOrNull } from "@/schemas/optional-to-null.js"
import { emojiSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { ChatInputCommandInteraction, bold } from "discord.js"
import z from "zod"

const createItemParamsSchema = z.object({
    name: z.string().refine((name) => name.removeCustomEmojis().length > 0).overwrite((name) => name.replaceSpaces()),

    emoji: optionalOrNull(emojiSchema).catch(null),

    description: optionalOrNull(
        z.string().overwrite((desc) => desc.replaceSpaces())
    ),
})

export async function createItemFlow(interaction: ChatInputCommandInteraction) {
    const [error1, params] = validateCommandOptions(interaction.options, createItemParamsSchema)
    if (error1) {
        return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
    }

    const [error2, item] = await createItem({ ...params, refCount: 0 })
    if (error2) {
        return await replyErrorMessage(interaction, error2.message)
    }

    const itemName = bold(formattedEmojiableName(item))
    await replySuccessMessage(interaction, t("userFlows.itemCreate.messages.success", { item: itemName }))

}

