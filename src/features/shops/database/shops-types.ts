

// export type Shop = {
//     id: NanoId
//     name: string
//     emoji: string | null
//     description: string | null
//     currency: Currency
//     currencyId: BrandedNanoId
//     discountCodes: {[code: string]: number}
//     reservedTo?: Snowflake | null
//     products: Map<NanoId, Product>
// }

import z from "zod"
import { ShopRawSchema } from "../schemas/shop-schemas.js"

export type Shop = z.infer<typeof ShopRawSchema>

export type ShopOptions = Omit<Shop, "products" | "discountCodes">


// export interface ShopsDatabaseJsonBody extends DatabaseJsonBody {
//     [shopId: NanoId]: Omit<Shop, "products" | "currency"> 
//         & { 
//             products: { [productId: NanoId]: Omit<Product, "action" | "shopId"> & { action?: ProductActionJsonBody } }
//         } 
//         & { currencyId: NanoId }
// }

// export class ShopsDatabase extends DatabaseLegacy<NanoId, Shop> {
//     public toJSON(): ShopsDatabaseJsonBody {
//         const shopsJson: ShopsDatabaseJsonBody = {}

//         this.data.forEach((shop, shopId) => {
//             const { currency: _, ...shopWithoutCurrency } = shop
//             shopsJson[shopId] = { ...shopWithoutCurrency, products: Object.fromEntries(shop.products) as TODO, currencyId: shop.currencyId }
//         })

//         return shopsJson
//     }

//     protected parseRaw(databaseRaw: ShopsDatabaseJsonBody) {
//         const shops: Map<NanoId, Shop> = new Map()

//         for (const [shopId, shop] of Object.entries(databaseRaw)) {
//             const currency = getCurrencies().get(shop.currencyId as BrandedNanoId)
//             if (!currency) continue

//             const products = new Map(
//                     Object.entries(shop.products).map(([id, product]) => {
//                         let optionalAction: { action?: ProductAction }= {}

//                         if (product.action && isProductActionType(product.action.type)) {
//                             optionalAction.action = createProductAction(product.action.type, product.action.options)
//                         }

//                         return [id, { ...product, shopId, ...optionalAction}]
//                     })
//                 )

//             shops.set(shopId, { ...shop, products, currency } as TODO) // horrible casting, but will soon be removed
//             // new db implementation uses Zod validation, there will be no need for wacky manual validation anymore
//         }

//         return ok(shops)
//     }
// }
