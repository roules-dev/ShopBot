import { HYDRATOR } from "@/core/database/init-databases.js";
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
            name: "You give", 
            value: context === "trade-build" ? traderGivesString : traderReceivesString, 
            inline: true 
        },
        { 
            name: "You receive", 
            value: context === "trade-build" ? traderReceivesString : traderGivesString, 
            inline: true
        }
    ]

}

export function getTradeEmbed(tradePayload: TradePayload, context: "trade-build" | "trade-offer") {
    const { traderId, tradePartnerId, trade } = tradePayload  
    
    const description = 
        context === "trade-build" ? `Build your trade offer with ${userMention(tradePartnerId)}` 
            : `${userMention(traderId)} has sent you a trade offer`

    const tradeEmbed = new EmbedBuilder()
        .setTitle("New trade offer")
        .setDescription(description)    
        .setColor(Colors.Purple)


    tradeEmbed.addFields(getTradeEmbedFields(trade, context))

    return tradeEmbed
}