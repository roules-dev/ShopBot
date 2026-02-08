import settings from '@/../data/settings.json' with { type: 'json' }
import { setCurrentLocale } from '@/utils/localisation.js'
import { Setting, Settings, SettingsDatabase } from './settings-types.js'

const settingsDatabase = new SettingsDatabase(settings, "data/settings.json")

export function getSettings(): Settings {
    return settingsDatabase.settings
}

export function getSetting(id: string): Setting | undefined {
    return settingsDatabase.settings.get(id)
}


// TODO : get rid of this value: any for a more type safe way of doing it
// -> no idea of how yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setSetting(id: string, value: any): Promise<Setting> {
    if (!settingsDatabase.settings.has(id)) throw new Error("Setting does not exist")

    const setting = settingsDatabase.settings.get(id)!
    const updatedSetting = {...setting, value: value}

    settingsDatabase.settings.set(id, updatedSetting)

    await settingsDatabase.save()

    await onSettingUpdate(updatedSetting)

    return settingsDatabase.settings.get(id)!
}

export async function onSettingUpdate(setting: Setting) { // this is horrible, should find a better way to do this, maybe with events
    switch (setting.id) {
        case "language":
            await setCurrentLocale(setting.value as string)  
            break
        case "activityMessage":
        case "activityType":
            // TODO: Update activity
            break
    }
}