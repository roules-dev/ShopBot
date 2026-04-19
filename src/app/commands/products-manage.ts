import { t } from "@/core/i18n/i18n.js"
import { RemoveProductFlow } from "@/features/shops/user-flows/product-remove.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"

// TODO : product commands probably belongs to shops-manage command as a subcommand group instead of being a separate command

export const data = new SlashCommandBuilder()
    .setName("products-manage") 
    .setDescription("Manage your shop products")
    .addSubcommand(subcommand => subcommand
        .setName("add")
        .setDescription("Add a new product")
        .addNumberOption(option => option
            .setName("price")
            .setDescription("The price of the product")
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(0)
        )
        .addIntegerOption(option => option
            .setName("stock")
            .setDescription("The available stock for the product")
            .setRequired(false)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
        .addStringOption(option => option
            .setName("action")
            .setDescription("The action of the product")
            .setRequired(false)
            .addChoices(
                { name: "Give Role", value: "give-role" },
                { name: "Give Currency", value: "give-currency" }
            )
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
            .setName("price")
            .setDescription("Change Price. You will select the product later")
            .addNumberOption(option => option
                .setName("new-price")
                .setDescription("The new price of the product")
                .setRequired(true)
                .setMaxValue(99999999)
                .setMinValue(0)
            )
        )
        .addSubcommand(subcommand => subcommand 
            .setName("stock")
            .setDescription("Change Stock. You will select the product later")
            .addIntegerOption(option => option
                .setName("new-stock")
                .setDescription("The new stock of the product (-1 for unlimited)")
                .setRequired(true)
                .setMaxValue(99999999)
                .setMinValue(-1)
            )
        )
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
                await replyErrorMessage(interaction, "Not implemented yet")
                break
            }
            throw new Error("Not implemented yet")
            // TODO
            // new AddProductFlow().start(interaction)
            // break

        case "remove":
            new RemoveProductFlow().start(interaction)

            break
            
        default:
            if (subCommandGroup == "edit") {
                // const editProductFlow = new EditProductFlow()
                // editProductFlow.start(interaction)
                await replyErrorMessage(interaction, "Not implemented yet")
                
                break
            }

            await replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
    }
}