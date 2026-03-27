import { validateEnum, validateMinMax } from "@/lib/validation.js";
import { SnowflakeSchema } from "@/schemas/utils.js";
import z from "zod";

export const SettingVariantSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("string"),
        value: z.nullable(z.string()),
    }),

    z.object({
        type: z.literal("bool"),
        value: z.nullable(z.boolean()),
    }),

    z.object({
        type: z.literal("number"),
        value: z.nullable(z.number()),
        min: z.exactOptional(z.nullable(z.number())),
        max: z.exactOptional(z.nullable(z.number())),
    }), 

    z.object({
        type: z.literal("channelId"),
        value: z.nullable(SnowflakeSchema),
    }),

    z.object({
        type: z.literal("roleId"),
        value: z.nullable(SnowflakeSchema),
    }),

    z.object({
        type: z.literal("userId"),
        value: z.nullable(SnowflakeSchema),
    }),

    z.object({
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


export const SettingSchema = z.object({
    name: z.string()
}).and(SettingVariantSchema).superRefine((data, ctx) => {
    switch (data.type) {
        case "number": 
            validateMinMax(data, ctx)
            break
        case "enum":
            validateEnum(data, ctx)
            break
    }
})

