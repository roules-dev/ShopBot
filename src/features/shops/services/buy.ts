import { getOrCreateAccount } from "@/features/accounts/database/accounts-database.js"
import { Account } from "@/features/accounts/database/accounts-type.js"
import { setAccountCurrencyAmount, setAccountItemAmount } from "@/features/accounts/services/accounts-services.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { assertNeverReached, err, ok } from "@/lib/error-handling.js"
import { t } from "@/core/i18n/i18n.js"
import { bold, GuildMember, roleMention } from "discord.js"
import { updateProduct } from "../database/products-database.js"
import { Product, ProductAction } from "../database/products-types.js"
import { Shop } from "../database/shops-types.js"


export async function processPurchase(member: GuildMember, shop: Shop, product: Product, quantity: number, discount: number) {
    if (!isMemberAllowedToBuy(member, shop)) {
        return err({ name: "NotAllowedToBuy" })
    }
    const [error, account] = await getOrCreateAccount(undefined, member.id)
    if (error) return err(error)

    const price = applyDiscount(product.price * quantity, discount)
    
    const balanceAfterBuy = userBalanceAfterBuy(account, shop.currency, price)
    if (balanceAfterBuy < 0) return err({ name: "NotEnoughMoney" })

    const updatedStock = itemStockAfterBuy(product, quantity)
    if (updatedStock != undefined && updatedStock < 0) return err({ name: "ProductNoLongerAvailable" })


    const [error2] = await updateProduct(undefined, shop.id, product.id, { stock: updatedStock })
    if (error2) return err(error2)

    const [error3] = await setAccountCurrencyAmount(member.id, shop.currency.id, balanceAfterBuy)
    if (error3) return err(error3)
    
    if (product.action != undefined) {
        const [error4, actionMessage] = await executeActionProduct(product.action, member)
        if (error4) return err(error4)

        return ok(actionMessage)
    }

    const userProductAmount = account.inventory.get(product.id)?.amount || 0
    const [error5] = await setAccountItemAmount(member.id, product, userProductAmount + quantity)

    if (error5) return err(error5)

    return ok("")
}

function userBalanceAfterBuy(account: Account, currency: Currency, price: number) {
    const userCurrencyAmount = account.currencies.get(currency.id)?.amount || 0

    return userCurrencyAmount - price
}

function itemStockAfterBuy(product: Product, quantity: number) {
    if (product.stock == undefined) {
        return undefined
    }

    return product.stock - quantity
}

export function applyDiscount(price: number, discount: number) {
    return Math.round(price * (1 - discount / 100))
}

function isMemberAllowedToBuy(member: GuildMember, shop: Shop) {
    if (shop.reservedTo == undefined) return true

    return (member.roles.cache.has(shop.reservedTo) || member.permissions.has("Administrator"))
}


async function executeActionProduct(action: ProductAction, member: GuildMember) {
    let actionMessage = ""

    const actionType = action.type

    switch (actionType) {
        case "give-role": {
            const roleId = action.options.roleId

            member.roles.add(roleId)

            actionMessage = t(
                `userInterfaces.buy.actionProducts.giveRole.message`, 
                { role: bold(roleMention(roleId)) }
            )
            break
        }
        case "give-currency": {
            const { currencyId, amount } = action.options

            const [error, account] = await getOrCreateAccount(undefined, member.id)
            if (error) return err(error)

            const userCurrencyAmount = account.currencies.get(currencyId)?.amount || 0

            const [error2, res] = await setAccountCurrencyAmount(member.id, currencyId, userCurrencyAmount + amount)
            if (error2) return err(error2)

            actionMessage = t(
                `userInterfaces.buy.actionProducts.giveCurrency.message`, 
                { currency: bold(res.currency.name), amount: bold(`${amount}`) }
            )

            break
        }
        default:
            assertNeverReached(actionType)
    }

    return ok(actionMessage)
}