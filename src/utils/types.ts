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