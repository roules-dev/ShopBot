import fs from "fs/promises"
import { Database } from "@/core/interfaces/database.js"
import { err, ok, Result } from "@/lib/error-handling.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { MapKey, MapValue } from "@/lib/types/collections.js"
import { DeepReadonly } from "@/lib/types/readonly.js"
import { AnyStringSchema, RecordSchema } from "@/lib/types/zod.js"
import { validate } from "@/lib/validation.js"
import { PathLike } from "fs"
import z from "zod"
import { DatabaseJsonBody, DatabaseError, ApiError } from "./database-types.js"

export class JsonDatabase<
    IdSchema extends AnyStringSchema, 
    DataItemRawSchema extends RecordSchema,  
> implements Database<z.infer<IdSchema>, z.infer<DataItemRawSchema>> {
    private path: PathLike
    private dataItemJsonSchema: DataItemRawSchema

    private idSchema: IdSchema

    protected data: Map<
        z.infer<IdSchema>, 
        z.infer<DataItemRawSchema>
    >

    public constructor (
        databaseRaw: DatabaseJsonBody, 
        path: PathLike, 
        dataItemJsonSchema: DataItemRawSchema, 
        idSchema: IdSchema
    ) {
        this.path = path
        this.dataItemJsonSchema = dataItemJsonSchema
        this.idSchema = idSchema

        const [error, data] = this.parseRaw(databaseRaw)
        if (error) throw error

        this.data = data
    }

    public get(id: MapKey<typeof this.data>) {
        const item = this.data.get(id)
        if (item === undefined) return undefined

        return this.data.get(id) as DeepReadonly<MapValue<typeof this.data>>
    }

    public async set(
        id: MapKey<typeof this.data>, 
        dataItem: MapValue<typeof this.data>
    ) {
        this.data.set(id, dataItem)
        const [error] = await this.save()
        if (error) return err(error)
        
        return ok(Object.freeze({...dataItem}) as DeepReadonly<MapValue<typeof this.data>>)
    }

    public async patch(id: MapKey<typeof this.data>, dataItem: Partial<MapValue<typeof this.data>>) {
        const item = this.data.get(id)
        if (!item) return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))
        
        const updatedItem = {...item, ...dataItem}

        const [error, updated] = await this.set(id, updatedItem)
        if (error) return err(error)

        return ok(updated)
    }

    // TODO : add (partial) validation, mutation tracking, rollback on error 
    public async update(id: MapKey<typeof this.data>, fn: (draft: MapValue<typeof this.data>) => void) {
        const item = this.data.get(id)
        if (!item) return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))
        
        try {
            fn(item)

            // TODO : validate item after update, if invalid, throw error with validation details

        } catch (e) {
            // TODO : rollback
            if (e instanceof Error) {
                return err(e)
            }
            return err(new DatabaseError("UnexpectedError", this.path, `Unknown error during update function execution: ${JSON.stringify(e)}`))
        }

        const [error, updated] = await this.set(id, item)
        if (error) return err(error)

        return ok(updated)
    }

    public async delete(id: MapKey<typeof this.data>) {
        if (!this.data.has(id)) {
            return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))
        }

        const backup = new Map(this.data)

        this.data.delete(id)

        const [error] = await this.save()
        if (error) {
            this.data = backup
            return err(error)
        }

        return ok(true)
    }

    public list() {
        return this.data as DeepReadonly<Map<MapKey<typeof this.data>, MapValue<typeof this.data>>>
    }

    // not a big fan of this function being in the database class
    public async reorder(id: MapKey<typeof this.data>, newIndex: number) {
        if (!this.data.has(id)) {
            return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))
        }
            
        if (newIndex < 0 || newIndex > this.size() - 1) return err(new ApiError("InvalidPosition"))
        
        const itemsArray = Array.from(this.data)
        const itemIndex = itemsArray.findIndex(([_id, ]) => _id === id)
        
        if (itemIndex === -1) return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))
        
        const [item] = itemsArray.splice(itemIndex, 1)
        if (item === undefined) return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))
    
        itemsArray.splice(newIndex, 0, item);
    
        this.data = new Map(itemsArray)
    
        const [error] = await this.save()
        if (error) return err(error)
    
        return ok(true)
    }

    
    public size(): number {
        return this.data.size
    }

    protected toJSON(): Record<string, MapValue<typeof this.data>> {
        return Object.fromEntries(this.data)
    }
    
    protected parseRaw(databaseRaw: DatabaseJsonBody): Result<typeof this.data, DatabaseError> {
        const data: typeof this.data = new Map()
        const errors: string[] = []

        for (const [_id, _dataItem] of Object.entries(databaseRaw)) {
            const [idError, id] = validate(this.idSchema, _id)

            if (idError) {
                errors.push(`Invalid id "${_id}": ${z.prettifyError(idError)}`)
                continue
            }

            const [itemError, dataItem] = validate(this.dataItemJsonSchema, _dataItem)

            if (itemError) {
                errors.push(`Error parsing ${id}\n${z.prettifyError(itemError)}`)
                continue
            }

            data.set(id, dataItem)
        }

        if (data.size === 0 && errors.length > 0) {
            return err(new DatabaseError(
                "InvalidDatabase",
                this.path,
                `All entries failed validation:\n${errors.join("\n")}`
            ))
        }

        if (errors.length > 0) {
            PrettyLog.warn(`Some entries failed to load:\n${errors.join("\n")}`)
        }

        return ok(data)
    }


    private writeLock: Promise<void> = Promise.resolve()
    
    protected async save() {
        this.writeLock = this.writeLock.then(async () => {
            try {
                const tempPath = `${this.path}.tmp`

                await fs.writeFile(tempPath, JSON.stringify(this.toJSON(), null, 4))
                await fs.rename(tempPath, this.path)

            } catch (e) {
                throw e instanceof Error
                    ? e
                    : new Error(`Unknown error while saving database ${this.path}`)
            }
        })

        try {
            await this.writeLock
            return ok(true)
        } catch (e) {
            if (e instanceof Error) return err(e)
            return err(new Error(`Unknown error while saving database ${this.path}`))
        }
    }
}


