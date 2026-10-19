import z from "zod"
import { tradePayloadSchema, tradeSchema } from "../schemas/trade.schema.js"

export type TradePayload = z.infer<typeof tradePayloadSchema>

export type Trade = z.infer<typeof tradeSchema>

