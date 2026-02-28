import { Database, DatabaseJSONBody, NanoId } from "@/database/database-types.js"
import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import {
    Product,
    ProductAction,
    ProductActionJSONBody,
    createProductAction,
    isProductActionType,
} from "@/features/shops/database/products-types.js"
import { ok } from "@/lib/error-handling.js"
import { Snowflake } from "discord.js"

export interface Shop {
    id: NanoId
    name: string
    emoji: string
    description: string
    currency: Currency
    discountCodes: {[code: string]: number}
    reservedTo?: Snowflake
    products: Map<NanoId, Product>
}

export type ShopOptions = Omit<Shop, "id" | "products" | "currency" | "discountCodes">
export type ShopOptionsOptional = Partial<ShopOptions>


export interface ShopsDatabaseJSONBody extends DatabaseJSONBody {
    [shopId: NanoId]: Omit<Shop, "products" | "currency"> 
        & { 
            products: { [productId: NanoId]: Omit<Product, "action" | "shopId"> & { action?: ProductActionJSONBody } }
        } 
        & { currencyId: NanoId }
}

export class ShopsDatabase extends Database<NanoId, Shop> {
    public toJSON(): ShopsDatabaseJSONBody {
        const shopsJSON: ShopsDatabaseJSONBody = {}

        this.data.forEach((shop, shopId) => {
            const { currency: _, ...shopWithoutCurrency } = shop
            shopsJSON[shopId] = { ...shopWithoutCurrency, products: Object.fromEntries(shop.products), currencyId: shop.currency.id }
        })

        return shopsJSON
    }

    protected parseRaw(databaseRaw: ShopsDatabaseJSONBody) {
        const shops: Map<NanoId, Shop> = new Map()

        for (const [shopId, shop] of Object.entries(databaseRaw)) {
            const currency = getCurrencies().get(shop.currencyId)
            if (!currency) continue

            const products = new Map(
                    Object.entries(shop.products).map(([id, product]) => {
                        let action: ProductAction | undefined = undefined

                        if (product.action && isProductActionType(product.action.type)) {
                            action = createProductAction(product.action.type, product.action.options)
                        }

                        return [id, { ...product, shopId, action}]
                    })
                )

            shops.set(shopId, { ...shop, products, currency })
        }

        return ok(shops)
    }
}
