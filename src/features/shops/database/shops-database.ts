import { ShopsDatabase } from "@/core/database/database.types.js"
import { ApiError, NanoId } from "@/database/database-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Exact } from "@/lib/types/constraints.js"
import { nanoid } from "nanoid"
import { ShopOptions } from "./shops-types.js"

export function dbHasShopWithName(db: ShopsDatabase, shopName: string) {
    for (const [_id, shop] of db.list()) {
        if (shop.name === shopName) {
            return true
        }
    }
    return false
}

export async function dbCreateShop<T extends ShopOptions> (
    shopsDb: ShopsDatabase,
    options: Exact<T, ShopOptions>
) {
    if (dbHasShopWithName(shopsDb, options.name)) return err(new ApiError("ShopAlreadyExists"))

    const newShopId = nanoid<NanoId>()    

    const newShop = {
        ...options,
        discountCodes: {},
        products: {}
    }
    
    const [error] = await shopsDb.set(newShopId, newShop)
    if (error) return err(error)
    

    return ok(newShop)
}

export async function dbRemoveShop(db: ShopsDatabase, shopId: NanoId) {
    if (!db.get(shopId)) return err(new ApiError("ShopDoesNotExist"))

    const [error] = await db.delete(shopId)
    if (error) return err(error)

    return ok(true)
}



export async function dbUpdateShop(db: ShopsDatabase, shopId: NanoId, options: Partial<ShopOptions>) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const [error, updatedShop] = await db.patch(shopId, options)
    if (error) return err(error)
    
    return ok(updatedShop)
}


export async function dbUpdateShopPosition(db: ShopsDatabase, shopId: NanoId, index: number) {
    return await db.reorder(shopId, index)
}

export async function dbCreateDiscountCode(db: ShopsDatabase, shopId: NanoId, discountCode: string, discountAmount: number) {
    const shop = db.get(shopId) 
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const [error1, _] = await db.update(shopId, draft => {
        draft.discountCodes[discountCode] = discountAmount
    })
    if (error1) return err(error1)

    return ok(true)
}

export async function dbRemoveDiscountCode(db: ShopsDatabase, shopId: NanoId, discountCode: string) {
    const shop = db.get(shopId)
    if (!shop) return err(new ApiError("ShopDoesNotExist"))

    const [error1, _] = await db.update(shopId, draft => {
        delete draft.discountCodes[discountCode]
    })
    if (error1) return err(error1)

    
    return ok(true)
}