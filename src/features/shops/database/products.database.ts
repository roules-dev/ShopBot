import { ShopsDatabase } from "@/core/database/database.types.js"
import { ApiError, NanoId } from "@/database/database.types.js"
import { err, ok } from "@/lib/error-handling.js"
import { nanoid } from "nanoid"
import { Product } from "./products.types.js"

export function dbGetProducts(db: ShopsDatabase, shopId: NanoId){
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    return ok(shop.products)
}

export async function dbAddProduct(db: ShopsDatabase, shopId: NanoId, product: Product) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const id = nanoid<NanoId>()

    const [error1, updatedShop] = await db.update(shopId, draft => {
        draft.products[id] = product
    })
    if (error1) return err(error1)
    
    const updatedProduct = updatedShop.products[id]
    if (!updatedProduct) return err(new ApiError("UnexpectedError"))

    return ok(updatedProduct)
}

export async function dbRemoveProduct(db: ShopsDatabase, shopId: NanoId, productId: NanoId) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"));

    const [error1] = await db.update(shopId, draft => {
        delete draft.products[productId]
    })
    if (error1) return err(error1)

    return ok(true)
}


export async function dbUpdateProduct(
    db: ShopsDatabase,
    shopId: NanoId,
    productId: NanoId,
    options: Partial<Product>,
) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))


    const [error, updatedShop] = await db.update(shopId, draft => {
        const product = draft.products[productId]

        if (!product) throw new ApiError("ProductDoesNotExist")

        draft.products[productId] = {
            ...product,
            ...options
        }
    })
    if (error) return err(error)
    
    const updatedProduct = updatedShop.products[productId]
    if (!updatedProduct) return err(new ApiError("UnexpectedError"))

    return ok(updatedProduct)
}

