import shops from '@/../data/shops.json' with { type: 'json' };
import { DatabaseError, DatabaseErrors } from "@/database/database-types.js";
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"; // external dependency, should be refactored
import { getLocale } from '@/utils/localisation.js';
import { Snowflake } from 'discord.js';
import { nanoid } from 'nanoid';
import { Product, ProductOptions, ProductOptionsOptional, Shop, ShopOptionsOptional, ShopsDatabase } from "./shops-types.js";

const shopsDatabase = new ShopsDatabase(shops, 'data/shops.json')

// #region Shops
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
    if (shopsDatabase.shops.has(getShopId(shopName) || '')) throw new DatabaseError(DatabaseErrors.ShopAlreadyExists)
    if (!getCurrencies().has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)

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

    return shopsDatabase.shops.get(newShopId)!
}

export async function removeShop(shopId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    shopsDatabase.shops.delete(shopId)
    shopsDatabase.save()
}


export async function updateShop(shopId: string, options: ShopOptionsOptional) { // TODO: to be refactored (if elses are horrible)
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)
    
    const { name, description, emoji, reservedTo } = options

    const shop = shopsDatabase.shops.get(shopId)!

    if (name) shop.name = name
    if (description) shop.description = description
    if (emoji) shop.emoji = emoji
    if (reservedTo) shop.reservedTo = reservedTo
    if (reservedTo === getLocale().defaultComponents.unset) shop.reservedTo = undefined

    await shopsDatabase.save()
}

export async function updateShopCurrency(shopId: string, currencyId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)
    if (!getCurrencies().has(currencyId)) throw new DatabaseError(DatabaseErrors.CurrencyDoesNotExist)
    
    const shop = shopsDatabase.shops.get(shopId)!

    shop.currency = getCurrencies().get(currencyId)!

    await shopsDatabase.save()
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
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)
    if (index < 0 || index > shopsDatabase.shops.size - 1) throw new DatabaseError(DatabaseErrors.InvalidPosition)

    const shopsArray = Array.from(shopsDatabase.shops.entries())
    const shopIndex = shopsArray.findIndex(([id, _shop]) => id === shopId)

    if (shopIndex === -1) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    shopsArray.splice(index, 0, shopsArray.splice(shopIndex, 1)[0]);
    
    shopsDatabase.shops = new Map(shopsArray)
    shopsDatabase.save()
}

export async function createDiscountCode(shopId: string, discountCode: string, discountAmount: number) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    shopsDatabase.shops.get(shopId)!.discountCodes[discountCode] = discountAmount
    await shopsDatabase.save()
}

export async function removeDiscountCode(shopId: string, discountCode: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    delete shopsDatabase.shops.get(shopId)!.discountCodes[discountCode]
    await shopsDatabase.save()
}
// #endregion

// #region Products (to be put in another file later, to be refactored)
export function getProducts(shopId: string): Map<string, Product> {
    if (!getShops().has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    return getShops().get(shopId)!.products
}

export async function addProduct(shopId: string, options: ProductOptions) {
    if (!getShops().has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    const id = nanoid()
    const product = Object.assign({ id, shopId }, options)

    getShops().get(shopId)!.products.set(id, product)
    await shopsDatabase.save()

    return getShops().get(shopId)!.products.get(id)!
}

export async function removeProduct(shopId: string, productId: string) {
    if (!getShops().has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)

    getShops().get(shopId)!.products.delete(productId)
    await shopsDatabase.save()
}
export async function updateProduct(shopId: string, productId: string, options: ProductOptionsOptional) { // TODO: to be refactored (if elses are horrible)
    if (!getShops().has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist)
    
    const { name, description, price, emoji, action, amount } = options
    const product = getShops().get(shopId)!.products.get(productId)

    if (!product) throw new DatabaseError(DatabaseErrors.ProductDoesNotExist)

    if (name) product.name = name
    if (description) product.description = description
    if (price != undefined) product.price = price
    if (emoji) product.emoji = emoji
    if (action) product.action = action
    if (amount != undefined) {
        if (amount == -1) product.amount = undefined
        else product.amount = amount
    }

    await shopsDatabase.save()
}

export function getProductName(shopId: string | undefined, productId: string | undefined): string | undefined {
    if (!shopId || !productId) return undefined

    const product = getShops().get(shopId)?.products.get(productId)
    if (!product) return undefined

    return `${product.emoji != '' ? `${product.emoji} ` : ''}${product.name}`    
}
// #endregion