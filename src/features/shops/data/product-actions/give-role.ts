import { SnowflakeSchema } from "@/schemas/utils.js"
import z from "zod"
import { ProductAction } from "./product-action.js"
import { t } from "@/core/i18n/i18n.js"
import { bold, roleMention } from "discord.js"
import { ok } from "@/lib/error-handling.js"

export const giveRoleActionSchema = z.object({
    kind: z.literal("give-role"),
    options: z.object({
        roleId: SnowflakeSchema
    })
})


export const giveRoleProductAction: ProductAction<"give-role", typeof giveRoleActionSchema> = {
    name: "Give Role",
    kind: "give-role" as const,
    schema: giveRoleActionSchema,
    execute: async (member, { roleId }) => {
            await member.roles.add(roleId)

            return ok(t(
                `userInterfaces.buy.actionProducts.giveRole.message`, 
                { role: bold(roleMention(roleId)) }
            ))
    },
    hydrate: (options) => ok({ kind: "give-role", options })
}
