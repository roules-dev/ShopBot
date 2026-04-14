import { Product } from "@/features/shops/database/products.types.js"
import { Shop } from "@/features/shops/database/shops.types.js"
import { ErrorLike, Result } from "@/lib/error-handling.js"
import { DeepReadonly } from "@/lib/types/readonly.js"
import { GuildMember } from "discord.js"

// TODO : once implemented remove return type
export async function processPurchase(
    _member: GuildMember, 
    _shop: DeepReadonly<Shop>, 
    _product: DeepReadonly<Product>, 
    _quantity: number, 
    _discount: number
): Promise<Result<string, ErrorLike<"ProductNoLongerAvailable"> | ErrorLike<"NotAllowedToBuy"> | { name: "NotEnoughMoney", message: string, currencyName: string } | ErrorLike<"ApiError"> | ErrorLike<"DatabaseError">>> {
    
    throw new Error("Not implemented yet")

    // if (!isMemberAllowedToBuy(member, shop)) {
    //     return err({ name: "NotAllowedToBuy" })
    // }

    // const accountId = SnowflakeSchema.parse(member.id)

    // const [error, account] = await getOrCreateAccount(accountId)
    // if (error) return err(error)

    // const price = applyDiscount(product.price, quantity, discount)
    
    // const balanceAfterBuy = userBalanceAfterBuy(account, shop.currency, price)
    // if (balanceAfterBuy < 0) return err({ name: "NotEnoughMoney" })

    // const updatedStock = itemStockAfterBuy(product, quantity)
    // if (updatedStock != undefined && updatedStock < 0) return err({ name: "ProductNoLongerAvailable" })


    // const [error2] = await updateProduct(shop.id, product.id, { stock: updatedStock })
    // if (error2) return err(error2)

    // const [error3] = await setAccountCurrencyAmount(accountId, shop.currencyId, balanceAfterBuy)
    // if (error3) return err(error3)
    
    // if (product.action != undefined) {
    //     const [error4, actionMessage] = await executeActionProduct(product.action, member)
    //     if (error4) return err(error4)

    //     return ok(actionMessage)
    // }

    // const userProductAmount = account.inventory.get(product.id)?.amount || 0
    // const [error5] = await setAccountItemAmount(accountId, product, userProductAmount + quantity)

    // if (error5) return err(error5)

    // return ok("")
}

// function userBalanceAfterBuy(account: DeepReadonly<Account>, currency: Currency, price: number) {
//     const userCurrencyAmount = account.currencies.get(currency.id)?.amount || 0

//     return userCurrencyAmount - price
// }

// function itemStockAfterBuy(product: Product, quantity: number) {
//     if (product.stock == undefined || product.stock == null) {
//         return null
//     }

//     return product.stock - quantity
// }

// export function applyDiscount(price: Price, quantity: number, discount: number) {
//     const discountedPrice: Price = {}

//     for (const [currencyId, amount] of Object.entries(price)) {
//         discountedPrice[currencyId] = +((amount * (1 - discount)).toFixed(2))
//     }

//     return discountedPrice
// }

// function isMemberAllowedToBuy(member: GuildMember, shop: DeepReadonly<Shop>) {
//     if (shop.reservedTo == undefined) return true

//     return (member.roles.cache.has(shop.reservedTo) || member.permissions.has("Administrator"))
// }


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