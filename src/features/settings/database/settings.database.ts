import fs from "fs/promises"
import { err, ok } from "@/lib/error-handling.js"
import { EVENTS } from "@/core/events/event-bus.js"
import { SettingSchema } from "../schemas/settings.schemas.js"
import z from "zod"
import { SettingIdBrands, SettingValueByIdBrand } from "./settings.types.js"
import { JsonDatabase } from "@/database/json-database.js"

const settingsDatabasePath = "./data/settings.json"
const settingsDatabaseRaw = JSON.parse(await fs.readFile(settingsDatabasePath, "utf-8"))

const settingsDatabase = new JsonDatabase(settingsDatabaseRaw, settingsDatabasePath, SettingSchema, z.string())

export function getSettings() {
    return settingsDatabase.list()
}

export function getSetting(id: string) {
    return settingsDatabase.get(id)
}

export async function setSetting<
    BrandedId extends SettingIdBrands, 
    SettingValue extends SettingValueByIdBrand<BrandedId>
>(
    id: BrandedId, 
    value: SettingValue
) {
    const setting = settingsDatabase.get(id)
    if (!setting) return err("Setting does not exist")

    const [error, updated] = await settingsDatabase.patch(id, { value: value })
    if (error) return err(error)

    EVENTS.emit("settingUpdated", id, updated)

    return ok(setting)

}