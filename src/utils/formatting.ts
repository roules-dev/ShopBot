import { Emojiable, Labelled } from "@/lib/types/index.js"
import { objectEntries } from "./objects.js"

export function formattedEmojiableName(element: Labelled & Emojiable): string
export function formattedEmojiableName(element: Labelled & Emojiable | undefined | null): string | undefined
export function formattedEmojiableName(element: Labelled & Emojiable | undefined | null) {
    if (element === undefined || element === null) return undefined

    return `${element.emoji ? `${element.emoji} ` : ""}${element.name}`
}


export function getDisplayOptionValue<T extends { kind: string } & Record<string, unknown>>(
    option: T,
    unset: string
): string {
    const valueEntry = objectEntries(option).find(([key]) => key === option.kind)

    if (valueEntry === undefined) {
        throw new Error(`Unexpected Error: Option ${option.kind} not found`)
    }

    const [_, value] = valueEntry

    if (value === null || value === undefined) {
        return unset
    }

    return `${value}`
}