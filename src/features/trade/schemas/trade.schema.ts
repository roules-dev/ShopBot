import { nanoIdSchema, snowflakeSchema } from "@/schemas/utils.js";
import z from "zod";


export const tradeSchema = z.object({
    traderItems: z.record(nanoIdSchema, z.number().min(0)),
    traderCurrencies: z.record(nanoIdSchema, z.number().min(0)),

    tradePartnerItems: z.record(nanoIdSchema, z.number().min(0)),
    tradePartnerCurrencies: z.record(nanoIdSchema, z.number().min(0)),
})


export const tradePayloadSchema = z.object({
    traderId: snowflakeSchema,
    tradePartnerId: snowflakeSchema,

    trade: tradeSchema
})