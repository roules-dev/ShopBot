import fs from "fs"
import { parseEnv } from "util"

type EnvRecord = Record<string, string | number | boolean | undefined>

export function recordToEnv(obj: EnvRecord): string {
    return Object.entries(obj)
        .map(([key, value]) => {
            const strValue = String(value)
            const quotedValue = /[^\w./\-]/.test(strValue) 
                ? `"${strValue}"` 
                : strValue

            return `${key.toUpperCase()}=${quotedValue}`
        })
        .join('\n')
}

export function saveEnvFile(obj: EnvRecord, filePath = '.env') {
    const envString = recordToEnv(obj)
    fs.writeFileSync(filePath, envString)
    
    console.log(`Saved ${filePath}`)
}

export function loadAndParseEnv(filePath = '.env'): EnvRecord {
    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        return parseEnv(content)
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error)
        return {}
    }
}