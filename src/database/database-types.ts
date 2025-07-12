export type Id = string

const DATABASE_ERRORS = {
    ShopDoesNotExist: {
        message: 'Shop does not exist',
        status: 404
    },
    ShopAlreadyExists: {
        message: 'Shop already exists',
        status: 409
    },
    InvalidPosition: {
        message: 'Invalid position',
        status: 400
    },

    CurrencyDoesNotExist: {
        message: 'Currency does not exist',
        status: 404
    },
    CurrencyAlreadyExists: {
        message: 'Currency already exists',
        status: 409
    },

    ProductDoesNotExist: {
        message: 'Product does not exist',
        status: 404
    },

    AccountDoesNotExist: {
        message: 'Account does not exist',
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

        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}

export interface DatabaseJSONBody {}

export abstract class Database {
    public path: string

    public constructor (databaseRaw: DatabaseJSONBody, path: string) {
        this.path = path
    }
    
    public abstract toJSON(): DatabaseJSONBody 
    
    protected abstract parseRaw(databaseRaw: DatabaseJSONBody): unknown 
}

