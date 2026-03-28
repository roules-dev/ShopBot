export type MutableOrReadonly<T> = T | Readonly<T>

export type Simplify<T> = {
    [K in keyof T]: T[K]
}