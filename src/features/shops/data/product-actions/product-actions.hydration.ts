import { Currency } from "@/features/currencies/database/currencies.types.js"

type HydrationRules = {
    currencyId: Currency
}

type GetObjectKey<K extends string> = K extends `${infer Name}Id` ? Name : `${K}Object`

type HydratedOptions<O extends Record<string, unknown>> = {
    [K in keyof O]: O[K]
} & {
    [K in keyof O as K extends keyof HydrationRules 
        ? GetObjectKey<K & string> 
        : never
    ]: K extends keyof HydrationRules ? HydrationRules[K] : never
}

export type HydratedAction<T> = T extends { options: infer O }
    ? O extends Record<string, unknown>
        ? Omit<T, 'options'> & { options: HydratedOptions<O> }
        : T
    : T

