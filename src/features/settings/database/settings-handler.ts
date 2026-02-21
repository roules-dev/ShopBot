import settings from '@/../data/settings.json' with { type: 'json' }
import { Setting, Settings, SettingsDatabase } from '@/features/settings/database/settings-types.js'
import { err, ok } from '@/lib/error-handling.js'
import { setCurrentLocale } from '@/lib/localisation.js'
import { EVENTS } from '@/middleware.js'

const settingsDatabase = new SettingsDatabase(settings, "data/settings.json")

export function getSettings(): Settings {
    return settingsDatabase.data
}

export function getSetting(id: string): Setting | undefined {
    return settingsDatabase.data.get(id)
}


// TODO : get rid of this "value: any" for a more type safe way of doing it
// -> probably with some Zod validation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setSetting(id: string, value: any) {
    if (!settingsDatabase.data.has(id)) return err({ message: "Setting does not exist" })

    const setting = settingsDatabase.data.get(id)!
    const updatedSetting = {...setting, value: value}

    settingsDatabase.data.set(id, updatedSetting)

    await settingsDatabase.save()
    await onSettingUpdate(updatedSetting)
    EVENTS.emit("settingUpdated", id, updatedSetting)

    return ok(settingsDatabase.data.get(id)!)
}

export async function onSettingUpdate(setting: Setting) { // TODO this is horrible, should find a better way to do this, maybe with events (event bus ?)
    switch (setting.id) {
        case "language":
            await setCurrentLocale(setting.value as string | undefined)  
            break
        case "activityMessage":
        case "activityType":
            // TODO: Update activity
            break
    }
}