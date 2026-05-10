import { shopsDatabase,  } from "@/core/database/init-databases.js"
import { NanoId } from "@/database/database.types.js"
import { dbCreateShop, dbRemoveShop, dbUpdateShop, dbUpdateShopPosition, dbCreateDiscountCode, dbRemoveDiscountCode } from "@/features/shops/database/shops.database.js"
import { ShopOptions } from "@/features/shops/database/shops.types.js"
import { Exact } from "@/lib/types/constraints.js"


export function getShops() {
    console.log("getShops has been called")
    return shopsDatabase.list()
}

export function createShop<T extends ShopOptions>(
    options: Exact<T, ShopOptions>
) {
    return dbCreateShop(shopsDatabase, options)
}

export function removeShop(shopId: NanoId) {
    return dbRemoveShop(shopsDatabase, shopId)
}

export function updateShop(shopId: NanoId, options: Partial<ShopOptions>) {
    return dbUpdateShop(shopsDatabase, shopId, options)
}

export function updateShopPosition(shopId: NanoId, index: number) {
    return dbUpdateShopPosition(shopsDatabase, shopId, index)
}

export function createDiscountCode(shopId: NanoId, discountCode: string, discountAmount: number) {
    return dbCreateDiscountCode(shopsDatabase, shopId, discountCode, discountAmount)
}

export function removeDiscountCode(shopId: NanoId, discountCode: string) {
    return dbRemoveDiscountCode(shopsDatabase, shopId, discountCode)
}