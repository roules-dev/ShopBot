import { TradesDatabase } from "@/core/database/database.types.js";
import { ApiError, NanoId } from "@/database/database.types.js";
import { err, ok } from "@/lib/error-handling.js";
import { nanoid } from "nanoid";
import { TradePayload } from "../types/trade.types.js";

export async function dbCreateTrade(db: TradesDatabase, trade: TradePayload) {
    const id = nanoid<NanoId>()
    const [error, _] = await db.set(id, trade)
    
    if (error) return err(error)
    
    return ok(id)
}

export async function dbGetTrade(db: TradesDatabase, id: NanoId) {
    const trade = db.get(id)
    if (!trade) return err(new ApiError("TradeDoesNotExist"))
    
    return ok(trade)
}

export async function dbDeleteTrade(db: TradesDatabase, id: NanoId) {
    const [error] = await db.delete(id)
    if (error) return err(error)
    
    return ok(true)
}