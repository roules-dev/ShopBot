import { validateEnum, validateMinMax } from "@/lib/validation.js";
import { SnowflakeSchema } from "@/schemas/utils.js";
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

export const SettingVariantSchema = z.discriminatedUnion("type", [
    withBase({
        id: z.string().brand("setting-string"),
        type: z.literal("string"),
        value: z.nullable(z.string()),
    }),

    withBase({
        id: z.string().brand("setting-bool"),
        type: z.literal("bool"),
        value: z.nullable(z.boolean()),
    }),

    withBase({
        id: z.string().brand("setting-number"),
        type: z.literal("number"),
        value: z.nullable(z.number()),
        min: z.exactOptional(z.nullable(z.number())),
        max: z.exactOptional(z.nullable(z.number())),
    }), 

    withBase({
        id: z.string().brand("setting-channelId"),
        type: z.literal("channelId"),
        value: z.nullable(SnowflakeSchema),
    }),

    withBase({
        id: z.string().brand("setting-roleId"),
        type: z.literal("roleId"),
        value: z.nullable(SnowflakeSchema),
    }),

    withBase({
        id: z.string().brand("setting-userId"),
        type: z.literal("userId"),
        value: z.nullable(SnowflakeSchema),
    }),

    withBase({
        id: z.string().brand("setting-enum"),
        type: z.literal("enum"),
        value: z.nullable(z.string()),
        options: z.array(
            z.object({ 
                label: z.string(), 
                value: z.string() 
            })
        )
    })
])

export const SettingSchema = SettingVariantSchema.superRefine((data, ctx) => {
    switch (data.type) {
        case "number": 
            validateMinMax(data, ctx)
            break
        case "enum":
            validateEnum(data, ctx)
            break
    }
})
