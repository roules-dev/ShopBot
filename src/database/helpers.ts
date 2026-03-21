import { Shop, ShopOptions } from "@/features/shops/database/shops-types.js"

type NotUndefined<T> = Exclude<T, undefined>

export function update<T extends object, O extends Partial<T>>(
    entry: T, 
    options: O, 
    handlers?: {[K in keyof O]?: (value: NotUndefined<O[K]>) => O[K]}
) {
    for (const _key in options) {
        const key = _key as keyof O // keys should only be strings

        const value = options[key]
        if (value === undefined || value === null) continue

        if (handlers && handlers[key] !== undefined) {
            const handler = handlers[key]

            // forced cast, because TS can't correctly infer here
            entry[key as keyof T] = handler(value as NotUndefined<O[typeof key]>) as any as T[keyof T]
        }
        else {
            // forced cast, because TS can't correctly infer here
            entry[key as keyof T] = value as T[keyof T]
        }
    }
}

// ---
// should work, avoids casting :

function applyKey<T extends object, K extends keyof T>(
    entry: T,
    key: K,
    value: T[K],
    handler?: (value: T[K]) => T[K]
) {
    if (handler !== undefined) entry[key] = handler(value)
    else entry[key] = value
}

export function update2<T extends object>(
    entry: T,
    options: Partial<T>,
    handlers?: { [K in keyof T]?: (value: T[K]) => T[K] }
) {
    for (const key in options) {
        const value = options[key]
        if (value === undefined) continue

        applyKey(entry, key, value, handlers?.[key])
    }
}