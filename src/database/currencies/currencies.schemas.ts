import { JSONSchemaType } from "ajv"
import { CurrencyOptions, CurrencyOptionsOptional } from "./currencies-types"
import { ajv } from "../../api/middleware/ajv-instance"
import { makeOptionalSchema } from "../../utils/schemas"

const currencyOptionsSchema: JSONSchemaType<CurrencyOptions> = {
    type: 'object',
    required: ['name', 'emoji'],
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 40, pattern: '^[a-zA-Z0-9 ]+$' },
        emoji: { type: 'string', format: 'emoji' }
    },
    additionalProperties: false
}
export const validateCurrency = ajv.compile(currencyOptionsSchema)


const currencyOptionsOptionalSchema: JSONSchemaType<CurrencyOptionsOptional> = makeOptionalSchema(currencyOptionsSchema)

export const validateCurrencyOptional = ajv.compile(currencyOptionsOptionalSchema)
