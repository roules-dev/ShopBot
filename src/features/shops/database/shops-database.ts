import { t } from "@/core/i18n/i18n.js"
import { ApiError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { CurrenciesDatabase } from "@/features/currencies/database/currencies-types.js"
import { Shop, ShopOptions, ShopsDatabase } from "@/features/shops/database/shops-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { DeepReadonly, Exact } from "@/lib/types/index.js"
import { Snowflake } from "discord.js"
import { nanoid } from "nanoid"

export function dbGetShopId(db: ShopsDatabase, shopName: string) {
    let shopId: string | undefined = undefined
    db.list().forEach(shop => {
        if (shop.name === shopName) shopId = shop.id
    })
    return shopId
}

export async function dbCreateShop<T extends ShopOptions> (
    shopsDb: ShopsDatabase, 
    currenciesDb: CurrenciesDatabase, 
    options: Exact<T, ShopOptions>,
    currencyId: Snowflake // will be removed
) {
    if (dbGetShopId(shopsDb, options.name) != undefined) return err(new ApiError("ShopAlreadyExists"))
    
    const currency = currenciesDb.get(currencyId)
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

export async function dbRemoveShop(db: ShopsDatabase, shopId: string) {
    if (!db.get(shopId)) return err(new ApiError("ShopDoesNotExist"))

    db.delete(shopId)

    const [error] = await db.save()
    if (error) return err(error)

    return ok(true)
}


// works, but the updateShop function dbShould only receive validated fields, 
// which means the special transformer here should not exist, 
// because the test should be done before calling the updateShop function,db not inside it.
// We'll be able to do that once Zod validation is implemented, enabling us to work with 
// branded strings types (thus an Id will indeed be an Id and a value for reservedTo will be a snowflake or null or undefined).

const SHOP_FIELD_HANDLERS = {
    reservedTo: (value: string | undefined | null) => {
        if (value === undefined || value === null) return null
        return value === t("defaultComponents.unset") ? null : value
    }
}

export async function dbUpdateShop(db: ShopsDatabase, shopId: string, options: Partial<ShopOptions>) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    
    update(shop, options, SHOP_FIELD_HANDLERS) // TODO change this
        
    const [error] = await db.save()
    if (error) return err(error)
    
    return ok(shop)
}

export async function dbUpdateShopCurrency(shopsDb: ShopsDatabase, currenciesDb: CurrenciesDatabase, shopId: string, currencyId: string) {
    const shop = shopsDb.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    
    const currency = currenciesDb.get(currencyId)
    if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

    const [error1, updated] = await shopsDb.patch(shopId, { currency })
    if (error1) return err(error1)

    const [error2] = await shopsDb.save()
    if (error2) return err(error2)
    
    return ok(updated)
}

export function dbGetShopsWithCurrency(db: ShopsDatabase, currencyId: string) {
    const shopsWithCurrency: Map<string, DeepReadonly<Shop>> = new Map()

    db.list().forEach((shop, shopId) => {
        if (shop.currency.id == currencyId) {
                shopsWithCurrency.set(shopId, shop)
        }
    })
    return shopsWithCurrency
}

export async function dbUpdateShopPosition(db: ShopsDatabase, shopId: string, index: number) {
    return await db.reorder(shopId, index)
}

export async function dbCreateDiscountCode(db: ShopsDatabase, shopId: string, discountCode: string, discountAmount: number) {
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

export async function dbRemoveDiscountCode(db: ShopsDatabase, shopId: string, discountCode: string) {
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