import { Database, DatabaseJsonBody, NanoId } from "@/database/database-types.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import {
    Product,
    ProductAction,
    ProductActionJsonBody,
    createProductAction,
    isProductActionType,
} from "@/features/shops/database/products-types.js"
import { ok } from "@/lib/error-handling.js"
import { Snowflake } from "discord.js"

export interface Shop {
    id: NanoId
    name: string
    emoji?: string | null
    description?: string | null
    currency: Currency
    discountCodes: {[code: string]: number}
    reservedTo?: Snowflake | null
    products: Map<NanoId, Product>
}

export type ShopOptions = Omit<Shop, "id" | "products" | "currency" | "discountCodes">


export interface ShopsDatabaseJsonBody extends DatabaseJsonBody {
    [shopId: NanoId]: Omit<Shop, "products" | "currency"> 
        & { 
            products: { [productId: NanoId]: Omit<Product, "action" | "shopId"> & { action?: ProductActionJsonBody } }
        } 
        & { currencyId: NanoId }
}

export class ShopsDatabase extends Database<NanoId, Shop> {
    public toJSON(): ShopsDatabaseJsonBody {
        const shopsJson: ShopsDatabaseJsonBody = {}

        this.data.forEach((shop, shopId) => {
            const { currency: _, ...shopWithoutCurrency } = shop
            shopsJson[shopId] = { ...shopWithoutCurrency, products: Object.fromEntries(shop.products) as any, currencyId: shop.currency.id }
        })

        return shopsJson
    }

    protected parseRaw(databaseRaw: ShopsDatabaseJsonBody) {
        const shops: Map<NanoId, Shop> = new Map()

        for (const [shopId, shop] of Object.entries(databaseRaw)) {
            const currency = getCurrencies().get(shop.currencyId)
            if (!currency) continue

            const products = new Map(
                    Object.entries(shop.products).map(([id, product]) => {
                        let optionalAction: { action?: ProductAction }= {}

                        if (product.action && isProductActionType(product.action.type)) {
                            optionalAction.action = createProductAction(product.action.type, product.action.options)
                        }

                        return [id, { ...product, shopId, ...optionalAction}]
                    })
                )

            shops.set(shopId, { ...shop, products, currency } as any) // horrible casting, but will soon be removed
            // new db implementation uses Zod validation, there will be no need for wacky manual validation anymore
        }

        return ok(shops)
    }
}
