import { ApiError, DatabaseError } from "@/database/database.types.js"
import { Result } from "@/lib/error-handling.js"
import { GuildMember } from "discord.js"
import z from "zod"
import { HydrateAction } from "./product-actions.hydration.js"
import { Hydrator } from "@/core/database/hydrator.js"


export type ProductActionSchema<K extends string> = z.ZodObject<{
    kind: z.ZodLiteral<K>
    options: z.ZodObject<{ [key: string]: z.ZodType }>
}>


export type ProductAction<K extends string, S extends ProductActionSchema<K>> = {
    name: string
    kind: K
    schema: S

    execute(member: GuildMember, options: z.infer<S>["options"]): Promise<Result<string, DatabaseError | ApiError>>
    hydrate(options: z.infer<S>["options"], hydrator: Hydrator): Result<HydrateAction<z.infer<S>>, DatabaseError | ApiError>
    
    // TODO : something for how the action is created/edited
    
}