import { t } from "@/core/i18n/i18n.js"
import { createShop } from "@/core/services/shops/shops.services.js"
import { replyErrorMessage, replySuccessMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
import { optionalOrNull } from "@/schemas/optional-to-null.js"
import { EmojiSchema, SnowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { ChatInputCommandInteraction, bold } from "discord.js"
import z from "zod"

const ShopCreateParamsSchema = z.object({
    name: z.string().refine((name) => name.removeCustomEmojis().length > 0).overwrite((name) => name.replaceSpaces()),

    emoji: optionalOrNull(EmojiSchema).catch(null),

    description: optionalOrNull(
        z.string().overwrite((desc) => desc.replaceSpaces())
    ),
    
    reserved_to_role: optionalOrNull(SnowflakeSchema),
}).transform(options => {
    const { reserved_to_role: reservedTo, ...otherOptions } = options
    return { ...otherOptions, reservedTo }
})



export async function createShopFlow(interaction: ChatInputCommandInteraction) {
    const [error1, params] = validateCommandOptions(interaction.options, ShopCreateParamsSchema)
    if (error1) {
        return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
    }

    if (!interaction.guild) {
        return await replyErrorMessage(interaction)
    }
    if (params.reservedTo == interaction.guild.id) {
        // Role ID = Guild ID means the role is @everyone, thus the shop is not reserved
        params.reservedTo = null
    }

    const [error2, shop] = await createShop(params)
    if (error2) {
        return await replyErrorMessage(interaction, error2.message)
    }

    const shopName = bold(formattedEmojiableName(shop))
    await replySuccessMessage(interaction, t("userFlows.shopCreate.messages.success", { shop: shopName }))
}