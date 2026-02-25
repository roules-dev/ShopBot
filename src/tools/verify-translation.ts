import { DEFAULT_LOCALE_CODE, LOCALES } from '@/lib/localization.js'
import { PrettyLog } from '@/lib/pretty-log.js'
import { fileURLToPath, pathToFileURL } from 'node:url'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sameStructure(a: Record<string, any>, b: Record<string, any>): [boolean, string[]] {
    if (typeof a !== "object" || typeof b !== "object") {
        return [false, ["Not an object"]]
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sameStructureRec(ref: any, tested: any, path: string[] = []): [boolean, string[]] {
        const pathString = path.join('.')


        if (typeof ref === "string" && typeof tested === "string") {

            const refTemplateKeys = getTemplateKeys(ref)
            const testedTemplateKeys = getTemplateKeys(tested)

            if (refTemplateKeys.length !== testedTemplateKeys.length) {
                const missingKeys = refTemplateKeys.filter(k => !testedTemplateKeys.includes(k))
                return [false, [`Missing template keys (${missingKeys.join(', ')}): ${pathString}`]]
            }

            return [true, []]
        }

        if (typeof ref !== "object" || typeof tested !== "object") {
            return [false, [`Incorect type: ${pathString}`]]
        }

        const errors: string[] = []

        const refKeys = Object.keys(ref)

        for (let i = 0; i < refKeys.length; i++) {
            const key = refKeys[i]

            if (!Object.prototype.hasOwnProperty.call(tested, key)) {
                errors.push(`Missing key: ${pathString}.${key}`)
                continue
            }

            const [same, subErrors] = sameStructureRec(ref[key], tested[key], [...path, key])

            if (!same) {
                errors.push(...subErrors)
            }
        }

        return [errors.length === 0, errors]
    }

    return sameStructureRec(a, b, [])
}

function getTemplateKeys(template: string) {
    const matches = template.matchAll(/{(.+?)}/g)
    const keys = []
    for (const match of matches) {
        keys.push(match[1])
    }
    return keys
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

    const [same, errors] = sameStructure(LOCALES[DEFAULT_LOCALE_CODE], locale)

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