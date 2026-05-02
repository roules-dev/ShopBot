import { currenciesDatabase, itemsDatabase, shopsDatabase } from "@/core/database/init-databases.js"
import { ApiError, NanoId } from "@/database/database.types.js"
import { dbGetProducts, dbAddProduct, dbRemoveProduct, dbUpdateProduct } from "@/features/shops/database/products.database.js"
import { Product } from "@/features/shops/database/products.types.js"
import { err } from "@/lib/error-handling.js"
import { objectEntries } from "@/utils/objects.js"


export function getProducts(shopId: NanoId) {
    return dbGetProducts(shopsDatabase, shopId)
}

export async function addProduct(shopId: NanoId, options: Product) {
    const result = await dbAddProduct(shopsDatabase, shopId, options)

    if (result[0] === null) {
        await updateRefCounts(options)
    }
    
    return result
}

export async function removeProduct(shopId: NanoId, productId: NanoId) {
    const result = await dbRemoveProduct(shopsDatabase, shopId, productId)
 
    if (result[0] === null) {
        await updateRefCounts(shopsDatabase.get(shopId)!.products[productId]!, -1)
    }
 
    return result
}

export async function updateProduct(
    shopId: NanoId,
    productId: NanoId,
    options: Partial<Product>
) {
    const shop = shopsDatabase.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))
    const existingProduct = shop.products[productId]
    if (!existingProduct) return err(new ApiError("ProductDoesNotExist"))

    const result = await dbUpdateProduct(shopsDatabase, shopId, productId, options)

    if (result[0] === null) {
        updateRefCounts(existingProduct, -1)
        updateRefCounts({ ...existingProduct, ...options }, 1)
    }

    return result
}


async function updateRefCounts(product: Product, increment = 1) {
    const currentItemRefCount = itemsDatabase.get(product.itemId)!.refCount
    await itemsDatabase.patch(product.itemId, { refCount: currentItemRefCount + increment })


    for (const [currencyId, _] of objectEntries(product.price)) {
        const currentCurrencyRefCount = currenciesDatabase.get(currencyId)!.refCount
        await currenciesDatabase.patch(currencyId, { refCount: currentCurrencyRefCount + increment })
    }

    if (product.action && product.action.kind === "give-currency") {
        const { currencyId } = product.action.options
        const currentCurrencyRefCount = currenciesDatabase.get(currencyId)!.refCount
        await currenciesDatabase.patch(currencyId, { refCount: currentCurrencyRefCount + increment })
    }
}