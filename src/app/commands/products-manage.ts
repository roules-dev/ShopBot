import { t } from "@/core/i18n/i18n.js"
import { productActions } from "@/features/shops/data/product-actions/index.js"
import { AddProductFlow, addProductParamsSchema } from "@/features/shops/user-flows/product-add.js"
import { EditProductFlow, editProductParamsSchema } from "@/features/shops/user-flows/product-edit.js"
import { RemoveProductFlow } from "@/features/shops/user-flows/product-remove.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"

// TODO : product commands probably belongs to shops-manage command as a subcommand group instead of being a separate command

const productActionsChoices = Object.entries(productActions).map(([key, value]) => {
    return { name: value.name, value: key}
})

export const data = new SlashCommandBuilder()
    .setName("products-manage") 
    .setDescription("Manage your shop products")
    .addSubcommand(subcommand => subcommand
        .setName("add")
        .setDescription("Add a new product")
        .addIntegerOption(option => option
            .setName("stock")
            .setDescription("The available stock for the product")
            .setRequired(false)
            .setMinValue(1)
        )
        .addStringOption(option => option
            .setName("action")
            .setDescription("The action of the product")
            .setRequired(false)
            .addChoices(productActionsChoices)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("remove")
        .setDescription("Remove a product")
    )
    .addSubcommandGroup(subcommandgroup => subcommandgroup
        .setName("edit")
        .setDescription("Edit a product")
        .addSubcommand(subcommand => subcommand 
            .setName("stock")
            .setDescription("Change Stock. You will select the product later")
            .addIntegerOption(option => option
                .setName("stock")
                .setDescription("The new stock of the product (leave empty for unlimited)")
                .setRequired(false)
                .setMinValue(0)
            )
        )
        // TODO : Action edit
        // TODO : Price edit
        // TODO : Item edit
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

    switch (subCommand) {
        case "add":
            if (interaction.options.getString("action") != null) {
                // const addActionProductFlow = new AddActionProductFlow()
                // addActionProductFlow.start(interaction)
                // TODO add action product
                await replyErrorMessage(interaction, "Not implemented yet")
                break
            }
            const [error, options] = validateCommandOptions(interaction.options, addProductParamsSchema)
            if (error) return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

            new AddProductFlow(options).start(interaction)
            break

        case "remove":
            new RemoveProductFlow().start(interaction)

            break
            
        default:
            if (subCommandGroup == "edit") {
                const [error, options] = validateCommandOptions(interaction.options, editProductParamsSchema, { kind: subCommand })
                if (error) return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
                
                new EditProductFlow(options).start(interaction)
                break
            }

            await replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
    }
}