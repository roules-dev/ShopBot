import { JSONSchemaType } from "ajv";
import { Account, AccountsDatabaseJSONBody } from "./accounts-type";
import { ajv } from "../../api/middleware/ajv-instance";


const accountSchema: JSONSchemaType<AccountsDatabaseJSONBody> = {
    type: "object",
    propertyNames: {
        format: "snowflake"
    },
    patternProperties: {
        "": {
            type: "object",
            additionalProperties: false,
            properties: {
                currencies: {
                    type: "object",
                    propertyNames: {
                        format: "id"
                    },
                    patternProperties: {
                        "": {
                            type: "object",
                            required: ["item", "amount"],
                            properties: {
                                item: { type: "string", format: "id" },
                                amount: { type: "number" }
                            }
                        }

                    },
                    required: []
                },
                inventory: {
                    type: "object",
                    propertyNames: {
                        format: "id"
                    },
                    patternProperties: {
                        "": {
                            type: "object",
                            required: ["item", "amount"],
                            properties: {
                                item: {
                                    type: "object",
                                    required: ["id", "shopId"],
                                    properties: {
                                        id: { type: "string", format: "id" },
                                        shopId: { type: "string", format: "id" }
                                    }
                                },
                                amount: { type: "number" }
                            }
                        }
                    },
                    required: []
                }
            },
            required: ["currencies", "inventory"]
        }
    },
    additionalProperties: false,
    required: []
}

export const validateAccount = ajv.compile(accountSchema)
