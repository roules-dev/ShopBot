export function assertNeverReached(_x: never): never {
    throw new Error('Did not expect to get here')
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toStringOrUndefined(value: any) {
    if (value === undefined) return undefined
    return `${value}`
}