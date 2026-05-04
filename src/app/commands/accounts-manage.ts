import { t } from "@/core/i18n/i18n.js"
import { accountGiveParamsSchema, AccountGiveFlow, bulkAccountGiveParamsSchema, BulkAccountGiveFlow } from "@/features/accounts/ui/user-flows/account-give.js"
import { accountTakeParamsSchema, AccountTakeFlow } from "@/features/accounts/ui/user-flows/account-take.js"
import { AccountUserInterface } from "@/features/accounts/ui/user-interfaces/account-ui.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
    .setName("accounts-manage") 
    .setDescription("Manage your users")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName("view-account")
        .setDescription("View user's account")
        .addUserOption(option => option
            .setName("target")
            .setDescription("The user you want to see the account of")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("give")
        .setDescription("Give money to target")
        .addUserOption(option => option
            .setName("target")
            .setDescription("The user you want to give money")
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName("amount")
            .setDescription("The amount of money to give")
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("bulk-give")
        .setDescription("Give money to users with a certain role")
        .addRoleOption(option => option
            .setName("role")
            .setDescription("The role you want to give money to")
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName("amount")
            .setDescription("The amount of money to give")
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("take")
        .setDescription("Take money from target")
        .addUserOption(option => option
            .setName("target")
            .setDescription("The user you want to take money")
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName("amount")
            .setDescription("The amount of money to take. If you want to take all target's money, you will be able to do it later")
            .setRequired(true)
            .setMinValue(1)
        )
    )

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()

    switch (subCommand) {
        case "view-account": {
            const user = interaction.options.getUser("target")
            if (!user) {
                replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
                break
            }
    
            new AccountUserInterface(user).display(interaction)
            
            break
        }
        case "give": {
            const [error, options] = validateCommandOptions(interaction.options, accountGiveParamsSchema)
            if (error) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

            new AccountGiveFlow(options).start(interaction)    
            break
        }

        case "bulk-give": {
            const [error, options] = validateCommandOptions(interaction.options, bulkAccountGiveParamsSchema)
            if (error) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

            new BulkAccountGiveFlow(options).start(interaction)
            break
        }
        case "take": {
            const [error, options] = validateCommandOptions(interaction.options, accountTakeParamsSchema)
            if (error) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

            new AccountTakeFlow(options).start(interaction)
            break
        }
        default:
            await replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
            break
    }
}