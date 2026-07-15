import { t } from "@/core/i18n/i18n.js"
import { BulkInventoryGiveFlow, bulkInventoryGiveParamsSchema, InventoryGiveFlow, inventoryGiveParamsSchema } from "@/features/accounts/ui/user-flows/inventory-give.js"
import { BulkInventoryRemoveItemFlow, bulkInventoryRemoveItemParamsSchema, InventoryTakeFlow, inventoryTakeParamsSchema } from "@/features/accounts/ui/user-flows/inventory-take.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction } from "discord.js"
import { validateOptionsAndStartFlow } from "../services/user-flow-launching.js"

export const data = new SlashCommandBuilder()
    .setName("inventories-manage") 
    .setDescription("Manage your users' inventories")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName("give")
        .setDescription("Give an item to target")
        .addUserOption(option => option
            .setName("target")
            .setDescription("The user you want to give the item")
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName("amount")
            .setDescription("The amount of the item to give")
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("bulk-give")
        .setDescription("Give an item to users with a certain role")
        .addRoleOption(option => option
            .setName("role")
            .setDescription("The role you want to give the item to")
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName("amount")
            .setDescription("The amount of the item to give to each member")
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("take")
        .setDescription("Take an item from target")
        .addUserOption(option => option
            .setName("target")
            .setDescription("The user you want to take the item from")
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName("amount")
            .setDescription("The amount of the item to take. If you want to take everything, you will be able to do it later")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("bulk-remove-item")
        .setDescription("Remove an item from users with a certain role")
        .addRoleOption(option => option
            .setName("role")
            .setDescription("The role you want to remove the item from")
            .setRequired(true)    
        )
    )


const subCommandHandlers: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
    "give": async (interaction) => 
        await validateOptionsAndStartFlow(interaction, inventoryGiveParamsSchema, InventoryGiveFlow),
    "bulk-give": async (interaction) => 
        await validateOptionsAndStartFlow(interaction, bulkInventoryGiveParamsSchema, BulkInventoryGiveFlow),
    "take": async (interaction) => 
        await validateOptionsAndStartFlow(interaction, inventoryTakeParamsSchema, InventoryTakeFlow),
    "bulk-remove-item": async (interaction) => 
        await validateOptionsAndStartFlow(interaction, bulkInventoryRemoveItemParamsSchema, BulkInventoryRemoveItemFlow)
}


export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()

    const handler = subCommandHandlers[subCommand]
    if (handler) {
        await handler(interaction)
    } else {
        await replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
    }
}