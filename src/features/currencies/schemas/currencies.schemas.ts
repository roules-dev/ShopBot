import { EmojiSchema } from "@/schemas/utils.js";
import z from "zod";

export const CURRENCY_NAME_MAX_LENGTH = 40

export const CurrencyRawSchema = z.object({
    name: z.string()
        .min(1)
        .max(CURRENCY_NAME_MAX_LENGTH), 
    emoji: z.nullable(EmojiSchema)
})