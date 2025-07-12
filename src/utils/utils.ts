export function assertNeverReached(_: never): never {
    throw new Error('Did not expect to get here')
}

export function toStringOrUndefined(value: any) {
    if (value === undefined) return undefined
    return `${value}`
}