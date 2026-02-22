import '@/utils/strings.js'
import { APIApplicationCommandOption, SlashCommandBuilder } from "discord.js"
import { getTranslationByKey, initI18n } from "./i18n/init.js"
import { PrettyLog } from "./pretty-log.js"

import en_US_locale from "@/generated/locales/en-US.js"
import es_ES_locale from "@/generated/locales/es-ES.js"
import fr_locale from "@/generated/locales/fr.js"
import { getSetting } from '@/features/settings/database/settings-handler.js'
import { EVENTS } from '@/middleware.js'


declare module "./i18n/translations.js" {
	interface Register {
		translations: typeof en_US_locale
	}
}

export const DEFAULT_LOCALE_CODE = "en-US"
export const LOCALES = {
	"en-US": en_US_locale,
	"es-ES": es_ES_locale,
	"fr": fr_locale
} as const


export async function addLocalisationToCommand(commandData: SlashCommandBuilder) {
    const commandDataJSON = commandData.toJSON()

    if (!commandDataJSON || !(commandDataJSON.name in LOCALES[DEFAULT_LOCALE_CODE].commands)) {
        return commandDataJSON
    }

    commandDataJSON.name_localizations = await getLocaleStrings(`commands.${commandDataJSON.name}.name`)
    commandDataJSON.description_localizations = await getLocaleStrings(`commands.${commandDataJSON.name}.description`)

    if (!commandDataJSON.options) {
        return commandDataJSON
    }
    await addLocalisationToOptions(commandDataJSON.options, `commands.${commandDataJSON.name}.options`)

    return commandDataJSON
}

async function addLocalisationToOptions(options: APIApplicationCommandOption[], path: string) {
    for (const option of options) {
        option.name_localizations = await getLocaleStrings(`${path}.${option.name}.name`)
        option.description_localizations = await getLocaleStrings(`${path}.${option.name}.description`)
        if ("options" in option && option.options) {
            await addLocalisationToOptions(option.options, `${path}.${option.name}.options`)
        }
    }
}


async function getLocaleStrings(path: string, maxLength?: number): Promise<{ [key: string]: string | undefined }> {
    const result: { [key: string]: string | undefined } = {}

    for (const locale in LOCALES) {
        const loc = locale as keyof typeof LOCALES
        let translation = getTranslationByKey(LOCALES[loc], path)

        if (translation !== undefined) {
            if (maxLength && translation.length > maxLength) {
                translation = translation.slice(0, maxLength)
                PrettyLog.warn(`Localisation ${path} is longer than ${maxLength} characters in ${loc} locale.`)
            }
            result[loc] = translation
        }
        else {
            result[loc] = undefined
            PrettyLog.warn(`Localisation ${path} is missing in ${loc} locale.`)
        }
    }

    return result
}

const { t, setLocale } = initI18n({
	locale: "en-US",
	fallbackLocale: DEFAULT_LOCALE_CODE,
	translations: LOCALES
})

export { t }

EVENTS.on("settingUpdated", async (settingId, setting) => {
	if (settingId !== "language") return
	if (setting.value === undefined) return setLocale(DEFAULT_LOCALE_CODE)
	if (typeof setting.value !== "string") return

	setLocale(setting.value)
})

const localeSetting = getSetting("language")

if (localeSetting && typeof localeSetting.value === "string") {
	setLocale(localeSetting.value)
}