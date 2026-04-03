import shops from "@/../data/shops.json" with { type: "json" }
import { t } from "@/core/i18n/i18n.js"
import { ApiError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Shop, ShopOptions, ShopsDatabase } from "@/features/shops/database/shops-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { DeepReadonly, Exact, TODO } from "@/lib/types/index.js"
import { Snowflake } from "discord.js"
import { nanoid } from "nanoid"

export const shopsDatabase = new ShopsDatabase(shops, "data/shops.json")

export function getShops(db = shopsDatabase) {
    return db.list()
}

export function getShopId(db = shopsDatabase, shopName: string) {
    let shopId: string | undefined = undefined
    db.list().forEach(shop => {
        if (shop.name === shopName) shopId = shop.id
    })
    return shopId
}

export async function createShop<T extends ShopOptions> (
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

    shopsDb.set(newShopId, newShop)

    
    const [error] = await shopsDb.save()
    if (error) return err(error)
    

    return ok(newShop)
}

export async function removeShop(db = shopsDatabase, shopId: string) {
    if (!db.get(shopId)) return err(new ApiError("ShopDoesNotExist"))

    db.delete(shopId)

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
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    
    update(shop, options, SHOP_FIELD_HANDLERS) // TODO change this
        
    const [error] = await db.save()
    if (error) return err(error)
    
    return ok(shop)
}

export async function updateShopCurrency(shopsDb = shopsDatabase, currenciesDb = undefined, shopId: string, currencyId: string) {
    const shop = shopsDb.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    
    const currency = getCurrencies(currenciesDb).get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    const [error1, updated] = await shopsDb.patch(shopId, { currency })
    if (error1) return err(error1)

    const [error2] = await shopsDb.save()
    if (error2) return err(error2)
    
    return ok(updated)
}

export function getShopsWithCurrency(db = shopsDatabase, currencyId: string) {
    const shopsWithCurrency: Map<string, DeepReadonly<Shop>> = new Map()

    db.list().forEach((shop, shopId) => {
        if (shop.currency.id == currencyId) {
                shopsWithCurrency.set(shopId, shop)
        }
    })
    return shopsWithCurrency
}

export async function updateShopPosition(db = shopsDatabase, shopId: string, index: number) {
    if (!db.get(shopId)) return err(new ApiError("ShopDoesNotExist"))
    if (index < 0 || index > db.size() - 1) return err(new ApiError("InvalidPosition"))

    const shopsArray = Array.from(db.list())
    const shopIndex = shopsArray.findIndex(([id, ]) => id === shopId)

    if (shopIndex === -1) return err(new ApiError("ShopDoesNotExist"))

    const [shop] = shopsArray.splice(shopIndex, 1)
    if (shop === undefined) return err(new ApiError("ShopDoesNotExist"))

    shopsArray.splice(index, 0, shop);

    // TODO: remove as TODO
    db.data = new Map(shopsArray) as TODO // Type level immutability prevents this operation, so this must be modified

    const [error] = await db.save()
    if (error) return err(error)

    return ok(true)
}

export async function createDiscountCode(db = shopsDatabase, shopId: string, discountCode: string, discountAmount: number) {
    const shop = db.get(shopId) 
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const [error1, _] = await db.update(shopId, draft => {
        draft.discountCodes[discountCode] = discountAmount
    })
    if (error1) return err(error1)

    const [error2] = await db.save()
    if (error2) return err(error2)
    
    return ok(true)
}

export async function removeDiscountCode(db = shopsDatabase, shopId: string, discountCode: string) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const [error1, _] = await db.update(shopId, draft => {
        delete draft.discountCodes[discountCode]
    })
    if (error1) return err(error1)

    const [error2] = await db.save()
    if (error2) return err(error2)
    
    return ok(true)
}