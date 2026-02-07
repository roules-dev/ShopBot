import { APIApplicationCommandOption, SlashCommandBuilder } from "discord.js";
import fs from 'node:fs/promises';
import path from 'node:path';
import { PrettyLog } from "./pretty-log.js";
import './strings.js';

import en_US_locale from '@/../locales/en-US.json' with { type: 'json' };

import { fileURLToPath, pathToFileURL } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultLocale = en_US_locale
export type LocaleStrings = typeof defaultLocale

// absolute path from the project root to the locales folder
const localesPath = './locales'

const locales: { cache: { [code: string]: LocaleStrings }, expired: boolean } = { cache: {}, expired: true };

let currentLocale = defaultLocale

export async function getLocales() {
    if (!locales.expired) {
        return locales.cache
    }

    const localesFiles = (await fs.readdir(localesPath)).filter((file) => file.endsWith('.json'))

    for (const file of localesFiles) {
        const filePath = path.join(localesPath, file)
        const localeContentimport = await import(pathToFileURL(filePath).href, { with: { type: "json" } })
        locales.cache[file.replace('.json', '')] = localeContentimport.default
    }

    locales.expired = false
    return locales.cache
}

export function invalidateLocalesCache() {
    locales.expired = true
}

export function getLocaleCodes() {
    return Object.keys(getLocales())
}


export async function addLocalisationToCommand(commandData: SlashCommandBuilder) {
    const commandDataJSON = commandData.toJSON()

    commandDataJSON.name_localizations = await getLocaleStrings(['commands', commandDataJSON.name, 'name'])
    commandDataJSON.description_localizations = await getLocaleStrings(['commands', commandDataJSON.name, 'description'])
    await addLocalisationToOptions(commandDataJSON.options || [], ['commands', commandDataJSON.name, 'options'])

    return commandDataJSON
}

async function addLocalisationToOptions(options: APIApplicationCommandOption[], path: string[]) {
    for (const option of options) {
        option.name_localizations = await getLocaleStrings([...path, option.name, 'name'], 32)
        option.description_localizations = await getLocaleStrings([...path, option.name, 'description'], 100)
        if ("options" in option && option.options) {
            await addLocalisationToOptions(option.options, [...path, option.name, 'options'])
        }
    }
}

async function getLocaleStrings(path: string[], maxLength?: number): Promise<{ [key: string]: string | undefined }> {
    const locales = await getLocales()
    const result: { [key: string]: string | undefined } = {}

    for (const localeCode in locales) {
        const locale = locales[localeCode] as any
        let current = locale
        for (const key of path) {
            current = current[key]
            if (!current) break
        }

        if (typeof current !== 'string') {
            PrettyLog.warn(`Localisation ${path.join('.')} is not a string in ${localeCode} locale.`)
            result[localeCode] = undefined
            continue
        }

        if (!current || current.length < 1) {
            PrettyLog.warn(`Localisation ${path.join('.')} is missing in ${localeCode} locale.`)
            result[localeCode] = undefined
            continue
        }

        if (maxLength && current.length > maxLength) {
            current = current.slice(0, maxLength)
            PrettyLog.warn(`Localisation ${path.join('.')} is longer than ${maxLength} characters in ${localeCode} locale.`)
        }

        result[localeCode] = current
    }

    return result
}

export function replaceTemplates(str: string, templates: { [key: string]: string | number }): string {
    let result = str
    for (const key in templates) {
        const value = templates[key]
        result = result.replace(new RegExp(`{${key}}`, 'g'), String(value)) 
    }
    return result
}


export async function setCurrentLocale(localeCode: string) {
	const locales = await getLocales()

	const locale = locales[localeCode] ?? locales['en-US']
	if (!locale) throw new Error('Missing locale in locales folder')

	currentLocale = locale
}

export function getLocale(): LocaleStrings {
	if (!currentLocale) {
		throw new Error('Locale not set')
	}

	return currentLocale
}
export function errorMessages() {
	return getLocale().errorMessages
}
export function defaultComponents() {
    return getLocale().defaultComponents
}