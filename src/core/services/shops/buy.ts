import { addCurrenciesAmounts, missingCurrenciesFor, setAccountItemAmount } from "@/features/accounts/services/accounts.services.js"
import { Product } from "@/features/shops/database/products.types.js"
import { Shop } from "@/features/shops/database/shops.types.js"
import { err, ok } from "@/lib/error-handling.js"
import { BrandedSnowflake } from "@/schemas/utils.js"
import { GuildMember } from "discord.js"
import { getOrCreateAccount } from "../accounts/accounts.services.js"
import { updateProduct } from "./products.services.js"
import { applyQuantityAndDiscount } from "@/features/shops/services/price.js"
import { Identifiable } from "@/lib/types/core.js"
import { NanoId } from "@/database/database.types.js"

// TODO : once implemented remove return type
export async function processPurchase(
    member: GuildMember, 
    shop: Shop & Identifiable<NanoId>, 
    product: Product & Identifiable<NanoId>, 
    quantity: number, 
    discount: number
)//: Promise<Result<string, ErrorLike<"ProductNoLongerAvailable"> | ErrorLike<"NotAllowedToBuy"> | { name: "NotEnoughMoney", message: string, currencyName: string } | ErrorLike<"ApiError"> | ErrorLike<"DatabaseError">>> {
{
    if (!isMemberAllowedToBuy(member, shop)) {
        return err({ name: "NotAllowedToBuy" })
    }

    const accountId = member.id as BrandedSnowflake

    const [error, account] = await getOrCreateAccount(accountId)
    if (error) return err(error)

    const price = applyQuantityAndDiscount(product.price, quantity, discount)
    
    const [error1, missingCurrencies] = await missingCurrenciesFor(accountId, price)
    if (error1) return err(error1)
    if (missingCurrencies.length > 0) return err({ name: "NotEnoughMoney", currencies: missingCurrencies })

    if (product.stock == 0) return err({ name: "ProductNoLongerAvailable" })
    const updatedStock = itemStockAfterBuy(product, quantity)

    let actualQuantity = quantity
    if (product.stock !== null && product.stock !== undefined) {
        actualQuantity = Math.min(quantity, product.stock)
    }

    if (updatedStock != null) {
        const [error2] = await updateProduct(shop.id, product.id, { stock: updatedStock })
        if (error2) return err(error2)
    }

    const [error3] = await addCurrenciesAmounts(accountId, price, -1)
    if (error3) return err(error3)
    
    // if (product.action != undefined) {
    //     const [error4, actionMessage] = await executeActionProduct(product.action, member)
    //     if (error4) return err(error4)

    //     return ok(actionMessage)
    // }

    const userProductAmount = account.inventory[product.itemId] || 0
    const [error5] = await setAccountItemAmount(accountId, product.itemId, userProductAmount + actualQuantity)

    if (error5) return err(error5)

    return ok({ quantity: actualQuantity, message: "" })
}


function itemStockAfterBuy(product: Product, quantity: number) {
    if (product.stock == undefined || product.stock == null) {
        return null
    }

    return Math.max(product.stock - quantity, 0)
}



function isMemberAllowedToBuy(member: GuildMember, shop: Shop) {
    if (shop.reservedTo == undefined) return true

    return (member.roles.cache.has(shop.reservedTo) || member.permissions.has("Administrator"))
}


// async function executeActionProduct(action: ProductAction, member: GuildMember) {
//     let actionMessage = ""

//     const actionType = action.type

//     switch (actionType) {
//         case "give-role": {
//             const roleId = action.options.roleId

//             member.roles.add(roleId)

//             actionMessage = t(
//                 `userInterfaces.buy.actionProducts.giveRole.message`, 
//                 { role: bold(roleMention(roleId)) }
//             )
//             break
//         }
//         case "give-currency": {
//             const { currencyId, amount } = action.options

//             const [error, account] = await getOrCreateAccount(member.id)
//             if (error) return err(error)

//             const userCurrencyAmount = account.currencies.get(currencyId)?.amount || 0

//             const [error2, res] = await setAccountCurrencyAmount(member.id, currencyId as BrandedNanoId, userCurrencyAmount + amount)
//             if (error2) return err(error2)

//             actionMessage = t(
//                 `userInterfaces.buy.actionProducts.giveCurrency.message`, 
//                 { currency: bold(res.currency.name), amount: bold(`${amount}`) }
//             )

//             break
//         }
//         default:
//             assertNeverReached(actionType)
//     }

//     return ok(actionMessage)
// }