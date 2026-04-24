export function stringifyObj(obj: object) {
    return (Object.keys(obj) as (keyof typeof obj)[]).map(key => `${key}: ${typeof obj[key] === "object" ? JSON.stringify(obj[key]) : obj[key]}`).join(", ")
}


// type Entries<T> = {
//     [K in keyof T]: [K, T[K]];
// }[keyof T][];

// export function objectEntries<T extends Record<string, unknown>>(obj: T): Entries<T> {
//   return Object.entries(obj) as Entries<T>;
// }

export function objectEntries<K extends string, V>(obj: Record<K, V>) {
    return Object.entries(obj) as [K, V][]
}
