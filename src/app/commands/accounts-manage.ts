import { t } from "@/core/i18n/i18n.js"
import { AccountGiveFlow, accountGiveParamsSchema, BulkAccountGiveFlow, bulkAccountGiveParamsSchema } from "@/features/accounts/ui/user-flows/account-give.js"
import { AccountTakeFlow, accountTakeParamsSchema } from "@/features/accounts/ui/user-flows/account-take.js"
import { AccountUserInterface } from "@/features/accounts/ui/user-interfaces/account-ui.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { validateOptionsAndStartFlow } from "../services/user-flow-launching.js"

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

const subCommandHandlers: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
    "view-account": async (interaction) => {
        const user = interaction.options.getUser("target")
        if (!user) {
            replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
            return
        }
        await new AccountUserInterface(user).display(interaction)
    },
    "give": async (interaction) => await validateOptionsAndStartFlow(interaction, accountGiveParamsSchema, AccountGiveFlow),
    "bulk-give": async (interaction) => await validateOptionsAndStartFlow(interaction, bulkAccountGiveParamsSchema, BulkAccountGiveFlow),
    "take": async (interaction) => await validateOptionsAndStartFlow(interaction, accountTakeParamsSchema, AccountTakeFlow)
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