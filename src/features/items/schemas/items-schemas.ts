import { EmojiSchema } from "@/schemas/utils.js"
import z from "zod"

export const ItemActionSchema = z.discriminatedUnion("type", [
    z.object({ 
        type: z.literal("give-role"),
        options: z.object({
            roleId: z.string() // may be replaced with snowflake validation
        })
    }),
    z.object({
        type: z.literal("give-currency"),
        options: z.object({
            currencyId: z.nanoid(),
            amount: z.number()
        })
    })
])


export const ItemRawSchema = z.object({
    name: z.string(), // must add validation for the length
    emoji: EmojiSchema.optional(),
    description: z.string(),
    action: ItemActionSchema.optional()
})

