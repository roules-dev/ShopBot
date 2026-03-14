import { err, ok, Result } from "@/lib/error-handling.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { validate } from "@/lib/validation.js"
import { MapKey, MapValue } from "@/utils/types.js"
import { PathLike } from "fs"
import fs from "fs/promises"
import z from "zod"

export type NanoId = string

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
    }
} as const


const DATABASE_ERRORS = {
    SaveError: {
        message: "Error saving database",
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

export abstract class Database<IdType extends string, DataType> {
    public path: string
    public data: Map<IdType, DataType>


    public constructor (databaseRaw: DatabaseJsonBody, path: string) {
        this.path = path

        const [error, data] = this.parseRaw(databaseRaw)
        if (error) throw error

        this.data = data
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


type NoIdSchema<Schema extends z.ZodTypeAny> = z.infer<Schema> extends { id: any } ? never : Schema


export class Database2<
    IdSchema extends z.ZodStringFormat, 
    DataItemRawSchema extends z.ZodObject<z.ZodRawShape>,  
> {
    private dataItemJsonSchema: DataItemRawSchema

    private data: Map<
        z.infer<IdSchema>, 
        z.infer<DataItemRawSchema>
    >

    public constructor (
        databaseRaw: DatabaseJsonBody, 
        private path: PathLike, 
        dataItemJsonSchema: NoIdSchema<DataItemRawSchema>, 
        private idSchema: IdSchema
    ) {
        this.dataItemJsonSchema = dataItemJsonSchema

        const [error, data] = this.parseRaw(databaseRaw)
        if (error) throw error

        this.data = data
    }

    public get(id: MapKey<typeof this.data>) {
        return this.data.get(id)
    }

    public async set(id: MapKey<typeof this.data>, dataItem: MapValue<typeof this.data>) {
        this.data.set(id, dataItem)
        const [error] = await this.save()
        if (error) return err(error)
        
        return ok(dataItem)
    }

    public entries() {
        return this.data.entries()
    }
    
    public toJSON(): Record<string, MapValue<typeof this.data>> {
        return Object.fromEntries(this.data)
    }
    
    protected parseRaw(databaseRaw: DatabaseJsonBody): Result<typeof this.data, ApiError> {
        const data: typeof this.data = new Map()

        for (const [_id, _dataItem] of Object.entries(databaseRaw)) {
            const [idError, id] = validate(this.idSchema, _id)

            if (idError) {
                PrettyLog.error(`Error parsing ${_id}\n${idError.message}`)
                continue
            }

            const [itemError, dataItem] = validate(this.dataItemJsonSchema, _dataItem)

            if (itemError) {
                PrettyLog.error(`Error parsing ${id}\n${itemError.message}`)
                continue
            }

            data.set(id, dataItem)
        }

        return ok(data)
    }
    
    public async save() {
        try {
            await fs.writeFile(this.path, JSON.stringify(this.toJSON(), null, 4))
    
            return ok(true)
        } catch (e) {
            if (e instanceof Error) return err(e)
            return err(new Error(`Unknown error while saving database ${this.path}`))
        }
    }
}


