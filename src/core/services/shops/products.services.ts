import { shopsDatabase } from "@/core/database/init-databases.js"
import { NanoId } from "@/database/database-types.js"
import { dbGetProducts, dbAddProduct, dbRemoveProduct, dbUpdateProduct } from "@/features/shops/database/products-database.js"
import { ProductOptions } from "@/features/shops/database/products-types.js"


export function getProducts(shopId: NanoId) {
    return dbGetProducts(shopsDatabase, shopId)
}

export function addProduct(shopId: NanoId, options: ProductOptions) {
    return dbAddProduct(shopsDatabase, shopId, options)
}

export function removeProduct(shopId: NanoId, productId: NanoId) {
    return dbRemoveProduct(shopsDatabase, shopId, productId)
}

export function updateProduct(
    shopId: NanoId,
    productId: NanoId,
    options: Partial<ProductOptions>
) {
    return dbUpdateProduct(shopsDatabase, shopId, productId, options)
}
