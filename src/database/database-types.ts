import { Database } from "@/core/interfaces/database.js"
import { err, ok, Result } from "@/lib/error-handling.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { DeepReadonly, MapKey, MapValue } from "@/lib/types/index.js"
import { AnyStringSchema, RecordSchema } from "@/lib/types/zod.js"
import { validate } from "@/lib/validation.js"
import { NanoIdSchema } from "@/schemas/utils.js"
import { PathLike } from "fs"
import fs from "fs/promises"
import z from "zod"

export type NanoId = z.infer<typeof NanoIdSchema>

const API_ERRORS = { 
    ShopDoesNotExist: {
        message: "Shop does not exist",
        status: 404
    },
    ShopAlreadyExists: {
        message: "Shop already exists",
        status: 409
    },
    InvalidPosition: {
        message: "Invalid position",
        status: 400
    },

    CurrencyDoesNotExist: {
        message: "Currency does not exist",
        status: 404
    },
    CurrencyAlreadyExists: {
        message: "Currency already exists",
        status: 409
    },

    ItemDoesNotExist: {
        message: "Item does not exist",
        status: 404
    },
    ItemAlreadyExists: {
        message: "Item already exists",
        status: 409
    },

    ProductDoesNotExist: {
        message: "Product does not exist",
        status: 404
    },

    AccountDoesNotExist: {
        message: "Account does not exist",
        status: 404
    },

    InvalidSettingType: {
        message: "Provided setting type is invalid",
        status: 400
    },
    DuplicateSettingName: {
        message: "Provided setting name already exists",
        status: 400
    },
    UnexpectedError: {
        message: "Unexpected error",
        status: 500
    }
} as const


const DATABASE_ERRORS = {
    
    InvalidDatabase: {
        message: "Invalid database",
        status: 500
    },
    SaveError: {
        message: "Error saving database",
        status: 500
    },
    ObjectNotFound: {
        message: "Object not found",
        status: 404
    },
    UnexpectedError: {
        message: "Unexpected error",
        status: 500
    }
}

export class ApiError extends Error {
    public override name = "ApiError" as const
    status: number

    constructor(error: keyof typeof API_ERRORS) {
        super(API_ERRORS[error].message)

        this.status = API_ERRORS[error].status

        Object.setPrototypeOf(this, ApiError.prototype)
    }
}

export class DatabaseError extends Error {
    public override name = "DatabaseError" as const
    status: number

    constructor(error: keyof typeof DATABASE_ERRORS, path: PathLike, additionalMessage?: string) {
        const message = `${DATABASE_ERRORS[error].message}. Database: ${path}\n${additionalMessage}`
        super(message)

        this.status = DATABASE_ERRORS[error].status

        Object.setPrototypeOf(this, DatabaseError.prototype)
    }
}


export type DatabaseJsonBody = Record<string, unknown>

export abstract class DatabaseLegacy<
    IdType extends string, 
    DataType extends Record<string, unknown>
> implements Database<IdType, DataType> {
    public path: string
    public data: Map<IdType, DataType>


    public constructor (databaseRaw: DatabaseJsonBody, path: string) {
        this.path = path

        const [error, data] = this.parseRaw(databaseRaw)
        if (error) throw error

        this.data = data
    }

    public size() {
        return this.data.size
    }

    public get(id: MapKey<typeof this.data>) {
        const item = this.data.get(id)
        if (item === undefined) return undefined

        return item as DeepReadonly<MapValue<typeof this.data>>
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

    public async patch(id: MapKey<typeof this.data>, dataItemOptions: Partial<MapValue<typeof this.data>>) {
        const item = this.data.get(id)
        if (!item) return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))
        
        const updatedItem = { ...item, ...dataItemOptions }

        const [error, updated] = await this.set(id, updatedItem)
        if (error) return err(error)

        return ok(updated)
    }

    // quite elementary implementation, no validation, but this is legacy, it'll be replaced
    public async update(id: MapKey<typeof this.data>, fn: (draft: MapValue<typeof this.data>) => void) {
        const item = this.data.get(id)
        if (!item) return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))

        fn(item)

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
        return this.data as unknown as DeepReadonly<Map<MapKey<typeof this.data>, MapValue<typeof this.data>>>
    }

    public async reorder(id: MapKey<typeof this.data>, newIndex: number) {
        if (!this.data.has(id)) {
            return err(new DatabaseError("ObjectNotFound", this.path, `id: ${id}`))
        }
            
        if (newIndex < 0 || newIndex > this.size() - 1) return err(new ApiError("InvalidPosition"))
        
        const itemsArray = Array.from(this.data)
        const itemIndex = itemsArray.findIndex(([_id, ]) => _id === id)
        
        if (itemIndex === -1) return err(new ApiError("ShopDoesNotExist"))
        
        const [item] = itemsArray.splice(itemIndex, 1)
        if (item === undefined) return err(new ApiError("ShopDoesNotExist"))
    
        itemsArray.splice(newIndex, 0, item);
    
        this.data = new Map(itemsArray)
    
        const [error] = await this.save()
        if (error) return err(error)
    
        return ok(true)
    }

    
    public abstract toJSON(): DatabaseJsonBody 
    
    protected abstract parseRaw(databaseRaw: DatabaseJsonBody): Result<Map<IdType, DataType>, ApiError> 
    
    public async save()  {
        try {
            await fs.writeFile(this.path, JSON.stringify(this.toJSON(), null, 4))
    
            return ok(true)
        } catch (e) {
            let message = `Unknown error while saving database ${this.path}`
            if (e instanceof Error) {
                message = e.message
            }
            return err(new DatabaseError("SaveError", this.path, message))
        }
    }
}

// ---
// implementation for next version

export interface Balance<T> {
    resource: T 
    amount: number
}

export class JsonDatabase<
    IdSchema extends AnyStringSchema, 
    DataItemRawSchema extends RecordSchema,  
> implements Database<z.infer<IdSchema>, z.infer<DataItemRawSchema>> {
    private path: PathLike
    private dataItemJsonSchema: DataItemRawSchema

    private idSchema: IdSchema

    private data: Map<
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

    private toJSON(): Record<string, MapValue<typeof this.data>> {
        return Object.fromEntries(this.data)
    }
    
    private parseRaw(databaseRaw: DatabaseJsonBody): Result<typeof this.data, DatabaseError> {
        const data: typeof this.data = new Map()
        const errors: string[] = []

        for (const [_id, _dataItem] of Object.entries(databaseRaw)) {
            const [idError, id] = validate(this.idSchema, _id)

            if (idError) {
                errors.push(`Invalid id "${_id}": ${idError.message}`)
                continue
            }

            const [itemError, dataItem] = validate(this.dataItemJsonSchema, _dataItem)

            if (itemError) {
                errors.push(`Error parsing ${id}\n${itemError.message}`)
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
    
    private async save() {
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


