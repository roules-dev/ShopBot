export type MapKey<T> = T extends Map<infer K, unknown> ? K : never
export type MapValue<T> = T extends Map<unknown, infer V> ? V : never