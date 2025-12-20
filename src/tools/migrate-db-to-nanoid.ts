import currencies from '../../data/currencies.json' with { type: 'json' }
import shops from '../../data/shops.json' with { type: 'json' }
import accounts from '../../data/accounts.json' with { type: 'json' }

import { nanoid } from 'nanoid'
import fs from 'fs/promises'


const UUID_REGEXP = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

const save = (path: string, content: object) => new Promise<boolean>(async (resolve, _reject) => {
    try {
        await fs.writeFile(path, JSON.stringify(content, null, 4))

        resolve(true)
    } catch (error) {
        resolve(false)
    }
})  



const dbs = [
    {
        path: 'data/currencies.json',
        dataString: JSON.stringify(currencies)
    },
    {
        path: 'data/shops.json',
        dataString: JSON.stringify(shops)
    },
    {
        path: 'data/accounts.json',
        dataString: JSON.stringify(accounts)
    }
]

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
    save(path, JSON.parse(dataString))
}