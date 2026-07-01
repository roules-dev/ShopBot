import { t } from "@/core/i18n/i18n.js"
import { ok } from "@/lib/error-handling.js"
import { snowflakeSchema } from "@/schemas/utils.js"
import { bold, roleMention } from "discord.js"
import z from "zod"
import { ProductAction } from "./product-action.js"
import { ExtendedRoleSelectMenuComponent } from "@/lib/ui/components/select-menus.js"
import { createComponent } from "@/lib/ui/components/extended-components.js"

const giveRoleActionSchema = z.object({
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
    hydrate: (options) => ok({ kind: "give-role", options }),


    getMessage: (options) => t(
        `userFlows.productAdd.messages.actions.giveRole`, 
        { role: options?.roleId ? bold(roleMention(options.roleId)) : t("defaultComponents.selectRole") }
    ),

    getEditComponents: (flowId, callback) => {
        const roleSelectMenu = new ExtendedRoleSelectMenuComponent(
            {
                customId: `${flowId}+select-role`,
                placeholder: t("defaultComponents.selectRole"),
                time: 120_000
            },
            (interaction, selectedRoleId) => {
                callback(interaction, { kind: "give-role", options: { roleId: selectedRoleId } })
            }
        )

        return [
            createComponent(roleSelectMenu)
        ]
    }
}
