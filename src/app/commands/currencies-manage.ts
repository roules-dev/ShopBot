import { t } from "@/core/i18n/i18n.js"
import { CURRENCY_NAME_MAX_LENGTH } from "@/features/currencies/schemas/currencies.schemas.js"
import { createCurrencyFlow } from "@/features/currencies/user-flows/currency-create.js"
import { EditCurrencyFlow, EditCurrencyParamsSchema } from "@/features/currencies/user-flows/currency-edit.js"
import { CurrencyRemoveFlow } from "@/features/currencies/user-flows/currency-remove.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"


export const data = new SlashCommandBuilder()
    .setName("currencies-manage") 
    .setDescription("Manage your currencies")
    .addSubcommand(subcommand => subcommand
        .setName("create")
        .setDescription("Create a new currency")
        .addStringOption(option => option
            .setName("name")
            .setDescription("The name of the currency")
            .setRequired(true)
            .setMaxLength(CURRENCY_NAME_MAX_LENGTH)
            .setMinLength(1)
        )
        .addStringOption(option => option
            .setName("emoji")
            .setDescription("The emoji of the currency")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("remove")
        .setDescription("Remove the selected currency")
    )
    .addSubcommandGroup(group => group
        .setName("edit")
        .setDescription("Edit a currency")
        .addSubcommand(subcommand => subcommand
            .setName("name")
            .setDescription("Change Name. You will select the currency later")        
            .addStringOption(option => option
                .setName("name")
                .setDescription("The new name of the currency")
                .setRequired(true)
                .setMaxLength(CURRENCY_NAME_MAX_LENGTH)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("emoji")
            .setDescription("Change Emoji. You will select the currency later")
            .addStringOption(option => option
                .setName("emoji")
                .setDescription("The new emoji of the currency (leave empty to remove)")
                .setRequired(false)
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

    switch (subCommand) {
        case "create":
            await createCurrencyFlow(interaction)
            break
        case "remove": {
            new CurrencyRemoveFlow().start(interaction)
            break 
        }
        default:
            if (subCommandGroup == "edit") {
                const [error, options] = validateCommandOptions(interaction.options, EditCurrencyParamsSchema)
                if (error) return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

                new EditCurrencyFlow(options).start(interaction)
                return
            }

            await replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
    }
}