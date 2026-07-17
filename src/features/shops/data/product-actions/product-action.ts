import { Hydrator } from "@/core/database/hydrator.js"
import { ApiError, DatabaseError } from "@/database/database.types.js"
import { Result } from "@/lib/error-handling.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { UIComponent } from "@/lib/ui/user-interfaces/user-interfaces.js"
import { GuildMember } from "discord.js"
import z from "zod"
import { HydratedAction } from "./product-actions.hydration.js"


export type ProductActionSchema<K extends string> = z.ZodObject<{
    kind: z.ZodLiteral<K>
    options: z.ZodObject<{ [key: string]: z.ZodType }>
}>


export type ProductAction<K extends string, S extends ProductActionSchema<K> = ProductActionSchema<K>> = {
    name: string
    kind: K
    schema: S

    execute(member: GuildMember, options: z.infer<S>["options"]): Promise<Result<string, DatabaseError | ApiError>>
    hydrate(options: z.infer<S>["options"], hydrator: Hydrator): Result<HydratedAction<z.infer<S>>, DatabaseError | ApiError>
    

    getMessage(options: Partial<z.infer<S>["options"]> | undefined, hydrator: Hydrator): string
    getEditComponents(
        flowId: string, 
        callback: (interaction: UserInterfaceInteraction, action: z.infer<S>) => void,
        update: (interaction: UserInterfaceInteraction) => void
    ): UIComponent[]
}