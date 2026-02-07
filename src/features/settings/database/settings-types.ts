import { Database, DatabaseError, DatabaseErrors } from "@/database/database-types.js";
import { assertNeverReached } from "@/utils/utils.js";
import { Snowflake } from "discord.js";


const settingTypes = ["string", "bool", "number", "channelId", "roleId", "userId", "enum"] as const

type SettingType = typeof settingTypes[number]

export type Setting = { id: string, name: string } & ({
    value: string | undefined
    type: "string"
} | {
    value: boolean | undefined
    type: "bool"
} | {
    value: number | undefined
    type: "number",
    min?: number,
    max?: number
} | {
    value: Snowflake | undefined
    type: "channelId" | "roleId" | "userId"
} | {
    value: string | undefined
    options: string[] | { label: string, value: string }[]
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

type SettingJSONBody = {
  id: string
  name: string
  type: string
  value: string | number | boolean | null
} & Partial<ExtraSettingFields>

export type SettingsJSONBody = {
    [id: string]: SettingJSONBody
}

export class SettingsDatabase extends Database {
    public settings: Settings = new Map()

    public constructor (databaseRaw: SettingsJSONBody, path: string) {
        super(databaseRaw, path)
        this.settings = this.parseRaw(databaseRaw)
    }
    
    public override toJSON(): SettingsJSONBody {
        const settingsJSON: SettingsJSONBody = {}

        this.settings.forEach((setting) => {
            settingsJSON[setting.id] = { ...setting, type: setting.type as string, 
                value: (setting.value === undefined) ? null : setting.value
            }
        })

        return settingsJSON
    }

    protected override parseRaw(databaseRaw: SettingsJSONBody): Settings {
        const settings: Settings = new Map()

        for (const [id, setting] of Object.entries(databaseRaw)) {
            if (!(isSettingType(setting.type))) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
            
            const name = setting.name
            const value = setting.value

            if(settings.has(id)) throw new DatabaseError(DatabaseErrors.DuplicateSettingName)

            if (value === null) {
                settings.set(id, { ...(setting as Setting), value: undefined })
                continue
            }

            switch (setting.type) {
                case "channelId":
                case "roleId":
                case "userId":
                    if (!(typeof value === "string")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    settings.set(id, { ...setting, value: value as Snowflake, type: setting.type })
                    break

                case "string":
                    if (!(typeof value === "string")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    settings.set(id, { ...setting, value: value as string, type: setting.type })
                    break
                case "bool":
                    if (!(typeof value === "boolean")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    settings.set(id, { ...setting, value: value as boolean, type: setting.type })
                    break

                case "number":
                    if (!(typeof value === "number")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)

                    let clampedvalue = value as number
                    if (setting.min !== undefined) clampedvalue = Math.max(clampedvalue, setting.min)
                    if (setting.max !== undefined) clampedvalue = Math.min(clampedvalue, setting.max)

                    settings.set(id, { ...setting, value: value as number, type: setting.type })
                    break

                case "enum":
                    if (!(typeof value === "string")) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    if (setting.options === undefined) throw new DatabaseError(DatabaseErrors.InvalidSettingType)
                    
                    settings.set(id, { ...setting, value: value as string, options: setting.options, type: setting.type })
                    break

                default:
                    assertNeverReached(setting.type)
            }
        
        }

        return settings
    }
}
