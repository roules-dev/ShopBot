import { nanoIdSchema } from "@/schemas/utils.js";
import z from "zod";

export const accountRawSchema = z.object({
    currencies: z.record(nanoIdSchema, z.number().min(0)),
    inventory: z.record(nanoIdSchema, z.number().min(0))
})