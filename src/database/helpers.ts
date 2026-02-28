type NotUndefined<T> = Exclude<T, undefined>

export function update<T extends object, O extends Partial<T>>(
    entry: T, 
    options: O, 
    handlers?: {[K in keyof O]?: (entry: T, value: NotUndefined<O[K]>) => void}
) {
    for (const _key in options) {
        const key = _key as keyof O // keys should only be strings

        const value = options[key]
        if (value === undefined || value === null) continue

        if (handlers && handlers[key] !== undefined) {
            const handler = handlers[key]

            // forced cast, because TS can"t correctly infer here
            handler(entry, value as NotUndefined<O[typeof key]>)
        }
        else {
            // forced cast, because TS can"t correctly infer here
            entry[key as keyof T] = value as T[keyof T]
        }
    }
}
