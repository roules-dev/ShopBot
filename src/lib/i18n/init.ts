import { Register } from "./translations.js"

export type RegisteredTranslations = Register extends { translations: infer T }
  ? T 
  : LanguageMessages

type I18nMessage = string

export type LanguageMessages = {
    [key: string]: I18nMessage | LanguageMessages
}

type Join<K, P> = K extends string
    ? P extends string
        ? `${K}.${P}`
        : never
    : never

export type DotPathsFor<T extends object = RegisteredTranslations> = {
    [K in keyof T]: T[K] extends I18nMessage
        ? K
        : T[K] extends object
        ? Join<K, DotPathsFor<T[K]>>
        : never
}[keyof T]

type x = DotPathsFor<RegisteredTranslations>

type ExtractParamArgs<S extends string> = 
    S extends `${string}{${infer Param}}${infer Rest}`
        ? { [K in Param]: string } & ExtractParamArgs<Rest> 
        : unknown

type TranslationAtKeyWithParams<Translations, Key extends string> = 
    Key extends `${infer First}.${infer Rest}`
        ? First extends keyof Translations
            ? TranslationAtKeyWithParams<Translations[First], Rest>
            : never
        : Key extends keyof Translations
        ? Translations[Key]
        : never

type PathsWithParams = {
    [K in DotPathsFor]: keyof Params<K> extends never ? never : K
}[DotPathsFor]

type PathsWithNoParams = {
    [K in DotPathsFor]: keyof Params<K> extends never ? K : never
}[DotPathsFor]


type Params<S extends DotPathsFor> = ExtractParamArgs<TranslationAtKeyWithParams<RegisteredTranslations, S>>
        
export function initI18n({
    locale,
    fallbackLocale,
    translations,
}: {
    locale: string
    fallbackLocale: string | string[]
    translations: Record<string, LanguageMessages>
}) {
    let currentLocale = locale

    const fallbackLocales = Array.isArray(fallbackLocale)
        ? fallbackLocale
        : [fallbackLocale]

    const orderedLocales = () => new Set([
        currentLocale,
        ...fallbackLocales.flat(),
    ])

    function translate<S extends PathsWithNoParams>(key: S): string
    function translate<S extends PathsWithParams, A extends Params<S>>(key: S, args: A): string

    function translate<S extends DotPathsFor, A extends Params<S>>(key: S, args?: A): string {
        for (const locale of orderedLocales()) {
            const translationFile = translations[locale]
            if (translationFile == null) continue
            const translation = getTranslation(locale, translationFile, key, args)
            if (translation) return translation
        }
        return key
    }

    function setLocale(newLocale: string) {
        currentLocale = newLocale
    }

    return {
        t: translate,
        setLocale,
        getLocale: () => currentLocale
    }
}

function getTranslation<S extends DotPathsFor, A extends Params<S>>(
    locale: string,
    translations: LanguageMessages,
    key: S,
    args?: A
) {
    const translation = getTranslationByKey(translations, key)
    const argObj = args || {}


    if (typeof translation === "string") {
        return replaceTemplates(translation, argObj)
    }

    return undefined
}

export function getTranslationByKey(obj: LanguageMessages, key: string) {
    const keys = key.split(".")
    let currentObj = obj

    for (let i = 0; i <= keys.length - 1; i++) {
        const k = keys[i]
        const newObj = currentObj[k]
        if (newObj == null) return undefined

        if (typeof newObj === "string") {
            if (i < keys.length - 1) return undefined
            return newObj
        }

        currentObj = newObj
    }

    return undefined
}


function replaceTemplates(str: string, templates: { [key: string]: string | number }): string {
    let result = str
    for (const key in templates) {
        const value = templates[key]
        result = result.replace(new RegExp(`{${key}}`, "g"), String(value)) 
    }
    return result
}
