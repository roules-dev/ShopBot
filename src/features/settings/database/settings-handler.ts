import settings from "@/../data/settings.json" with { type: "json" }
import { Setting, Settings, SettingsDatabase } from "@/features/settings/database/settings-types.js"
import { err, ok } from "@/lib/error-handling.js"
import { EVENTS } from "@/core/events/event-bus.js"

const settingsDatabase = new SettingsDatabase(settings, "data/settings.json")

export function getSettings(): Settings {
    return settingsDatabase.data
}

export function getSetting(id: string): Setting | undefined {
    return settingsDatabase.data.get(id)
}


// TODO : get rid of this "value: any" for a more type safe way of doing it
// future signature: 

//* setSetting<T extends SettingIdBrands, V extends SettingValueByIdBrand<T>>(id: T, value: V)
export async function setSetting(id: string, value: any) {
    const setting = settingsDatabase.data.get(id)
    if (!setting) return err("Setting does not exist")

    const updatedSetting = {...setting, value: value}

    settingsDatabase.data.set(id, updatedSetting)

    const [error] = await  settingsDatabase.save()
    if (error) return err(error)

    EVENTS.emit("settingUpdated", id, updatedSetting)

    return ok(setting)
}