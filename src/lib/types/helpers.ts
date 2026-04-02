export type MutableOrReadonly<T> = T | Readonly<T>
export type MutableOrReadonlyMap<K, V> = Map<K, V> | ReadonlyMap<K, V>

export type Simplify<T> = {
    [K in keyof T]: T[K]
}