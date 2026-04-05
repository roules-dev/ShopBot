import { shopsDatabase } from "@/core/database/init-databases.js"
import { dbGetProducts, dbAddProduct, dbRemoveProduct, dbUpdateProduct } from "@/features/shops/database/products-database.js"
import { ProductOptions } from "@/features/shops/database/products-types.js"


export function getProducts(shopId: string) {
    return dbGetProducts(shopsDatabase, shopId)
}

export function addProduct(shopId: string, options: ProductOptions) {
    return dbAddProduct(shopsDatabase, shopId, options)
}

export function removeProduct(shopId: string, productId: string) {
    return dbRemoveProduct(shopsDatabase, shopId, productId)
}

export function updateProduct(
    shopId: string,
    productId: string,
    options: Partial<ProductOptions>
) {
    return dbUpdateProduct(shopsDatabase, shopId, productId, options)
}
