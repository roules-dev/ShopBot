import { validateEnum, validateMinMax } from "@/lib/validation/refinements.js";
import { snowflakeSchema } from "@/schemas/utils.js";
import z from "zod";

const BaseSetting = {
    name: z.string(),
}

function withBase<T extends z.ZodRawShape>(shape: T) {
    return z.object({
        ...BaseSetting,
        ...shape,
    })
}

export const settingVariantSchema = z.discriminatedUnion("kind", [
    withBase({
        id: z.string().brand("setting-string"),
        kind: z.literal("string"),
        value: z.nullable(z.string()),
    }),

    withBase({
        id: z.string().brand("setting-bool"),
        kind: z.literal("bool"),
        value: z.nullable(z.boolean()),
    }),

    withBase({
        id: z.string().brand("setting-number"),
        kind: z.literal("number"),
        value: z.nullable(z.number()),
        min: z.exactOptional(z.nullable(z.number())),
        max: z.exactOptional(z.nullable(z.number())),
    }), 

    withBase({
        id: z.string().brand("setting-channelId"),
        kind: z.literal("channelId"),
        value: z.nullable(snowflakeSchema),
    }),

    withBase({
        id: z.string().brand("setting-roleId"),
        kind: z.literal("roleId"),
        value: z.nullable(snowflakeSchema),
    }),

    withBase({
        id: z.string().brand("setting-userId"),
        kind: z.literal("userId"),
        value: z.nullable(snowflakeSchema),
    }),

    withBase({
        id: z.string().brand("setting-enum"),
        kind: z.literal("enum"),
        value: z.nullable(z.string()),
        options: z.array(
            z.object({ 
                label: z.string(), 
                value: z.string() 
            })
        )
    })
])

export const settingSchema = settingVariantSchema.superRefine((data, ctx) => {
    switch (data.kind) {
        case "number": 
            validateMinMax(data, ctx)
            break
        case "enum":
            validateEnum(data, ctx)
            break
    }
})
