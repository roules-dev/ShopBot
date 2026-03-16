import { SnowflakeSchema } from "@/schemas/utils.js";
import z from "zod";

const SettingVariantSchema = z.discriminatedUnion("type", [
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
        min: z.nullish(z.number()),
        max: z.nullish(z.number()),
    }), // add validation on the length of value based on if min and max exist ?

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
        options: z.union([
            z.array(z.string()),
            z.array(z.object({ label: z.string(), value: z.string() })),
        ]),
    })
])


export const SettingSchema = z.object({
    name: z.string()
}).and(SettingVariantSchema)

