import { ITEM_DESCRIPTION_MAX_LENGTH, ITEM_NAME_MAX_LENGTH } from "@/features/items/schemas/items.schemas.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
    .setName("items-manage")
    .setDescription("Manage your available items")
    .addSubcommand(subcommand => subcommand
            .setName("create")
            .setDescription("Create a new item")
            .addStringOption(option => option
                .setName("name")
                .setDescription("The name of the item")
                .setRequired(true)
                .setMaxLength(ITEM_NAME_MAX_LENGTH)
                .setMinLength(1)
            )
            .addStringOption(option => option
                .setName("description")
                .setDescription("The description of the item")
                .setMaxLength(ITEM_DESCRIPTION_MAX_LENGTH)
                .setMinLength(1)
            )
            .addStringOption(option => option
                .setName("emoji")
                .setDescription("The emoji of the item")
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("remove")
            .setDescription("Remove the selected item")
        )
        .addSubcommandGroup(group => group
            .setName("edit")
            .setDescription("Edit an item")
            .addSubcommand(subcommand => subcommand
                .setName("name")
                .setDescription("Change Name. You will select the item later")        
                .addStringOption(option => option
                    .setName("new-name")
                    .setDescription("The new name of the item")
                    .setRequired(true)
                    .setMaxLength(ITEM_NAME_MAX_LENGTH)
                    .setMinLength(1)
                )
            )
            .addSubcommand(subcommand => subcommand
                .setName("description")
                .setDescription("Change Description. You will select the item later")
                .addStringOption(option => option
                    .setName("new-description")
                    .setRequired(true)
                    .setDescription("The new description of the item")
                    .setMaxLength(ITEM_DESCRIPTION_MAX_LENGTH)
                    .setMinLength(1)
                )
            )
            .addSubcommand(subcommand => subcommand
                .setName("emoji")
                .setDescription("Change Emoji. You will select the item later")
                .addStringOption(option => option
                    .setName("new-emoji")
                    .setDescription("The new emoji of the item (if you just want to remove it write anything)")
                    .setRequired(true)
                )
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    await replyErrorMessage(interaction, "Not implemented yet")
}