declare global {
    interface String {
        ellipsis(max: number) : string
        removeCustomEmojis() : string
        replaceSpaces(by?: string) : string
    }
}

String.prototype.ellipsis = function (this : string, max: number) {
    
    if (this.length > max) return `${this.substring(0, max - 1)}…`

    return this
}

String.prototype.removeCustomEmojis = function (this: string): string {
    
    return this.replace(/<:[a-zA-Z0-9_]{2,32}:[0-9]{17,19}>/g, "")
}

String.prototype.replaceSpaces = function (this: string, by: string = " "): string{
    // eslint-disable-next-line no-irregular-whitespace
    return this.replace(/[\s ]/g, by)
} 

export function toStringOrUndefined(value: unknown) {
    if (value === undefined) return undefined
    return `${value}`
}