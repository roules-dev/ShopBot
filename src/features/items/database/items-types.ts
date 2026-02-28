import { NanoId } from "@/database/database-types.js"
import { Snowflake } from "discord.js"

export const ITEM_ACTIONS = {
    GiveRole: {
        type: "give-role",
        options: (roleId: Snowflake) => ({ roleId }),
    },
    GiveCurrency: {
        type: "give-currency",
        options: (currencyId: NanoId, amount: number) => ({ currencyId, amount }),
    },
} as const


type ItemActionKeys = keyof typeof ITEM_ACTIONS

type ItemActionType<K extends ItemActionKeys> = typeof ITEM_ACTIONS[K]["type"]
type ItemActionOption<K extends ItemActionKeys> = ReturnType<typeof ITEM_ACTIONS[K]["options"]>

export type ItemAction = {
    [K in ItemActionKeys]: {
        type: ItemActionType<K>,
        options: ItemActionOption<K>
    }
}[ItemActionKeys];

export type ItemActionTypes = ItemAction["type"]


export type ItemActionJSONBody = {
    [K in ItemActionKeys]: {
        type: string
        options: ItemActionOption<K>
    }    
}[ItemActionKeys]    


export interface Item {
    id: NanoId
    name: string
    emoji: string
    description: string
    stock?: number
    price: number 
    action?: ItemAction
}