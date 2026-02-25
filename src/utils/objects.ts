export function objToString(obj: object): string {
    return (Object.keys(obj) as (keyof typeof obj)[]).map(key => `${key}: ${typeof obj[key] === 'object' ? JSON.stringify(obj[key]) : obj[key]}`).join(', ')
}