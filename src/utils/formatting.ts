import { Emojiable, Labelled } from "./types.js"

export function formattedEmojiableName(element: Labelled & Emojiable): string
export function formattedEmojiableName(element: Labelled & Emojiable | undefined | null): string | undefined
export function formattedEmojiableName(element: Labelled & Emojiable | undefined | null) {
    if (element === undefined || element === null) return undefined

    return `${element.emoji != "" ? `${element.emoji} ` : ""}${element.name}`
}
