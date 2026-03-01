import { Database, DatabaseError, NanoId } from "@/database/database-types.js"
import { ok, Result } from "@/lib/error-handling.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { validate } from "@/lib/validation.js"
import z from "zod"
import { ItemActionSchema, ItemJSONSchema, ItemSchema } from "../schemas/items-schemas.js"

export type ItemAction = z.infer<typeof ItemActionSchema>
export type ItemActionType = ItemAction["type"]

export type Item = z.infer<typeof ItemSchema>
export type ItemJSON = z.infer<typeof ItemJSONSchema>

export class ItemsDatabase extends Database<NanoId, Item>  {
    public override toJSON() {
        const itemsJSON: Record<NanoId, ItemJSON> = {}

        this.data.forEach((item, _) => {
            const { id, ...itemWithoutId } = item
            itemsJSON[id] = itemWithoutId
        })

        return itemsJSON
    }

    public override parseRaw(databaseRaw: Record<string, object>): Result<Map<NanoId, Item>, DatabaseError> {
        const items = new Map<NanoId, Item>()
        
        for (const [_id, _item] of Object.entries(databaseRaw)) {
            const [error, id] = validate(z.nanoid(), _id)

            if (error) {
                PrettyLog.error(`at item ${_id}\n ${error.message}`)
                continue
            }

            const [error2, item] = validate(ItemJSONSchema, _item)

            if (error2) {
                PrettyLog.error(`at item ${id}\n ${error2.message}`)
                continue
            }

            items.set(id, { ...item, id})
        }

        return ok(items)
    }
}

