/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiError, Database } from "@/database/database-types.js"
import { assertNeverReached, err, ok } from "@/lib/error-handling.js"
import { Snowflake } from "discord.js"


const settingTypes = ["string", "bool", "number", "channelId", "roleId", "userId", "enum"] as const

type SettingType = typeof settingTypes[number]

export type Setting = { id: string, name: string } & ({
    value: string | null
    type: "string"
} | {
    value: boolean | null
    type: "bool"
} | {
    value: number | null
    type: "number",
    min?: number | null,
    max?: number | null
} | {
    value: Snowflake | null
    type: "channelId"
} | {
    value: Snowflake | null
    type: "roleId"
} | {
    value: Snowflake | null
    type: "userId"
} | {
    value: string | null
    options: { label: string, value: string }[]
    type: "enum"
})

function isSettingType(type: unknown): type is SettingType {
    return settingTypes.includes(type as SettingType)
}

export type Settings = Map<string, Setting>

type UnionToIntersection<U> =
    (U extends any ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never

type OmitFromUnion<U, K extends keyof any> = U extends any ? Omit<U, K> : never

type ExtraSettingFields = UnionToIntersection<OmitFromUnion<Setting, "id" | "name" | "type" | "value">>

type SettingJsonBody = {
    id: string
    name: string
    type: string
    value: string | number | boolean | null
} & Partial<ExtraSettingFields>

export type SettingsJsonBody = {
    [id: string]: SettingJsonBody
}

export class SettingsDatabase extends Database<string, Setting> {

    public constructor (databaseRaw: SettingsJsonBody, path: string) {
        super(databaseRaw, path)

        const [error, settings] = this.parseRaw(databaseRaw)
        if (error) throw error

        this.data = settings
    }
    
    public override toJSON(): SettingsJsonBody {
        const settingsJson: SettingsJsonBody = {}

        this.data.forEach((setting) => {
            settingsJson[setting.id] = { ...setting, type: setting.type as string, 
                value: (setting.value === undefined) ? null : setting.value
            }
        })

        return settingsJson
    }

    protected override parseRaw(databaseRaw: SettingsJsonBody) {
        const settings: Settings = new Map()

        for (const [id, setting] of Object.entries(databaseRaw)) {
            if (!(isSettingType(setting.type))) return err(new ApiError("InvalidSettingType"))

            const value = setting.value

            if(settings.has(id)) return err(new ApiError("DuplicateSettingName"))

            switch (setting.type) {
                case "channelId":
                case "roleId":
                case "userId":
                    if (!(typeof value === "string")) return err(new ApiError("InvalidSettingType"))
                    settings.set(id, { ...setting, value: value as Snowflake, type: setting.type })
                    break

                case "string":
                    if (!(typeof value === "string")) return err(new ApiError("InvalidSettingType"))
                    settings.set(id, { ...setting, value: value as string, type: setting.type })
                    break
                case "bool":
                    if (!(typeof value === "boolean")) return err(new ApiError("InvalidSettingType"))
                    settings.set(id, { ...setting, value: value as boolean, type: setting.type })
                    break

                case "number": {
                    if (!(typeof value === "number")) return err(new ApiError("InvalidSettingType"))

                    let clampedvalue = value as number
                    if (setting.min !== undefined && setting.min !== null) clampedvalue = Math.max(clampedvalue, setting.min)
                    if (setting.max !== undefined && setting.max !== null) clampedvalue = Math.min(clampedvalue, setting.max)

                    settings.set(id, { ...setting, value: value as number, type: setting.type })
                    break
                }
                case "enum":
                    if (!(typeof value === "string")) return err(new ApiError("InvalidSettingType"))
                    if (setting.options === undefined) return err(new ApiError("InvalidSettingType"))
                    
                    settings.set(id, { ...setting, value: value as string, options: setting.options, type: setting.type })
                    break

                default:
                    assertNeverReached(setting.type)
            }
        
        }

        return ok(settings)
    }
}


// for rework

// type SettingVariants = z.infer<typeof SettingVariantSchema>

// type SettingType2 = SettingVariants["type"]
// type SettingValueType<T extends SettingType> = Extract<SettingVariants, { type: T }>["value"]


// type SettingIdBrands = {
//     [K in SettingType]: string & z.BRAND<`setting-${K}`>
// }[SettingType]


// type SettingValueByIdBrand<T> = 
//     T extends string & z.BRAND<infer B>
//         ? B extends `setting-${infer K}`
//             ? K extends SettingType
//                 ? SettingValueType<K>
//                 : never
//             : never
//         : never