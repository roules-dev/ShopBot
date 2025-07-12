import shops from '../../../data/shops.json';
import { getCurrencies } from "../currencies/currencies-database";
import { save } from "../database-handler";
import { DatabaseError } from "../database-types";
import { Product, ProductOptions, ProductOptionsOptional, Shop, EditShopOptionsOptional, ShopsDatabase } from "./shops-types";
import { Snowflake } from 'discord.js';
import { NO_VALUE } from '../../user-flows/shops-flows';
import { nanoid } from 'nanoid';

export const shopsDatabase = new ShopsDatabase(shops, 'data/shops.json')

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
    if (shopsDatabase.shops.has(getShopId(shopName) || '')) throw new DatabaseError("ShopAlreadyExists")
    if (!getCurrencies().has(currencyId)) throw new DatabaseError("CurrencyDoesNotExist")

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

    await save(shopsDatabase)

    return shopsDatabase.shops.get(newShopId)!
}

export async function removeShop(shopId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError("ShopDoesNotExist")

    shopsDatabase.shops.delete(shopId)
    save(shopsDatabase)
}


export async function updateShop(shopId: string, options: EditShopOptionsOptional) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError("ShopDoesNotExist")
    
    const { name, description, emoji, reservedTo } = options

    const shop = shopsDatabase.shops.get(shopId)!

    if (name) shop.name = name
    if (description) shop.description = description
    if (emoji) shop.emoji = emoji
    if (reservedTo) shop.reservedTo = reservedTo
    if (reservedTo === NO_VALUE) shop.reservedTo = undefined

    await save(shopsDatabase)
}

export async function updateShopCurrency(shopId: string, currencyId: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError("ShopDoesNotExist")
    if (!getCurrencies().has(currencyId)) throw new DatabaseError("CurrencyDoesNotExist")
    
    const shop = shopsDatabase.shops.get(shopId)!

    shop.currency = getCurrencies().get(currencyId)!

    await save(shopsDatabase)
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
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError("ShopDoesNotExist")
    if (index < 0 || index > shopsDatabase.shops.size - 1) throw new DatabaseError("InvalidPosition")

    const shopsArray = Array.from(shopsDatabase.shops.entries())
    const shopIndex = shopsArray.findIndex(([id, _shop]) => id === shopId)

    if (shopIndex === -1) throw new DatabaseError("ShopDoesNotExist")

    shopsArray.splice(index, 0, shopsArray.splice(shopIndex, 1)[0]);
    
    shopsDatabase.shops = new Map(shopsArray)
    save(shopsDatabase)
}

export async function createDiscountCode(shopId: string, discountCode: string, discountAmount: number) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError("ShopDoesNotExist")

    shopsDatabase.shops.get(shopId)!.discountCodes[discountCode] = discountAmount
    await save(shopsDatabase)
}

export async function removeDiscountCode(shopId: string, discountCode: string) {
    if (!shopsDatabase.shops.has(shopId)) throw new DatabaseError("ShopDoesNotExist")

    delete shopsDatabase.shops.get(shopId)!.discountCodes[discountCode]
    await save(shopsDatabase)
}

export function getShopsJSON() {
    return shopsDatabase.toJSON()
}

// #endregion

// #region Products
export function getProducts(shopId: string): Map<string, Product> {
    if (!getShops().has(shopId)) throw new DatabaseError("ShopDoesNotExist")

    return getShops().get(shopId)!.products
}

export async function addProduct(shopId: string, options: ProductOptions) {
    if (!getShops().has(shopId)) throw new DatabaseError("ShopDoesNotExist")

    const id = nanoid()
    const product = Object.assign({ id, shopId }, options)

    getShops().get(shopId)!.products.set(id, product)
    await save(shopsDatabase)

    return getShops().get(shopId)!.products.get(id)!
}

export async function removeProduct(shopId: string, productId: string) {
    if (!getShops().has(shopId)) throw new DatabaseError("ShopDoesNotExist")

    getShops().get(shopId)!.products.delete(productId)
    await save(shopsDatabase)
}
export async function updateProduct(shopId: string, productId: string, options: ProductOptionsOptional) {
    if (!getShops().has(shopId)) throw new DatabaseError("ShopDoesNotExist")
    
    const { name, description, price, emoji, action, amount } = options
    const product = getShops().get(shopId)!.products.get(productId)

    if (!product) throw new DatabaseError("ProductDoesNotExist")

    if (name) product.name = name
    if (description) product.description = description
    if (price != undefined) product.price = price
    if (emoji) product.emoji = emoji
    if (action) product.action = action
    if (amount != undefined) {
        if (amount == -1) product.amount = undefined
        else product.amount = amount
    }

    await save(shopsDatabase)
}

export function getProductName(shopId: string | undefined, productId: string | undefined): string | undefined {
    if (!shopId || !productId) return undefined

    const product = getShops().get(shopId)?.products.get(productId)
    if (!product) return undefined

    return `${product.emoji != '' ? `${product.emoji} ` : ''}${product.name}`    
}
// #endregion