import { DatabaseError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { Product, ProductOptions, ProductOptionsOptional } from "@/features/shops/database/products-types.js"
import { getShops, shopsDatabase } from "@/features/shops/database/shops-database.js"
import { err, ok } from "@/lib/error-handling.js"
import { nanoid } from "nanoid"

export function getProducts(shopId: string){
    const shop = getShops().get(shopId)
    if (!shop) return err(new DatabaseError("ShopDoesNotExist"))

    return ok(Object.freeze(shop.products))
}

export async function addProduct(shopId: string, options: ProductOptions) {
    const shop = getShops().get(shopId)
    if (!shop) return err(new DatabaseError("ShopDoesNotExist"))

    const id = nanoid()
    const product = Object.assign({ id, shopId }, options)

    shop.products.set(id, product)
    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    

    return ok(Object.freeze(product))
}

export async function removeProduct(shopId: string, productId: string) {
    const shop = getShops().get(shopId)
    if (!shop) return err(new DatabaseError("ShopDoesNotExist"))

    shop.products.delete(productId)
    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    
    return ok(true)
}


const PRODUCT_FIELD_HANDLERS = {
    stock: (product: Product, stock: number) => {
        if (stock == -1) product.stock = undefined
        else product.stock = stock
    }
}


export async function updateProduct(
    shopId: string,
    productId: string,
    options: ProductOptionsOptional,
) {
    const shop = getShops().get(shopId)
    if (!shop) return err(new DatabaseError("ShopDoesNotExist"))

    const product = shop.products.get(productId)

    if (!product) return err(new DatabaseError("ProductDoesNotExist"))

    update(product, options, PRODUCT_FIELD_HANDLERS)

    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    
    return ok(product)
}

