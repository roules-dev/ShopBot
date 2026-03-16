import { ApiError } from "@/database/database-types.js"
import { update } from "@/database/helpers.js"
import { Product, ProductOptions } from "@/features/shops/database/products-types.js"
import { getShops, shopsDatabase } from "@/features/shops/database/shops-database.js"
import { err, ok } from "@/lib/error-handling.js"
import { nanoid } from "nanoid"

export function getProducts(shopId: string){
    const shop = getShops().get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    return ok(Object.freeze(shop.products))
}

export async function addProduct(shopId: string, options: ProductOptions) {
    const shop = getShops().get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const id = nanoid()
    const product = Object.assign({ id, shopId }, options)

    shop.products.set(id, product)
    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    

    return ok(Object.freeze(product))
}

export async function removeProduct(shopId: string, productId: string) {
    const shop = getShops().get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    shop.products.delete(productId)
    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    
    return ok(true)
}


const PRODUCT_FIELD_HANDLERS = {
    stock: (product: Product, stock: number) => {
        if (stock == -1) product.stock = undefined // null instead
        else product.stock = stock
    }
}


// in next version : editing a product will not mean 
// edit an item, these will be two separate things, 
// so editing a product will be editing its price or 
// stock, for a specific shop


export async function updateProduct(
    shopId: string,
    productId: string,
    options: Partial<ProductOptions>,
) {
    const shop = getShops().get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const product = shop.products.get(productId)

    if (!product) return err(new ApiError("ProductDoesNotExist"))

    update(product, options, PRODUCT_FIELD_HANDLERS)

    
    const [error] = await shopsDatabase.save()
    if (error) return err(error)
    
    return ok(product)
}

