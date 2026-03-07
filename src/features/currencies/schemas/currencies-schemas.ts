import z from "zod";

export const CurrencyRawSchema = z.object({
    name: z.string(), // must add validation for the length
    emoji: z.string().optional()
})