import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js";
import { getTrade, removeTrade } from "@/core/services/trades/trades.services.js";
import { NanoId } from "@/database/database.types.js";
import { setAccountCurrencyAmount, setAccountItemAmount } from "@/features/accounts/services/accounts.services.js";
import { replyErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js";
import { sendDM } from "@/lib/discord/dm.js";
import { err, ok } from "@/lib/error-handling.js";
import { objectEntries } from "@/utils/objects.js";
import { ButtonInteraction, userMention } from "discord.js";
import { TradePayload } from "../types/trade.types.js";


// TODO: Locales missing

export function processTrade(interaction: ButtonInteraction, id: NanoId, status: "accept" | "deny") {
    if (status === "deny") return denyTrade(interaction, id)

    return acceptTrade(interaction, id)
}


async function denyTrade(interaction: ButtonInteraction, id: NanoId) {
    const [err1, trade] = await getTrade(id)
    if (err1) return replyErrorMessage(interaction, err1.message)
    const [err2, _] = await removeTrade(id)
    if (err2) return replyErrorMessage(interaction, err2.message)

    updateAsSuccessMessage(interaction, "Successfully denied trade")

    sendDM(
        await interaction.client.users.fetch(trade.traderId), 
        `${userMention(trade.tradePartnerId)} has denied your trade offer`
    )
}


async function acceptTrade(interaction: ButtonInteraction, id: NanoId) {
    const [err1, trade] = await getTrade(id)
    if (err1) return replyErrorMessage(interaction, err1.message)


    const [err2, valid] = await isTradeValid(trade)
    if (err2) return replyErrorMessage(interaction, err2.message)

    const trader = await interaction.client.users.fetch(trade.traderId)
    
    if (!valid) {
        replyErrorMessage(interaction, `You or ${userMention(trade.traderId)} do not have enough resources to accept this trade offer`)
        return
    }

    const [err3] = await executeTrade(trade)
    if (err3) return replyErrorMessage(interaction, err3.message)

    const [err4, _] = await removeTrade(id)
    if (err4) return replyErrorMessage(interaction, err4.message)

    updateAsSuccessMessage(interaction, "Successfully accepted trade, your account and inventory have been updated")

    sendDM(
        trader, 
        `${userMention(trade.tradePartnerId)} has accepted your trade offer, your account and inventory have been updated`
    )
}


export async function isTradeValid(payload: TradePayload) {
    const [err1, traderAccount] = await getOrCreateAccount(payload.traderId)
    if (err1) return err(err1)

    const [err2, tradePartnerAccount] = await getOrCreateAccount(payload.tradePartnerId)
    if (err2) return err(err2)

    const trade = payload.trade

    for (const [currencyId, amount] of objectEntries(trade.traderCurrencies)) {
        const currencyAmount = traderAccount.currencies[currencyId]
        if (!currencyAmount || currencyAmount < amount) return ok(false)
    }
    for (const [itemId, amount] of objectEntries(trade.traderItems)) {
        const itemAmount = traderAccount.inventory[itemId]
        if (!itemAmount || itemAmount < amount) return ok(false)
    }

    for (const [currencyId, amount] of objectEntries(trade.tradePartnerCurrencies)) {
        const currencyAmount = tradePartnerAccount.currencies[currencyId]
        if (!currencyAmount || currencyAmount < amount) return ok(false)
    }
    for (const [itemId, amount] of objectEntries(trade.tradePartnerItems)) {
        const itemAmount = tradePartnerAccount.inventory[itemId]
        if (!itemAmount || itemAmount < amount) return ok(false)
    }

    return ok(true)
}


// TODO : some kind of security rollback should be implemented here, in case of error during trade execution -> revert changes (requires db transaction to be implemented)
export async function executeTrade(payload: TradePayload) {
    const [err1, traderAccount] = await getOrCreateAccount(payload.traderId)
    if (err1) return err(err1)

    const [err2, tradePartnerAccount] = await getOrCreateAccount(payload.tradePartnerId)
    if (err2) return err(err2)

    const trade = payload.trade

    const errors: Error[] = []

    for (const [currencyId, amount] of objectEntries(trade.traderCurrencies)) {
        const partnerCurrencyAmount = tradePartnerAccount.currencies[currencyId] ?? 0
        const [err1] = await setAccountCurrencyAmount(payload.tradePartnerId, currencyId, partnerCurrencyAmount + amount)
        if (err1) errors.push(err1)

        const traderCurrencyAmount = traderAccount.currencies[currencyId] ?? 0
        const [err2] = await setAccountCurrencyAmount(payload.traderId, currencyId, traderCurrencyAmount - amount)
        if (err2) errors.push(err2)
    }

    for (const [itemId, amount] of objectEntries(trade.traderItems)) {
        const partnerItemAmount = tradePartnerAccount.inventory[itemId] ?? 0
        const [err1] = await setAccountItemAmount(payload.tradePartnerId, itemId, partnerItemAmount + amount)
        if (err1) errors.push(err1)

        const traderItemAmount = traderAccount.inventory[itemId] ?? 0
        const [err2] = await setAccountItemAmount(payload.traderId, itemId, traderItemAmount - amount)
        if (err2) errors.push(err2)
    }

    for (const [currencyId, amount] of objectEntries(trade.tradePartnerCurrencies)) {
        const partnerCurrencyAmount = tradePartnerAccount.currencies[currencyId] ?? 0
        const [err1] = await setAccountCurrencyAmount(payload.tradePartnerId, currencyId, partnerCurrencyAmount - amount)
        if (err1) errors.push(err1)

        const traderCurrencyAmount = traderAccount.currencies[currencyId] ?? 0
        const [err2] = await setAccountCurrencyAmount(payload.traderId, currencyId, traderCurrencyAmount + amount)
        if (err2) errors.push(err2)
    }

    for (const [itemId, amount] of objectEntries(trade.tradePartnerItems)) {
        const partnerItemAmount = tradePartnerAccount.inventory[itemId] ?? 0
        const [err1] = await setAccountItemAmount(payload.tradePartnerId, itemId, partnerItemAmount - amount)
        if (err1) errors.push(err1)

        const traderItemAmount = traderAccount.inventory[itemId] ?? 0
        const [err2] = await setAccountItemAmount(payload.traderId, itemId, traderItemAmount + amount)
        if (err2) errors.push(err2)
    }

    return !errors[0] ? ok(true) : err(errors[0])
}