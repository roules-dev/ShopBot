export type Result<S, E extends { message: string }> = [E, null] | [null, S]

export function ok<S>(value: S): Result<S, never> {
    return [null, value]
}

export function err<const R extends string, E extends { message: R }>(error: E): Result<never, E> {
    return [error, null]
}

export function assertNeverReached(_: never): never {
    throw new Error('Did not expect to get here')
}
