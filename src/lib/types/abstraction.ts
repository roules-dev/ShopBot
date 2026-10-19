// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AbstractConstructor<T = unknown> = abstract new (...args: any[]) => T

export type SingleArgAbstractConstructor<T = unknown, A = unknown> = abstract new (arg: A) => T