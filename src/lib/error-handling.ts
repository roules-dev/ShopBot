interface ErrorLike<N = string> {
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
export function err<const N extends string, E extends ErrorLike<N>>(
    errorOrMessage: E | { name: N } | string
) {

    if (typeof errorOrMessage === "string") {
        return [{ name: "Error typo", message: errorOrMessage }, null]
    }

    if ("message" in errorOrMessage) {
        return [errorOrMessage, null]
    }

    return [{ name: errorOrMessage.name, message: errorOrMessage.name }, null]
}

export function assertNeverReached(_: never): never {
    throw new Error("Did not expect to get here")
}
