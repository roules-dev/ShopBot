import z from "zod";
import { err, ok } from "./error-handling.js";

export function validate<T extends z.ZodType>(schema: T, input: unknown) {
    const res = schema.safeParse(input)

    if (res.success) {
        return ok(res.data)
    } else {
        return err({ message: z.prettifyError(res.error) })
    }
}