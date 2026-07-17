import { giveCurrencyProductAction } from "./give-currency.js";
import { giveRoleProductAction } from "./give-role.js";
import { ProductAction } from "./product-action.js";

type ActionKind = "give-role" | "give-currency"
export type ProductActionMap = {
    [K in ActionKind]: ProductAction<K>
}

export const productActions = {
    "give-currency": giveCurrencyProductAction,
    "give-role": giveRoleProductAction
}

export function getAction(kind: ActionKind): ProductActionMap[ActionKind] {
    return productActions[kind]
}