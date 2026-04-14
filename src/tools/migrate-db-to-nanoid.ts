import accounts from "@/../data/accounts.json" with { type: "json" }
import currencies from "@/../data/currencies.json" with { type: "json" }
import shops from "@/../data/shops.json" with { type: "json" }

import fs from "fs/promises"
import { nanoid } from "nanoid"
import { fileURLToPath } from "url"


const UUID_REGEXP = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

const save = async (path: string, content: object): Promise<boolean> => {
    try {
        await fs.writeFile(path, JSON.stringify(content, null, 4))
        return true
    } catch {
        return false
    }
}

const dbs = [
    {
        path: "data/currencies.json",
        dataString: JSON.stringify(currencies)
    },
    {
        path: "data/shops.json",
        dataString: JSON.stringify(shops)
    },
    {
        path: "data/accounts.json",
        dataString: JSON.stringify(accounts)
    }
]

export async function migrateDBtoNanoid() {
    const idsArray: string[] = []

    for (const { dataString } of dbs) {
        Array.prototype.push.apply(idsArray, [...dataString.matchAll(UUID_REGEXP)].map(match => match[0]))
    }

    const ids = new Set(idsArray)


    for (const id of ids) {
        const newId = nanoid()

        for (const db of dbs) {
            db.dataString = db.dataString.replaceAll(id, newId)
        }
    }


    for (const { dataString, path } of dbs) {
        if(!(await save(path, JSON.parse(dataString)))) return false
    }
    
    return true
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    for (const {path} of dbs) {
        const data = await fs.readFile(path, "utf-8")
        await fs.writeFile(path.replace(".json", ".backup.json"), data)
    }

    migrateDBtoNanoid()
}