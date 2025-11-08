import { APIApplicationCommandOption, SlashCommandBuilder } from "discord.js";
import path from 'node:path';
import fs from 'node:fs/promises';
import { get } from "node:http";

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


export async function addLocalisationToCommand(commandData: SlashCommandBuilder) {
    const commandDataJSON = commandData.toJSON()

    commandDataJSON.name_localizations = await getLocaleStrings(['commands', commandDataJSON.name, 'name'])
    commandDataJSON.description_localizations = await getLocaleStrings(['commands', commandDataJSON.name, 'description'])
    addLocalisationToOptions(commandDataJSON.options || [], ['commands', commandDataJSON.name, 'options'])

    return commandDataJSON
}

async function addLocalisationToOptions(options: APIApplicationCommandOption[], path: string[]) {
    for (const option of options) {
        option.name_localizations = await getLocaleStrings([...path, option.name, 'name'])
        option.description_localizations = await getLocaleStrings([...path, option.name, 'description'])
        if ("options" in option && option.options) {
            await addLocalisationToOptions(option.options, [...path, option.name, 'options'])
        }
    }
}

async function getLocaleStrings(path: string[]): Promise<{ [key: string]: string | undefined }> {
    const locales = await getLocales()
    const result: { [key: string]: string | undefined } = {}

    for (const localeCode in locales.cache) {
        const locale = locales.cache[localeCode] as any
        let current = locale
        for (const key of path) {
            current = current[key]
            if (!current) break
        }
        result[localeCode] = current as string | undefined
    }

    return result
}