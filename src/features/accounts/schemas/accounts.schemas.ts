import { NanoIdSchema } from "@/schemas/utils.js";
import z from "zod";

export const AccountRawSchema = z.object({
    currencies: z.record(NanoIdSchema, z.number().min(0)),
    inventory: z.record(NanoIdSchema, z.number().min(0))
})