// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AbstractConstructor<T = unknown> = abstract new (...args: any[]) => T
