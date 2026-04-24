import z from "zod"
import { SettingVariantSchema } from "../schemas/settings.schemas.js"
import { DeepReadonly } from "@/lib/types/readonly.js"


export type Setting =  DeepReadonly<z.infer<typeof SettingVariantSchema>>

type SettingVariants = z.infer<typeof SettingVariantSchema>

export type SettingType = SettingVariants["kind"]
export type SettingValueType<T extends SettingType> = Extract<SettingVariants, { kind: T }>["value"]

export type SettingIdBrands = {
    [K in SettingType]: string & z.BRAND<`setting-${K}`>
}[SettingType]

export type SettingValueByIdBrand<T> = 
    T extends string & z.BRAND<infer B>
        ? B extends `setting-${infer K}`
            ? K extends SettingType
                ? SettingValueType<K>
                : never
            : never
        : never
