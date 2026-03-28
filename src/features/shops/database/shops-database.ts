import shops from "@/../data/shops.json" with { type: "json" }
import { t } from "@/core/i18n/i18n.js"
import { ApiError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Shop, ShopOptions, ShopsDatabase } from "@/features/shops/database/shops-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Exact } from "@/lib/types/index.js"
import { Snowflake } from "discord.js"
import { nanoid } from "nanoid"

export const shopsDatabase = new ShopsDatabase(shops, "data/shops.json")

export function getShops(db = shopsDatabase): Map<string, Shop> {
    return db.data
}

export function getShopId(db = shopsDatabase, shopName: string): string | undefined {
    let shopId: string | undefined = undefined
    db.data.forEach(shop => {
        if (shop.name === shopName) shopId = shop.id
    })
    return shopId
}

export async function createShop<T extends ShopOptions>(
    shopsDb = shopsDatabase, 
    currenciesDb = undefined, 
    options: Exact<T, ShopOptions>,
    currencyId: Snowflake // will be removed
) {
    if (getShopId(shopsDb, options.name) != undefined) return err(new ApiError("ShopAlreadyExists"))
    
    const currency = getCurrencies(currenciesDb).get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    const newShopId = nanoid()    

    const newShop = {
        id: newShopId,
        ...options,
        currency: currency,
        discountCodes: {},
        products: new Map()
    }

    shopsDb.data.set(newShopId, newShop)

    
    const [error] = await shopsDb.save()
    if (error) return err(error)
    

    return ok(newShop)
}

export async function removeShop(db = shopsDatabase, shopId: string) {
    if (!db.data.has(shopId)) return err(new ApiError("ShopDoesNotExist"))

    db.data.delete(shopId)

    const [error] = await db.save()
    if (error) return err(error)

    return ok(true)
}


// works, but the updateShop function should only receive validated fields, 
// which means the special transformer here should not exist, 
// because the test should be done before calling the updateShop function, not inside it.
// We'll be able to do that once Zod validation is implemented, enabling us to work with 
// branded strings types (thus an Id will indeed be an Id and a value for reservedTo will be a snowflake or null or undefined).

const SHOP_FIELD_HANDLERS = {
    reservedTo: (value: string | undefined | null) => {
        if (value === undefined || value === null) return null
        return value === t("defaultComponents.unset") ? null : value
    }
}

export async function updateShop(db = shopsDatabase, shopId: string, options: Partial<ShopOptions>) {
    const shop = db.data.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    
    update(shop, options, SHOP_FIELD_HANDLERS)
        
    const [error] = await db.save()
    if (error) return err(error)
    
    return ok(shop)
}

export async function updateShopCurrency(shopsDb = shopsDatabase, currenciesDb = undefined, shopId: string, currencyId: string) {
    const shop = shopsDb.data.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    
    const currency = getCurrencies(currenciesDb).get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    shop.currency = currency

    
    const [error] = await shopsDb.save()
    if (error) return err(error)
    
    return ok(shop)
}

export function getShopsWithCurrency(db = shopsDatabase, currencyId: string) {
    const shopsWithCurrency: Map<string, Shop> = new Map()

    db.data.forEach((shop: Shop, shopId: string) => {
        if (shop.currency.id == currencyId) {
                shopsWithCurrency.set(shopId, shop)
        }
    })
    return shopsWithCurrency
}

export async function updateShopPosition(db = shopsDatabase, shopId: string, index: number) {
    if (!db.data.has(shopId)) return err(new ApiError("ShopDoesNotExist"))
    if (index < 0 || index > db.data.size - 1) return err(new ApiError("InvalidPosition"))

    const shopsArray = Array.from(db.data.entries())
    const shopIndex = shopsArray.findIndex(([id, ]) => id === shopId)

    if (shopIndex === -1) return err(new ApiError("ShopDoesNotExist"))

    const [item] = shopsArray.splice(shopIndex, 1)
    if (item === undefined) return err(new ApiError("ShopDoesNotExist"))

    shopsArray.splice(index, 0, item);

    db.data = new Map(shopsArray)

    const [error] = await db.save()
    if (error) return err(error)

    return ok(true)
}

export async function createDiscountCode(db = shopsDatabase, shopId: string, discountCode: string, discountAmount: number) {
    const shop = getShops(db).get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    shop.discountCodes[discountCode] = discountAmount

    
    const [error] = await db.save()
    if (error) return err(error)
    
    return ok(true)
}

export async function removeDiscountCode(db = shopsDatabase, shopId: string, discountCode: string) {
    const shop = getShops(db).get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    delete shop.discountCodes[discountCode]
    
    const [error] = await db.save()
    if (error) return err(error)
    
    return ok(true)
}