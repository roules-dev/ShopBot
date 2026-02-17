import shops from "@/../data/shops.json" with { type: "json" };
import { DatabaseError } from "@/database/database-types.js";
import { getCurrencies } from "@/features/currencies/database/currencies-database.js";
import { Shop, ShopOptionsOptional, ShopsDatabase } from "@/features/shops/database/shops-types.js";
import { err, ok } from "@/lib/error-handling.js";
import { getLocale } from '@/lib/localisation.js';
import { Snowflake } from 'discord.js';
import { nanoid } from 'nanoid';

export const shopsDatabase = new ShopsDatabase(shops, "data/shops.json");

export function getShops(): Map<string, Shop> {
    return shopsDatabase.shops
}

export function getShopId(shopName: string): string | undefined {
    let shopId: string | undefined = undefined
    shopsDatabase.shops.forEach(shop => {
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
    if (shopsDatabase.shops.has(getShopId(shopName) || '')) return err(new DatabaseError("ShopAlreadyExists"))
    if (!getCurrencies().has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))

    const newShopId = nanoid()    

    shopsDatabase.shops.set(newShopId, {
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

    return ok(shopsDatabase.shops.get(newShopId)!)
}

export async function removeShop(shopId: string) {
    if (!shopsDatabase.shops.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))

    shopsDatabase.shops.delete(shopId)
    shopsDatabase.save()
    return ok(true)
}


export async function updateShop(shopId: string, options: ShopOptionsOptional) { // TODO: to be refactored (if elses are horrible)
    if (!shopsDatabase.shops.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))

    const { name, description, emoji, reservedTo } = options

    const shop = shopsDatabase.shops.get(shopId)!

    if (name) shop.name = name
    if (description) shop.description = description
    if (emoji) shop.emoji = emoji
    if (reservedTo) shop.reservedTo = reservedTo
    if (reservedTo === getLocale().defaultComponents.unset) shop.reservedTo = undefined

    await shopsDatabase.save()
    return ok(shop)
}

export async function updateShopCurrency(shopId: string, currencyId: string) {
    if (!shopsDatabase.shops.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))
    if (!getCurrencies().has(currencyId)) return err(new DatabaseError("CurrencyDoesNotExist"))

    const shop = shopsDatabase.shops.get(shopId)!

    shop.currency = getCurrencies().get(currencyId)!

    await shopsDatabase.save()
    return ok(shop)
}

export function getShopsWithCurrency(currencyId: string) {
    const shopsWithCurrency: Map<string, Shop> = new Map()

    shopsDatabase.shops.forEach((shop: Shop, shopId: string) => {
        if (shop.currency.id == currencyId) {
                shopsWithCurrency.set(shopId, shop)
        }
    })
    return shopsWithCurrency
}

export function updateShopPosition(shopId: string, index: number) {
    if (!shopsDatabase.shops.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))
    if (index < 0 || index > shopsDatabase.shops.size - 1) return err(new DatabaseError("InvalidPosition"))

    const shopsArray = Array.from(shopsDatabase.shops.entries())
    const shopIndex = shopsArray.findIndex(([id, ]) => id === shopId)

    if (shopIndex === -1) return err(new DatabaseError("ShopDoesNotExist"))

    shopsArray.splice(index, 0, shopsArray.splice(shopIndex, 1)[0]);

    shopsDatabase.shops = new Map(shopsArray)
    shopsDatabase.save()
    return ok(true)
}

export async function createDiscountCode(shopId: string, discountCode: string, discountAmount: number) {
    if (!shopsDatabase.shops.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))

    shopsDatabase.shops.get(shopId)!.discountCodes[discountCode] = discountAmount
    await shopsDatabase.save()
    return ok(true)
}

export async function removeDiscountCode(shopId: string, discountCode: string) {
    if (!shopsDatabase.shops.has(shopId)) return err(new DatabaseError("ShopDoesNotExist"))

    delete shopsDatabase.shops.get(shopId)!.discountCodes[discountCode]
    await shopsDatabase.save()
    return ok(true)
}
