import { shopsDatabase, currenciesDatabase } from "@/core/database/init-databases.js"
import { dbGetShopId, dbCreateShop, dbRemoveShop, dbUpdateShop, dbUpdateShopCurrency, dbGetShopsWithCurrency, dbUpdateShopPosition, dbCreateDiscountCode, dbRemoveDiscountCode } from "@/features/shops/database/shops-database.js"
import { ShopOptions } from "@/features/shops/database/shops-types.js"
import { Exact } from "@/lib/types/constraints.js"
import { Snowflake } from "discord.js"


export function getShops() {
    return shopsDatabase.list()
}

export function getShopId(shopName: string) {
    return dbGetShopId(shopsDatabase, shopName)
}

export function createShop<T extends ShopOptions>(
    options: Exact<T, ShopOptions>,
    currencyId: Snowflake
) {
    return dbCreateShop(shopsDatabase, currenciesDatabase, options, currencyId)
}

export function removeShop(shopId: string) {
    return dbRemoveShop(shopsDatabase, shopId)
}

export function updateShop(shopId: string, options: Partial<ShopOptions>) {
    return dbUpdateShop(shopsDatabase, shopId, options)
}

export function updateShopCurrency(shopId: string, currencyId: string) {
    return dbUpdateShopCurrency(shopsDatabase, currenciesDatabase, shopId, currencyId)
}

export function getShopsWithCurrency(currencyId: string) {
    return dbGetShopsWithCurrency(shopsDatabase, currencyId)
}

export function updateShopPosition(shopId: string, index: number) {
    return dbUpdateShopPosition(shopsDatabase, shopId, index)
}

export function createDiscountCode(shopId: string, discountCode: string, discountAmount: number) {
    return dbCreateDiscountCode(shopsDatabase, shopId, discountCode, discountAmount)
}

export function removeDiscountCode(shopId: string, discountCode: string) {
    return dbRemoveDiscountCode(shopsDatabase, shopId, discountCode)
}