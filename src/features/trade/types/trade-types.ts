import { NanoId } from "@/database/database.types.js"
import { BrandedSnowflake } from "@/schemas/utils.js"

export type TradePayload = {
    traderId: BrandedSnowflake
    tradePartnerId: BrandedSnowflake,
    trade: Trade
}

export type Trade = {
    traderItems: Record<NanoId, number>
    traderCurrencies: Record<NanoId, number>

    tradePartnerItems: Record<NanoId, number>
    tradePartnerCurrencies: Record<NanoId, number>
}


