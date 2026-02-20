export function subMap<T, U>(map: Map<T, U>, start: number, size: number): Map<T, U> {
    return new Map([...map].slice(start, start + size))
} 