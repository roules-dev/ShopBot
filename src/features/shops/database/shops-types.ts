import { Database, DatabaseJSONBody, UUID } from "@/database/database-types.js";
import { getCurrencies } from "@/features/currencies/database/currencies-database.js";
import { Currency } from "@/features/currencies/database/currencies-types.js";
import { Snowflake } from "discord.js";
import {
  Product,
  ProductActionJSONBody,
  ProductAction,
  isProductActionType,
  createProductAction,
} from "@/features/shops/database/products-types.js";

export interface Shop {
    id: UUID
    name: string
    emoji: string
    description: string
    currency: Currency
    discountCodes: {[code: string]: number}
    reservedTo?: Snowflake
    products: Map<UUID, Product>
}

export type ShopOptions = Omit<Shop, 'id' | 'products' | 'currency' | 'discountCodes'>
export type ShopOptionsOptional = Partial<ShopOptions>


export interface ShopsDatabaseJSONBody extends DatabaseJSONBody {
    [shopId: UUID]: Omit<Shop, 'products' | 'currency'> 
        & { 
            products: { [productId: UUID]: Omit<Product, 'action' | 'shopId'> & { action?: ProductActionJSONBody } }
        } 
        & { currencyId: UUID }
}

export class ShopsDatabase extends Database {
    public shops: Map<UUID, Shop>

    public constructor (databaseRaw: ShopsDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.shops = this.parseRaw(databaseRaw)
  }

  public toJSON(): ShopsDatabaseJSONBody {
        const shopsJSON: ShopsDatabaseJSONBody = {}

    this.shops.forEach((shop, shopId) => {
            shopsJSON[shopId] = { ...shop, products: Object.fromEntries(shop.products), currencyId: shop.currency.id }
        })

        return shopsJSON
  }

  protected parseRaw(databaseRaw: ShopsDatabaseJSONBody): Map<UUID, Shop> {
        const shops: Map<UUID, Shop> = new Map()

    for (const [shopId, shop] of Object.entries(databaseRaw)) {
            if (!getCurrencies().has(shop.currencyId)) continue

      const products = new Map(
                Object.entries(shop.products).map(
                    ([id, product]) => {
                        let action: ProductAction | undefined = undefined

          if (product.action && isProductActionType(product.action.type)) {
                            action = createProductAction(product.action.type, product.action.options)
          }

                        return [id, { ...product, shopId, action}]
                })
            )

            shops.set(shopId, { ...shop, products, currency: getCurrencies().get(shop.currencyId)! })
    }

        return shops
  }
}
