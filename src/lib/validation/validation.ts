import z from "zod";
import { err, ok } from "../error-handling.js";

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



export function pathWithName(name: string | undefined, path: string[]) {
    return name != undefined ? [name, ...path] : path
}
