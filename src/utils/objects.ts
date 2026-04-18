export function stringifyObj(obj: object) {
    return (Object.keys(obj) as (keyof typeof obj)[]).map(key => `${key}: ${typeof obj[key] === "object" ? JSON.stringify(obj[key]) : obj[key]}`).join(", ")
}

export function objectEntries<K extends string, V>(obj: Record<K, V>) {
    return Object.entries(obj) as [K, V][]
}