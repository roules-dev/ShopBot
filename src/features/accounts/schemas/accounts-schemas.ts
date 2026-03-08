import z from "zod";

export const AccountRawSchema = z.object({
    currencies: z.record(z.nanoid(), z.number().min(0)),
    inventory: z.record(z.nanoid(), z.number().min(0))
})