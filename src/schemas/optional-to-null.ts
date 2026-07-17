import z from "zod"

/**
 * Creates a schema that accepts the provided schema, but treats 
 * undefined, null, or missing values as null.
 * 
 * @param schema - Any Zod schema to wrap
 * @returns A new schema that parses to T | null
 */
export const optionalOrNull = <T extends z.ZodType>(schema: T) => {
    return schema
        .optional()
        .nullable()
        .default(null)
}