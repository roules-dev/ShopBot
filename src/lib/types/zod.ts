import z from "zod";

export type AnyStringSchema = z.ZodType<string, string>
export type RecordSchema = z.ZodType<Record<string, unknown>, Record<string, unknown>>