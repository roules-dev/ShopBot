import z from "zod";
import { err, ok } from "./error-handling.js";

export function validate<T extends z.ZodType>(schema: T, input: unknown) {
    const res = schema.safeParse(input)

    if (res.success) {
        return ok(res.data)
    } else {
        return err(res.error)
    }
}

export function is<T extends z.ZodType>(schema: T, input: unknown): input is z.infer<T> {
    const res = schema.safeParse(input)
    return res.success
}



function pathWithName(name: string | undefined, path: string[]) {
    return name != undefined ? [name, ...path] : path
}

export function validateMinMax<
    T extends {
        name?: string
        value: number | null
        min?: number | null | undefined
        max?: number | null | undefined
    },
    C extends z.RefinementCtx
>(data: T, ctx: C) {

    if (
        data.min !== null && data.min !== undefined && 
        data.max !== null && data.max !== undefined && 
        data.min > data.max
    ) {
        ctx.addIssue({
            code: "too_big",
            maximum: data.max,
            message: "min cannot be greater than max",
            origin: "number",
            path: pathWithName(data.name, ["min"])
        })
    }

    if (data.value == null) return

    if (data.min !== null && data.min !== undefined && 
        data.value < data.min
    ) {
        ctx.addIssue({
            code: "too_small",
            minimum: data.min,
            origin: "number",
            message: "Value is below minimum",
            path: pathWithName(data.name, ["min"])
        })
    }

    if (data.max !== null && data.max !== undefined && 
        data.value > data.max
    ) {
        ctx.addIssue({
            code: "too_big",
            maximum: data.max,
            origin: "number",
            message: "Value is above maximum",
            path: pathWithName(data.name, ["max"])
        })
    }
}

export function validateEnum<
    T extends {
        name?: string
        value: string | null
        options: {
            value: string
            label: string
        }[]
    },
    C extends z.RefinementCtx
>(data: T, ctx: C) {
    if (data.options.length == 0) {
        ctx.addIssue({
            code: "too_small",
            minimum: 1,
            origin: "array",
            inclusive: true,
            message: "The list of options cannot be empty",
            path: pathWithName(data.name, ["options"])
        })
    }

    if (data.value != null) {
        if (data.options.find(option => option.value == data.value) == undefined)
        ctx.addIssue({
            code: "custom",
            message: `Option ${data.value} is not a valid option (valid: ${data.options.map(opt => opt.value).join(", ")})`,
            path: pathWithName(data.name, ["value"])
        })
    }
}
