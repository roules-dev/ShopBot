import { Balance2, NanoId } from "@/database/database-types.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { Item } from "@/features/items/database/items-types.js"
import { Prettify } from "@/lib/types/utils.js"
import { Snowflake } from "discord.js"


// thinking of a reworking of the product system :
// products could now be items, with their own database
// product will no longer be attached to a shop
// a shop will just hold a list of products



export const PRODUCT_ACTION_TYPE = {
    GiveRole: "give-role",
    GiveCurrency: "give-currency",
} as const

export type ProductActionType =
    (typeof PRODUCT_ACTION_TYPE)[keyof typeof PRODUCT_ACTION_TYPE]

export type ProductActionOptions<Type extends ProductActionType> =
    Type extends typeof PRODUCT_ACTION_TYPE.GiveRole ? { roleId: Snowflake }
    : Type extends typeof PRODUCT_ACTION_TYPE.GiveCurrency ? { currencyId: NanoId, amount: number }
    : never

export type ProductAction = {
    [T in ProductActionType]: {
        type: T
        options: ProductActionOptions<T>
    }
}[ProductActionType]

export type ProductActionJsonBody = {
    [T in ProductActionType]: {
        type: string
        options: ProductActionOptions<T>
    }
}[ProductActionType]

//! ------------
// TODO refactor
export function createProductAction<Type extends ProductActionType>(
    type: Type,
    options: ProductActionOptions<Type>,
): ProductAction {
    return {
        type,
        options,
    } as ProductAction
}

export function isProductActionType(
    actionType: string,
): actionType is ProductActionType {
    return Object.values(PRODUCT_ACTION_TYPE).includes(
        actionType as ProductActionType,
    )
}
//! ------------


// Product will become Item, independant of shops
// so no more shopId

// Price system will change :
// it'll be a map of currencyId => price (number)

export interface Product {
    id: NanoId
    shopId: NanoId
    name: string
    emoji: string | null
    description: string | null
    stock?: number | null
    price: number 
    action?: ProductAction | null
}

export type ProductOptions = Omit<Product, "id" | "shopId">

// ---
// new implementation

export type ProductOptions2 = {
    price: Array<Balance2<Currency>>
    stock?: number
}

// TODO : if price is an empty array -> item is free -> must add a string to locales.

export type Product2 = Prettify<{
    item : Item 
} & ProductOptions2>
