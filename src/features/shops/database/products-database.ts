import { ApiError } from "@/database/database-types.js"
import { update2 } from "@/database/helpers.js"
import { ProductOptions } from "@/features/shops/database/products-types.js"
import { getShops, shopsDatabase } from "@/features/shops/database/shops-database.js"
import { err, ok } from "@/lib/error-handling.js"
import { nanoid } from "nanoid"

export function getProducts(db = shopsDatabase, shopId: string){
    const shop = getShops(db).get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    return ok(shop.products)
}

export async function addProduct(db = shopsDatabase, shopId: string, options: ProductOptions) {
    const shop = getShops(db).get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const id = nanoid()
    const product = Object.assign({ id, shopId }, options)

    shop.products.set(id, product)
    
    const [error] = await db.save()
    if (error) return err(error)
    

    return ok(product)
}

export async function removeProduct(db = shopsDatabase, shopId: string, productId: string) {
    const shop = getShops(db).get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    shop.products.delete(productId)
    
    const [error] = await db.save()
    if (error) return err(error)
    
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


export async function updateProduct(
    db = shopsDatabase,
    shopId: string,
    productId: string,
    options: Partial<ProductOptions>,
) {
    const shop = getShops(db).get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const product = shop.products.get(productId)

    if (!product) return err(new ApiError("ProductDoesNotExist"))

    update2(product, options, PRODUCT_FIELD_HANDLERS)

    const [error] = await db.save()
    if (error) return err(error)
    
    return ok(product)
}

