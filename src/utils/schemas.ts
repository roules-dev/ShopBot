import { JSONSchemaType } from "ajv";

export function makeOptionalSchema<T>(schema: JSONSchemaType<T>): JSONSchemaType<Partial<T>> {
    const optionalSchema = JSON.parse(JSON.stringify(schema));

    delete optionalSchema.required
    optionalSchema.required = []

    for (const key in optionalSchema.properties) {
        optionalSchema.properties[key].nullable = true
    }

    return optionalSchema as JSONSchemaType<Partial<T>>;
}