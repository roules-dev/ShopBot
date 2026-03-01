import { EmojiSchema } from "@/schemas/emojis.js"
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


export const ItemSchema = z.object({
    id: z.nanoid(),
    name: z.string(), // must add validation for the length
    emoji: EmojiSchema.optional(),
    description: z.string(),
    price: z.record(z.nanoid(), z.number().min(0)),
    stock: z.number().min(0).optional(),
    action: ItemActionSchema.optional()
})

export const ItemJSONSchema = ItemSchema.omit({ id: true })
