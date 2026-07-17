import { t } from "@/core/i18n/i18n.js"
import { ITEM_DESCRIPTION_MAX_LENGTH, ITEM_NAME_MAX_LENGTH } from "@/features/items/schemas/items.schemas.js"
import { createItemFlow } from "@/features/items/ui/user-flows/item-create.js"
import { editItemParamsSchema, EditItemFlow } from "@/features/items/ui/user-flows/item-edit.js"
import { ItemRemoveFlow } from "@/features/items/ui/user-flows/item-remove.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
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
                    .setName("name")
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
                    .setName("description")
                    .setDescription("The new description of the item (leave empty to remove)")
                    .setMaxLength(ITEM_DESCRIPTION_MAX_LENGTH)
                    .setMinLength(1)
                )
            )
            .addSubcommand(subcommand => subcommand
                .setName("emoji")
                .setDescription("Change Emoji. You will select the item later")
                .addStringOption(option => option
                    .setName("emoji")
                    .setDescription("The new emoji of the item (leave empty to remove)")
                    .setRequired(false)
                )
            )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

    switch (subCommand) {
        case "create":
            await createItemFlow(interaction)
            break
        case "remove": {
            new ItemRemoveFlow().start(interaction)
            break 
        }
        default:
            if (subCommandGroup == "edit") {
                const [error, options] = validateCommandOptions(interaction.options, editItemParamsSchema, { kind: subCommand })
                if (error) return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
                    

                new EditItemFlow(options).start(interaction)
                return
            }

            await replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
    }
}