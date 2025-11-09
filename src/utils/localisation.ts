import { APIApplicationCommandOption, SlashCommandBuilder } from "discord.js";
import path from 'node:path';
import fs from 'node:fs/promises';
import './strings'
import { PrettyLog } from "./pretty-log";

const localsPath = path.join(__dirname, '..', '..','locales');

const locales: { cache: { [code: string]: unknown }, expired: boolean } = { cache: {}, expired: true };

export async function getLocales() {
    if (!locales.expired) {
        return locales
    }

    const localesFiles = (await fs.readdir(localsPath)).filter((file) => file.endsWith('.json'))

    for (const file of localesFiles) {
        const filePath = path.join(localsPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        locales.cache[file.replace('.json', '')] = JSON.parse(content)
    }

    locales.expired = false
    return locales
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

    for (const localeCode in locales.cache) {
        const locale = locales.cache[localeCode] as any
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