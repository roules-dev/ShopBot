
import z from "zod"
import { SettingVariantSchema } from "../schemas/settings-schemas.js"


export type Setting =  z.infer<typeof SettingVariantSchema>


type SettingVariants = z.infer<typeof SettingVariantSchema>

type SettingType = SettingVariants["type"]
type SettingValueType<T extends SettingType> = Extract<SettingVariants, { type: T }>["value"]

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
