import { err, ok, Result } from "@/lib/error-handling.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { validate } from "@/lib/validation.js"
import { Identifiable } from "@/utils/types.js"
import { PathLike } from "fs"
import fs from "fs/promises"
import z from "zod"

export type NanoId = string

const DATABASE_ERRORS = {
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

export type DatabaseErrors = keyof typeof DATABASE_ERRORS
export class DatabaseError extends Error {
    status: number
    constructor(error: DatabaseErrors) {
        super(DATABASE_ERRORS[error].message)

        this.name = "DatabaseError"
        this.status = DATABASE_ERRORS[error].status

        Object.setPrototypeOf(this, DatabaseError.prototype)
    }
}


export type DatabaseJSONBody = Record<string, unknown>

export abstract class Database<IdType extends string, DataType> {
    public path: string
    public data: Map<IdType, DataType>


    public constructor (databaseRaw: DatabaseJSONBody, path: string) {
        this.path = path

        const [error, data] = this.parseRaw(databaseRaw)
        if (error) throw error

        this.data = data
    }
    
    public abstract toJSON(): DatabaseJSONBody 
    
    protected abstract parseRaw(databaseRaw: DatabaseJSONBody): Result<Map<IdType, DataType>, DatabaseError> 
    
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


type NoIdSchema<Schema extends z.ZodTypeAny> = z.infer<Schema> extends { id: any } ? never : Schema


export class Database2<IdSchema extends z.ZodStringFormat, DataItemJSONSchema extends z.ZodObject> {
    private idSchema: IdSchema
    
    private dataItemJSONSchema: DataItemJSONSchema

    private path: PathLike
    public data: Map<
        z.infer<IdSchema>, 
        { id: z.infer<IdSchema> } & z.infer<DataItemJSONSchema>
    >

    public constructor (databaseRaw: DatabaseJSONBody, path: PathLike, dataItemJSONSchema: NoIdSchema<DataItemJSONSchema>, idSchema: IdSchema) {
        this.path = path
        
        this.idSchema = idSchema
        this.dataItemJSONSchema = dataItemJSONSchema

        const [error, data] = this.parseRaw(databaseRaw)
        if (error) throw error

        this.data = data
    }
    
    public toJSON(): Record<string, z.infer<DataItemJSONSchema>> {
        const itemsJSON: Record<string, z.infer<DataItemJSONSchema>> = {}

        this.data.forEach((item, _) => {
            const { id, ...itemWithoutId } = item
            itemsJSON[id] = itemWithoutId as z.infer<DataItemJSONSchema>
            // the use of NoIdSchema in the constructor ensures that this assertion is always correct
        })

        return itemsJSON
    }
    
    protected parseRaw(databaseRaw: DatabaseJSONBody): Result<typeof this.data, DatabaseError> {
        const data: typeof this.data = new Map()

        for (const [_id, _dataItem] of Object.entries(databaseRaw)) {
            const [idError, id] = validate(this.idSchema, _id)

            if (idError) {
                PrettyLog.error(`Error parsing ${_id}\n${idError.message}`)
                continue
            }

            this.dataItemJSONSchema.parse(_dataItem)
            const [itemError, dataItem] = validate(this.dataItemJSONSchema, _dataItem)

            if (itemError) {
                PrettyLog.error(`Error parsing ${id}\n${itemError.message}`)
                continue
            }
            data.set(id, { id, ...dataItem })
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


