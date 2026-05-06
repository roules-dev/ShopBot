import { t } from "@/core/i18n/i18n.js"
import { BulkInventoryGiveFlow, bulkInventoryGiveParamsSchema, InventoryGiveFlow, inventoryGiveParamsSchema } from "@/features/accounts/ui/user-flows/inventory-give.js"
import { BulkInventoryRemoveItemFlow, bulkInventoryRemoveItemParamsSchema, InventoryTakeFlow, inventoryTakeParamsSchema } from "@/features/accounts/ui/user-flows/inventory-take.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction } from "discord.js"

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

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()

    switch (subCommand) {
        case "give": {
            const [error, options] = validateCommandOptions(interaction.options, inventoryGiveParamsSchema)
            if (error) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

            new InventoryGiveFlow(options).start(interaction)    
            break
        }

        case "bulk-give": {
            const [error, options] = validateCommandOptions(interaction.options, bulkInventoryGiveParamsSchema)
            if (error) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

            new BulkInventoryGiveFlow(options).start(interaction)
            break
        }
        case "take": {
            const [error, options] = validateCommandOptions(interaction.options, inventoryTakeParamsSchema)
            if (error) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

            new InventoryTakeFlow(options).start(interaction)
            break
        }
        case "bulk-remove-item": {
            const [error, options] = validateCommandOptions(interaction.options, bulkInventoryRemoveItemParamsSchema)
            if (error) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

            new BulkInventoryRemoveItemFlow(options).start(interaction)
            break
        }
        default:
            await replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
            break
    }
}