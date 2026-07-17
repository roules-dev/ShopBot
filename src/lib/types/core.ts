export type Identifiable<Id extends string = string> = {
    id: Id
}

export type Labelled = {
    name: string
}

export type Emojiable<Emoji extends string = string> = {
    emoji?: Emoji | null
}