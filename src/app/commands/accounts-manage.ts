import { AccountGiveFlow, BulkAccountGiveFlow } from "@/features/accounts/user-flows/account-give.js"
import { AccountTakeFlow } from "@/features/accounts/user-flows/account-take.js"
import { AccountUserInterface } from "@/features/accounts/user-interfaces/account-ui.js"
import { replyErrorMessage } from "@/lib/discord.js"
import { errorMessages } from "@/lib/localisation.js"
import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction } from "discord.js"








export const data = new SlashCommandBuilder()
    .setName('accounts-manage') 
    .setDescription('Manage your users')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName('view-account')
        .setDescription('View user\'s account')
        .addUserOption(option => option
            .setName('target')
            .setDescription('The user you want to see the account of')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('give')
        .setDescription('Give money to target')
        .addUserOption(option => option
            .setName('target')
            .setDescription('The user you want to give money')
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName('amount')
            .setDescription('The amount of money to give')
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('bulk-give')
        .setDescription('Give money to users with a certain role')
        .addRoleOption(option => option
            .setName('role')
            .setDescription('The role you want to give money to')
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName('amount')
            .setDescription('The amount of money to give')
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('take')
        .setDescription('Take money from target')
        .addUserOption(option => option
            .setName('target')
            .setDescription('The user you want to take money')
            .setRequired(true)    
        )
        .addNumberOption(option => option
            .setName('amount')
            .setDescription('The amount of money to take. If you want to take all target\'s money, you will be able to do it later')
            .setRequired(true)
            .setMinValue(1)
        )
    )

export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
    const subCommand = interaction.options.getSubcommand()

    switch (subCommand) {
        case 'view-account': {
            const user = interaction.options.getUser('target')
            if (!user) {
                replyErrorMessage(interaction, errorMessages().insufficientParameters)
                break
            }
    
            new AccountUserInterface(user).display(interaction)
            
            break
        }
        case 'give':
            new AccountGiveFlow().start(interaction)    
            break

        case 'bulk-give':
            new BulkAccountGiveFlow().start(interaction)
            break

        case 'take':
            new AccountTakeFlow().start(interaction)
            break
        default:
            await replyErrorMessage(interaction, errorMessages().invalidSubcommand)
            break
    }
}