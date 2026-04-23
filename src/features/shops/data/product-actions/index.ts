import { giveCurrencyProductAction } from "./give-currency.js";
import { giveRoleProductAction } from "./give-role.js";
import { ProductAction, ProductActionSchema } from "./product-action.js";

type ActionKind = "give-role" | "give-currency"
type ProductActionMap = {
    [K in ActionKind]: ProductAction<K, ProductActionSchema<K>>
}

export const productActions: ProductActionMap = {
    "give-currency": giveCurrencyProductAction,
    "give-role": giveRoleProductAction
}
