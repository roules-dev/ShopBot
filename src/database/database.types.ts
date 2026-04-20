import { NanoIdSchema } from "@/schemas/utils.js"
import { PathLike } from "fs"
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

export interface Balance<T> {
    resource: T 
    amount: number
}
