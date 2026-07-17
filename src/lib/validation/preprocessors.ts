import z from "zod";
import { is } from "./validation.js";

function isRecord(val: unknown) {
    return is(z.record(z.string(), z.unknown()), val)
}

export function withSingleKeyKind<T extends z.ZodType>(schema: T, discriminator: string = "kind") {
    const preprocessed = z.preprocess((val, ctx) => {
        if (!isRecord (val)) {
            ctx.addIssue({
                code: "invalid_type",
                expected: "object",
                received: Array.isArray(val) ? "array" : typeof val,
                path: [],
                message: "Input must be a plain object",
            });

            return z.NEVER;
        }

        const keys = Object.keys(val)
        if (keys.length !== 1) {
            ctx.addIssue({
                code: "custom",
                message: "Only one key is allowed",
                path: [],
            });
            
            return z.NEVER
        }

        const key = keys[0]

        return { [discriminator]: key, ...val }
    }, schema)

    return preprocessed
}