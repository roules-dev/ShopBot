import z from "zod"
import { loadAndParseEnv } from "./lib/env/dotenv-handler.js"

export const REQUIRED_DB_VERSION = 3

const envSchema = z.object({
    TOKEN: z.string().min(1, "Token is required"),
    CLIENT_ID: z.string().min(1, "Client ID is required"),
    NODE_ENV: z.enum(["development", "production"]).default("production")
})

export const env = envSchema.parse(loadAndParseEnv())