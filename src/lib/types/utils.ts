export type Identifiable<Id extends string = string> = {
    id: Id
}

export type Labelled = {
    name: string
}

export type Emojiable<Emoji extends string = string> = {
    emoji?: Emoji | null
}

export type MutableOrReadonly<T> = T | Readonly<T>

export type MapKey<T> = T extends Map<infer K, unknown> ? K : never
export type MapValue<T> = T extends Map<unknown, infer V> ? V : never

export type Prettify<T> = {
    [K in keyof T]: T[K]
}

export type Exact<T, Shape> =
    T extends Shape
        ? Exclude<keyof T, keyof Shape> extends never
            ? T
            : never
        : never;