export interface ErrorLike<N = string> {
    name: N
    message: string
}

export type Result<S, E extends ErrorLike> = [E, null] | [null, S]

export function ok<S>(value: S): Result<S, never> {
    return [null, value]
}

export function err(message: string): Result<never, ErrorLike<"Error">>
export function err<const N extends string, E extends ErrorLike<N>>(error: E): Result<never, E>
export function err<const N extends string>(partialError: { name: N }): Result<never, ErrorLike<N>>
export function err<
    const N extends string, 
    T extends Record<string, unknown>
>(partialError: { name: N } & T): Result<never, ErrorLike<N> & Omit<T, 'name'>>

export function err<const N extends string, E extends ErrorLike<N>, T extends Record<string, unknown>>(
    errorOrMessage: E | { name: N } | { name: N } & T | string
) {

    if (typeof errorOrMessage === "string") {
        return [{ name: "Error", message: errorOrMessage }, null]
    }

    if ("message" in errorOrMessage) {
        return [errorOrMessage, null]
    }

    return [{ name: errorOrMessage.name, message: errorOrMessage.name }, null]
}

export function assertNeverReached(_: never): never {
    throw new Error("Did not expect to get here")
}
