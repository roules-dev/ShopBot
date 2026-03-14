export type Identifiable = {
    id: string // will be branded when Zod validation is implemented
}

export type Labelled = {
    name: string
}

export type Emojiable = {
    emoji?: string
}

export type MutableOrReadonly<T> = T | Readonly<T>

export type MapKey<T> = T extends Map<infer K, unknown> ? K : never
export type MapValue<T> = T extends Map<unknown, infer V> ? V : never

