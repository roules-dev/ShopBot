import { ApiError } from "@/database/database-types.js"
import { update2 } from "@/database/helpers.js"
import { ProductOptions } from "@/features/shops/database/products-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { nanoid } from "nanoid"
import { ShopsDatabase } from "./shops-types.js"

export function dbGetProducts(db: ShopsDatabase, shopId: string){
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    return ok(shop.products)
}

export async function dbAddProduct(db: ShopsDatabase, shopId: string, options: ProductOptions) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const id = nanoid()

    const [error1, updatedShop] = await db.update(shopId, draft => {
        const product = Object.assign({ id, shopId }, options)
        draft.products.set(id, product)

    })
    if (error1) return err(error1)

    const [error2] = await db.save()
    if (error2) return err(error2)
    
    const updatedProduct = updatedShop.products.get(id)
    if (!updatedProduct) return err(new ApiError("UnexpectedError"))

    return ok(updatedProduct)
}

export async function dbRemoveProduct(db: ShopsDatabase, shopId: string, productId: string) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"));

    const [error1] = await db.update(shopId, draft => {
        draft.products.delete(productId)
    })
    if (error1) return err(error1)

    const [error2] = await db.save()
    if (error2) return err(error2)
    
    return ok(true)
}


const PRODUCT_FIELD_HANDLERS = {
    stock: (stock: number | undefined | null) => {
        if (stock == -1 || stock == undefined) return null
        else return stock
    }
}


// in next version : editing a product will not mean 
// edit an item, these will be two separate things, 
// so editing a product will be editing its price or 
// stock, for a specific shop


export async function dbUpdateProduct(
    db: ShopsDatabase,
    shopId: string,
    productId: string,
    options: Partial<ProductOptions>,
) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const product = shop.products.get(productId)

    if (!product) return err(new ApiError("ProductDoesNotExist"))

    update2(product, options, PRODUCT_FIELD_HANDLERS)

    const [error] = await db.save()
    if (error) return err(error)
    
    return ok(product)
}

