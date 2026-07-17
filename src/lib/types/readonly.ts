type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type DeepReadonly<T> =
    T extends Primitive
        ? T

    : T extends (...args: any[]) => any
        ? T

    : T extends Promise<infer U>
        ? Promise<DeepReadonly<U>>

    : T extends Map<infer K, infer V> | ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>

    : T extends Set<infer U> | ReadonlySet<infer U>
        ? ReadonlySet<DeepReadonly<U>>

    : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepReadonly<U>>

    : T extends Date | RegExp | Error
        ? T

    : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }

    : T

