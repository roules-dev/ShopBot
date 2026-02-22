import shops from "@/../data/shops.json" with { type: "json" }
import { DatabaseError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Shop, ShopOptionsOptional, ShopsDatabase } from "@/features/shops/database/shops-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { t } from "@/lib/localization.js"
import { Snowflake } from 'discord.js'
import { nanoid } from 'nanoid'

export const shopsDatabase = new ShopsDatabase(shops, "data/shops.json")

export function getShops(): Map<string, Shop> {
    return shopsDatabase.data
}

export function getShopId(shopName: string): string | undefined {
    let shopId: string | undefined = undefined
    shopsDatabase.data.forEach(shop => {
        if (shop.name === shopName) shopId = shop.id
    })
    return shopId
}
export function getShopName(shopId: string | undefined): string | undefined {
    if (!shopId) return undefined
    const shop = getShops().get(shopId)
    if (!shop) return undefined

    return `${shop.emoji != '' ? `${shop.emoji} ` : ''}${shop.name}`
}

export async function createShop(shopName: string, description: string, currencyId: string, emoji: string, reservedTo?: Snowflake) {
    if (shopsDatabase.data.has(getShopId(shopName) || '')) return err(new DatabaseError("ShopAlreadyExists"))
    if (!getCurrencies().has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))

    const newShopId = nanoid()    

    shopsDatabase.data.set(newShopId, {
        id: newShopId,
        name: shopName,
        emoji,
        description,
        currency: getCurrencies().get(currencyId)!,
        discountCodes: {},
        reservedTo,
        products: new Map()
    })

    await shopsDatabase.save()

    return ok(shopsDatabase.data.get(newShopId)!)
}

export async function removeShop(shopId: string) {
    if (!shopsDatabase.data.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))

    shopsDatabase.data.delete(shopId)
    shopsDatabase.save()
    return ok(true)
}


// works, but the updateShop function should only receive validated fields, 
// which means the special transformer here should not exist, 
// because the test should be done before calling the updateShop function, not inside it.
// We'll be able to do that once Zod validation is implemented, enabling us to work with 
// branded strings types (thus an Id will indeed be an Id.).

const SHOP_FIELD_HANDLERS = {
    reservedTo: (shop: Shop, value: string) => {
        shop.reservedTo = value === t("defaultComponents.unset") ? undefined : value
    }
}

export async function updateShop(shopId: string, options: ShopOptionsOptional) {
    if (!shopsDatabase.data.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))
 
    const shop = shopsDatabase.data.get(shopId)!
    
    update(shop, options, SHOP_FIELD_HANDLERS)
        
    await shopsDatabase.save()
    return ok(shop)
}

export async function updateShopCurrency(shopId: string, currencyId: string) {
    if (!shopsDatabase.data.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))
    if (!getCurrencies().has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))

    const shop = shopsDatabase.data.get(shopId)!

    shop.currency = getCurrencies().get(currencyId)!

    await shopsDatabase.save()
    return ok(shop)
}

export function getShopsWithCurrency(currencyId: string) {
    const shopsWithCurrency: Map<string, Shop> = new Map()

    shopsDatabase.data.forEach((shop: Shop, shopId: string) => {
        if (shop.currency.id == currencyId) {
                shopsWithCurrency.set(shopId, shop)
        }
    })
    return shopsWithCurrency
}

export function updateShopPosition(shopId: string, index: number) {
    if (!shopsDatabase.data.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))
    if (index < 0 || index > shopsDatabase.data.size - 1) return err(new DatabaseError("InvalidPosition"))

    const shopsArray = Array.from(shopsDatabase.data.entries())
    const shopIndex = shopsArray.findIndex(([id, ]) => id === shopId)

    if (shopIndex === -1) return err(new DatabaseError("ShopDoesNotExist"))

    shopsArray.splice(index, 0, shopsArray.splice(shopIndex, 1)[0])

    shopsDatabase.data = new Map(shopsArray)
    shopsDatabase.save()
    return ok(true)
}

export async function createDiscountCode(shopId: string, discountCode: string, discountAmount: number) {
    if (!shopsDatabase.data.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))

    shopsDatabase.data.get(shopId)!.discountCodes[discountCode] = discountAmount
    await shopsDatabase.save()
    return ok(true)
}

export async function removeDiscountCode(shopId: string, discountCode: string) {
    if (!shopsDatabase.data.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))

    delete shopsDatabase.data.get(shopId)!.discountCodes[discountCode]
    await shopsDatabase.save()
    return ok(true)
}