import shops from "@/../data/shops.json" with { type: "json" }
import { ApiError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Shop, ShopOptions, ShopsDatabase } from "@/features/shops/database/shops-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { t } from "@/lib/localization.js"
import { Snowflake } from "discord.js"
import { nanoid } from "nanoid"

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

export async function createShop(shopName: string, description: string, currencyId: string, emoji: string, reservedTo?: Snowflake) {
    if (getShopId(shopName) != undefined) return err(new ApiError("ShopAlreadyExists"))
    
    const currency = getCurrencies().get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    const newShopId = nanoid()    

    const newShop = {
        id: newShopId,
        name: shopName,
        emoji,
        description,
        currency: currency,
        discountCodes: {},
        reservedTo,
        products: new Map()
    }

    shopsDatabase.data.set(newShopId, newShop)

    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    

    return ok(newShop)
}

export async function removeShop(shopId: string) {
    if (!shopsDatabase.data.has(shopId)) return err(new ApiError("ShopDoesNotExist"))

    shopsDatabase.data.delete(shopId)

    const [error] = await shopsDatabase.save()
    if (error) return err(error)

    return ok(true)
}


// works, but the updateShop function should only receive validated fields, 
// which means the special transformer here should not exist, 
// because the test should be done before calling the updateShop function, not inside it.
// We'll be able to do that once Zod validation is implemented, enabling us to work with 
// branded strings types (thus an Id will indeed be an Id and a value for reservedTo will be a snowflake or null or undefined).

const SHOP_FIELD_HANDLERS = {
    reservedTo: (value: string | undefined) => {
        return value === t("defaultComponents.unset") ? undefined : value
    }
}

export async function updateShop(shopId: string, options: Partial<ShopOptions>) {
    const shop = shopsDatabase.data.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    
    update(shop, options, SHOP_FIELD_HANDLERS)
        
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    
    return ok(shop)
}

export async function updateShopCurrency(shopId: string, currencyId: string) {
    const shop = shopsDatabase.data.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    
    const currency = getCurrencies().get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    shop.currency = currency

    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    
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

export async function updateShopPosition(shopId: string, index: number) {
    if (!shopsDatabase.data.has(shopId)) return err(new ApiError("ShopDoesNotExist"))
    if (index < 0 || index > shopsDatabase.data.size - 1) return err(new ApiError("InvalidPosition"))

    const shopsArray = Array.from(shopsDatabase.data.entries())
    const shopIndex = shopsArray.findIndex(([id, ]) => id === shopId)

    if (shopIndex === -1) return err(new ApiError("ShopDoesNotExist"))

    shopsArray.splice(index, 0, shopsArray.splice(shopIndex, 1)[0])

    shopsDatabase.data = new Map(shopsArray)

    const [error] = await shopsDatabase.save()
    if (error) return err(error)

    return ok(true)
}

export async function createDiscountCode(shopId: string, discountCode: string, discountAmount: number) {
    const shop = getShops().get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    shop.discountCodes[discountCode] = discountAmount

    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    
    return ok(true)
}

export async function removeDiscountCode(shopId: string, discountCode: string) {
    const shop = getShops().get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    delete shop.discountCodes[discountCode]
    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    
    return ok(true)
}