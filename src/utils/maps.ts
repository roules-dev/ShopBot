import { MutableOrReadonlyMap } from "@/lib/types/helpers.js";

export function subMap<T, U>(map: MutableOrReadonlyMap<T, U>, start: number, size: number): Map<T, U> {
    return new Map([...map].slice(start, start + size))
} 