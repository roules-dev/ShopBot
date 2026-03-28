/**
 * Ensures T has no extra keys beyond Shape.
 */
export type Exact<T, Shape> =
    T extends Shape
        ? Exclude<keyof T, keyof Shape> extends never
            ? T
            : never
        : never;