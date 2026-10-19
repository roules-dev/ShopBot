import { HYDRATOR } from "@/core/database/init-databases.js";
import { t } from "@/core/i18n/i18n.js";
import { formattedEmojiableName } from "@/utils/formatting.js";
import { bold, Colors, EmbedBuilder, italic, userMention } from "discord.js";
import { Trade, TradePayload } from "../../types/trade.types.js";

export function getTradeEmbedFields(trade: Trade, context: "trade-build" | "trade-offer") {
    
    const hydratedTrade = HYDRATOR.hydrateTrade(trade)
    if (!hydratedTrade) return []

    const traderGives = Array.from([...hydratedTrade.traderItems.values(), ...hydratedTrade.traderCurrencies.values()])
    const traderGivesString = traderGives.map(balance => `- ${balance.amount} ${bold(formattedEmojiableName(balance.resource))}`).join("\n") || italic("Nothing")

    const traderReceives = Array.from([...hydratedTrade.tradePartnerItems.values(), ...hydratedTrade.tradePartnerCurrencies.values()])
    const traderReceivesString = traderReceives.map(balance => `- ${balance.amount} ${bold(formattedEmojiableName(balance.resource))}`).join("\n") || italic("Nothing")


    return [
        { 
            name: t("userInterfaces.trade.messages.youGive"), 
            value: context === "trade-build" ? traderGivesString : traderReceivesString, 
            inline: true 
        },
        { 
            name: t("userInterfaces.trade.messages.youReceive"), 
            value: context === "trade-build" ? traderReceivesString : traderGivesString, 
            inline: true
        }
    ]

}

export function getTradeEmbed(tradePayload: TradePayload, context: "trade-build" | "trade-offer") {
    const { traderId, tradePartnerId, trade } = tradePayload  
    
    const description = 
        context === "trade-build" ? t("userInterfaces.trade.messages.buildTrade", { user: userMention(tradePartnerId) })
            : t("userInterfaces.trade.messages.hasSentTrade", { user: userMention(traderId) })

    const tradeEmbed = new EmbedBuilder()
        .setTitle(t("userInterfaces.trade.messages.newTrade"))
        .setDescription(description)    
        .setColor(Colors.Purple)


    tradeEmbed.addFields(getTradeEmbedFields(trade, context))

    return tradeEmbed
}