import { Snowflake } from "discord.js";
import { getCurrencies } from "../currencies/currencies-database";
import { Currency } from "../currencies/currencies-types";
import { Id, DatabaseJSONBody, Database } from "../database-types";

export const PRODUCT_ACTION_TYPE = {
    GiveRole: 'give-role',
    GiveCurrency: 'give-currency'
} as const

export type ProductActionType = typeof PRODUCT_ACTION_TYPE[keyof typeof PRODUCT_ACTION_TYPE]

export type ProductActionOptions<Type extends ProductActionType> = 
    Type extends typeof PRODUCT_ACTION_TYPE.GiveRole ? { roleId: Snowflake } :
    Type extends typeof PRODUCT_ACTION_TYPE.GiveCurrency ? { currencyId: Id, amount: number } :
    never;

export type ProductAction = {
    [T in ProductActionType]: {
        type: T;
        options: ProductActionOptions<T>;
    };
}[ProductActionType];

export type ProductActionJSONBody = {
    [T in ProductActionType]: {
        type: string;
        options: ProductActionOptions<T>;
    };
}[ProductActionType];


export function createProductAction<Type extends ProductActionType>(type: Type, options: ProductActionOptions<Type>): ProductAction {
    return {
        type,
        options
    } as ProductAction
}

export function isProductActionType(actionType: string): actionType is ProductActionType {
    return Object.values(PRODUCT_ACTION_TYPE).includes(actionType as ProductActionType);
}

export interface Product {
    id: Id
    shopId: Id
    name: string
    emoji: string
    description: string
    amount?: number
    price: number
    action?: ProductAction
}

export type ProductOptions = Omit<Product, 'id' | 'shopId'>
export type ProductOptionsOptional = Partial<ProductOptions>

export type ProductJSONBody = Omit<Product, 'action'> & { action?: ProductActionJSONBody }
export type ProductOptionsJSONBody = Omit<Product, 'id'>
export type ProductOptionsJSONBodyOptional = Partial<ProductOptionsJSONBody>

export interface Shop {
    id: Id
    name: string
    emoji: string
    description: string
    currency: Currency
    discountCodes: {[code: string]: number}
    reservedTo?: Snowflake
    products: Map<Id, Product>
}

export type ShopOptions = Omit<Shop, 'id'>
export type ShopOptionsJSONBody = Omit<ShopOptions, 'products' | 'currency'> & { currencyId: Id, products: { [productId: Id]: ProductJSONBody } } 
export type ShopOptionsOptionalJSONBody = Partial<ShopOptionsJSONBody>

export type EditShopOptions = Omit<Shop, 'id' | 'products' | 'currency' | 'discountCodes'>
export type EditShopOptionsOptional = Partial<EditShopOptions>


export interface ShopsDatabaseJSONBody extends DatabaseJSONBody {
    [shopId: Id]: Omit<Shop, 'products' | 'currency'> 
        & { 
            products: { [productId: Id]: ProductJSONBody },
            currencyId: Id
        } 
}

export class ShopsDatabase extends Database {
    public shops: Map<Id, Shop>

    public constructor (databaseRaw: ShopsDatabaseJSONBody, path: string) {
        super(databaseRaw, path)

        this.shops = this.parseRaw(databaseRaw)
    }

    public toJSON(): ShopsDatabaseJSONBody {
        const shopsJSON: ShopsDatabaseJSONBody = {}

        this.shops.forEach((shop, shopId) => {
            const { currency, ...shopWithoutCurrency } = shop
            shopsJSON[shopId] = { ...shopWithoutCurrency, products: Object.fromEntries(shop.products), currencyId: currency.id }
        })

        return shopsJSON
    }

    protected parseRaw(databaseRaw: ShopsDatabaseJSONBody): Map<Id, Shop> {
        const shops: Map<Id, Shop> = new Map()

        for (const [shopId, shop] of Object.entries(databaseRaw)) {
            if (!getCurrencies().has(shop.currencyId)) continue
            
            const products = new Map(
                Object.entries(shop.products).map(
                    ([id, product]) => {
                        let action: ProductAction | undefined = undefined

                        if (product.action && isProductActionType(product.action.type)) {
                            action = createProductAction(product.action.type, product.action.options)
                        }

                        return [id, { ...product, action}]
                })
            )

            shops.set(shopId, { ...shop, products, currency: getCurrencies().get(shop.currencyId)! })
        }

        return shops
    }
}

