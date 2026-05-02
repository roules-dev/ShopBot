import { t } from "@/core/i18n/i18n.js"
import { ok } from "@/lib/error-handling.js"
import { snowflakeSchema } from "@/schemas/utils.js"
import { bold, roleMention } from "discord.js"
import z from "zod"
import { ProductAction } from "./product-action.js"

export const giveRoleActionSchema = z.object({
    kind: z.literal("give-role"),
    options: z.object({
        roleId: snowflakeSchema
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
