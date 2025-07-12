import { JSONSchemaType } from "ajv";
import { ajv } from "../../api/middleware/ajv-instance";
import { ProductJSONBody, ProductOptionsJSONBody, ShopOptionsJSONBody, ShopOptionsOptionalJSONBody } from "./shops-types";
import { makeOptionalSchema } from "../../utils/schemas";

const productSchema: JSONSchemaType<ProductJSONBody> = {
    $id: 'product',
    type: 'object',
    properties: {
        id: { type: 'string', format: 'id' },
        name: { type: 'string', minLength: 1, maxLength: 70 },
        description: { type: 'string', minLength: 0, maxLength: 300 },
        emoji: { type: 'string', format: 'emoji' },
        price: { type: 'number', minimum: 0 },
        amount: { type: 'number', minimum: 0, nullable: true },
        shopId: { type: 'string', format: 'id' },
        action: {
            type: "object",
            required: ["type", "options"],
            oneOf: [
                {
                    type: "object",
                    required: ["type", "options"],
                    properties: {
                        type: { const: "give-role" },
                        options: {
                            type: "object",
                            required: ["roleId"],
                            properties: {
                                roleId: { type: "string", format: "snowflake" }
                            },
                            additionalProperties: false
                        }
                    }
                },
                {
                    type: "object",
                    required: ["type", "options"],
                    properties: {
                        type: { const: "give-currency" },
                        options: {
                            type: "object",
                            required: ["currencyId", "amount"],
                            properties: {
                                currencyId: { type: "string" },
                                amount: { type: "number" }
                            },
                            additionalProperties: false
                        }
                    }
                }
            ],
            nullable: true
        }
    },
    additionalProperties: false,
    required: ['name', 'description', 'emoji', 'price', 'shopId']
}

export const validateProduct = ajv.compile(productSchema)



const shopOptionsSchema: JSONSchemaType<ShopOptionsJSONBody> = {
    type: 'object',
    properties: {
        name: { 
            type: 'string', 
            minLength: 1, maxLength: 120 
        },
        description: { 
            type: 'string', 
            minLength: 0, maxLength: 480 
        },
        emoji: { type: 'string', format: 'emoji' },
        currencyId: { type: 'string', format: 'id' },

        discountCodes: {
            type: "object",
            additionalProperties: false,
            propertyNames: { minLength: 6, maxLength: 8 },
            patternProperties: { "": { type: "number", minimum: 0, maximum: 100 } },
            required: [],
        },
        reservedTo: { type: "string", format: "snowflake", nullable: true },
        products: {
            type: "object",
            propertyNames: {format: "id" },
            patternProperties: {
                "": productSchema,
            },
            required: [],
            additionalProperties: false
        },
    },
    required: ['name', 'description', 'emoji', 'products', 'currencyId', 'discountCodes']
}

export const validateShop = ajv.compile(shopOptionsSchema)


const shopOptionsOptionalSchema: JSONSchemaType<ShopOptionsOptionalJSONBody> = makeOptionalSchema(shopOptionsSchema)

export const validateShopOptional = ajv.compile(shopOptionsOptionalSchema)
