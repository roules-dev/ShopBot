import { tradesDatabase } from "@/core/database/init-databases.js";
import { NanoId } from "@/database/database.types.js";
import { dbCreateTrade, dbDeleteTrade, dbGetTrade } from "@/features/trade/database/trades.database.js";
import { TradePayload } from "@/features/trade/types/trade.types.js";

export function createTrade(trade: TradePayload) {
    return dbCreateTrade(tradesDatabase, trade)
}

export function getTrade(id: NanoId) {
    return dbGetTrade(tradesDatabase, id)
}

export function removeTrade(id: NanoId) {
    return dbDeleteTrade(tradesDatabase, id)
}