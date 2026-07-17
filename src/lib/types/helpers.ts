export type MutableOrReadonly<T> = T | Readonly<T>
export type MutableOrReadonlyMap<K, V> = Map<K, V> | ReadonlyMap<K, V>

export type Simplify<T> = {
    [K in keyof T]: T[K]
}

type FunctionKeys<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any ? K : never;
}[keyof T];

export type AwaitedObjectResultReturn<
    T,
    K extends FunctionKeys<T>
> = 
    T[K] extends (...args: any) => any
        ? Awaited<ReturnType<T[K]>> extends [infer _, null]
        ? null
        : Awaited<ReturnType<T[K]>> extends [infer _, infer SuccessType]
            ? Exclude<SuccessType, null>
            : never
        : never;

