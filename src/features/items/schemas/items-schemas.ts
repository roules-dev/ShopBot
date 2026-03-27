import { EmojiSchema, NanoIdSchema, SnowflakeSchema } from "@/schemas/utils.js"
import z from "zod"

export const ITEM_NAME_MAX_LENGTH = 70
export const ITEM_DESCRIPTION_MAX_LENGTH = 300


export const ItemActionSchema = z.discriminatedUnion("type", [
    z.object({ 
        type: z.literal("give-role"),
        options: z.object({
            roleId: SnowflakeSchema
        })
    }),
    z.object({
        type: z.literal("give-currency"),
        options: z.object({
            currencyId: NanoIdSchema,
            amount: z.number().min(0)
        })
    })
])


export const ItemRawSchema = z.object({
    name: z.string()
        .min(1)
        .max(ITEM_NAME_MAX_LENGTH), 

    emoji: z.nullable(EmojiSchema),

    description: z.nullable(z.string()
        .min(1)
        .max(ITEM_DESCRIPTION_MAX_LENGTH)
    ),

    action: z.exactOptional(z.nullable(ItemActionSchema))
})
