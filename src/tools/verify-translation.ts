import { PrettyLog } from '@/lib/pretty-log.js'
import { defaultLocale } from '@/lib/localization/localization.js'
import { fileURLToPath, pathToFileURL } from 'node:url'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sameStructure(a: Record<string, any>, b: Record<string, any>): [boolean, string[]] {
    if (typeof a !== "object" || typeof b !== "object") {
        return [false, ["Not an object"]]
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sameStructureRec(a: Record<string, any>, b: Record<string, any>, path: string[] = []): [boolean, string[]] {
        if (typeof a === "string" && typeof b === "string") {
            return [true, []]
        }

        if (typeof a !== "object" || typeof b !== "object") {
            return [false, [`Incorect type: ${path.join('.')}`]]
        }

        const errors: string[] = []

        const aKeys = Object.keys(a)

        for (let i = 0; i < aKeys.length; i++) {
            const key = aKeys[i]

            if (!Object.prototype.hasOwnProperty.call(b, key)) {
                errors.push(`Missing key: ${path.join('.')}.${key}`)
                continue
            }

            const [same, subErrors] = sameStructureRec(a[key], b[key], [...path, key])

            if (!same) {
                errors.push(...subErrors)
            }
        }

        return [errors.length === 0, errors]
    }

    return sameStructureRec(a, b, [])
}

async function loadLocaleFile(localeCode: string) {
    try {
        const locale = (await import(pathToFileURL(`./locales/${localeCode}.json`).href, {
            with: { type: "json" } 
        })).default

        if (typeof locale !== 'object') throw new Error(`Locale ${localeCode} is not an object.`)
    
        if (!locale) throw new Error(`Locale ${localeCode} is empty or not found.`)
        return locale
    } 
    catch (error) {
        PrettyLog.error(`Locale ${localeCode} not found.`)

        if (error instanceof Error) {
            PrettyLog.error(error.message)
        }

        process.exit(1)
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const localeCode = process.argv[2]
    if (!localeCode) {
        PrettyLog.error("Please provide a locale code as an argument.")
        process.exit(1)
    }

    const locale = await loadLocaleFile(localeCode)

    const [same, errors] = sameStructure(defaultLocale, locale)

    if (same) {
        PrettyLog.success(`The locale ${localeCode} does not miss any translation`)
    }
    else {
        PrettyLog.error(`The locale ${localeCode} misses some translations or has extra keys.`)

        PrettyLog.error(`Found ${errors.length} error${errors.length === 1 ? '' : 's'}:`)
        
        for (const error of errors) {
            PrettyLog.error(`- ${error}`)
        }
    }
}