// import { RegisteredTranslations } from "./localization.js"

// type I18nMessage = string

// export type LanguageMessages = {
//   [key: string]: I18nMessage | LanguageMessages
// }



// type Join<K, P> = K extends string
//     ? P extends string
//         ? `${K}.${P}`
//         : never
//     : never

// type DotPathsFor<T extends object = RegisteredTranslations> = {
//     [K in keyof T]: T[K] extends I18nMessage
//         ? K
//         : T[K] extends object
//         ? Join<K, DotPathsFor<T[K]>>
//         : never
// }[keyof T]

// type x = DotPathsFor<RegisteredTranslations>

// type ExtractParamArgs<S extends string> = 
//     S extends `${string}{${infer Param}}${infer Rest}`
//         ? { [K in Param]: string } & ExtractParamArgs<Rest> 
//         : unknown

// type TranslationAtKeyWithParams<Translations, Key extends string> = 
//     Key extends `${infer First}.${infer Rest}`
//         ? First extends keyof Translations
//             ? TranslationAtKeyWithParams<Translations[First], Rest>
//             : never
//         : Key extends keyof Translations
//         ? Translations[Key]
//         : never

        
// type Params<S extends DotPathsFor> = ExtractParamArgs<TranslationAtKeyWithParams<RegisteredTranslations, S>>
        
// type y = Params<"extendedComponents.editModal.title">


// function translate<S extends DotPathsFor>(key: S, templates?: { [key: string]: string | number }) {
    
// }

// export const t = translate







export function replaceTemplates(str: string, templates: { [key: string]: string | number }): string {
    let result = str
    for (const key in templates) {
        const value = templates[key]
        result = result.replace(new RegExp(`{${key}}`, 'g'), String(value)) 
    }
    return result
}
