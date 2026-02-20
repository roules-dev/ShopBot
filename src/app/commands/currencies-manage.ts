import { replyErrorMessage, replySuccessMessage } from "#root/src/lib/discord.js"
import { createCurrency } from "@/features/currencies/database/currencies-database.js"
import { CurrencyRemoveFlow, EditCurrencyFlow, EditCurrencyOption } from "@/features/currencies/user-flows/currencies-flows.js"
import { errorMessages, getLocale, replaceTemplates } from "@/lib/localisation.js"
import { EMOJI_REGEX } from "@/utils/constants.js"
import { bold, ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"


export const data = new SlashCommandBuilder()
    .setName('currencies-manage') 
    .setDescription('Manage your currencies')
    .addSubcommand(subcommand => subcommand
        .setName('create')
        .setDescription('Create a new currency')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The name of the currency')
            .setRequired(true)
            .setMaxLength(40)
            .setMinLength(1)
        )
        .addStringOption(option => option
            .setName('emoji')
            .setDescription('The emoji of the currency')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Remove the selected currency')
    )
    .addSubcommandGroup(group => group
        .setName('edit')
        .setDescription('Edit a currency')
        .addSubcommand(subcommand => subcommand
            .setName(EditCurrencyOption.NAME)
            .setDescription('Change Name. You will select the currency later')        
            .addStringOption(option => option
                .setName('new-name')
                .setDescription('The new name of the currency')
                .setRequired(true)
                .setMaxLength(40)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(EditCurrencyOption.EMOJI)
            .setDescription('Change Emoji. You will select the currency later')
            .addStringOption(option => option
                .setName('new-emoji')
                .setDescription('The new emoji of the currency (if you just want to remove it write anything)')
                .setRequired(true)
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    

export async function execute(client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

    switch (subCommand) {
        case 'create':
            await createCurrencyCommand(client, interaction)
            break
        case 'remove':
            new CurrencyRemoveFlow().start(interaction)
            break 
        default:
            if (subCommandGroup == 'edit') {
                const editCurrencyFlow = new EditCurrencyFlow()
                editCurrencyFlow.start(interaction)
                break
            }

            await replyErrorMessage(interaction, errorMessages().invalidSubcommand)
    }
}

export async function createCurrencyCommand(client: Client, interaction: ChatInputCommandInteraction): Promise<unknown> {
    const currencyName = interaction.options.getString('name')?.replaceSpaces()
    if (!currencyName) return replyErrorMessage(interaction, errorMessages().insufficientParameters)

    const emojiOption = interaction.options.getString('emoji')
    const emojiString = emojiOption?.match(EMOJI_REGEX)?.[0] || ''

    if (currencyName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, errorMessages().notOnlyEmojisInName)
    
    const [error, _] = await createCurrency(currencyName, emojiString)
    if (!error) {
        const currencyNameString = bold(`${emojiString ? `${emojiString} ` : ''}${currencyName}`)
        await replySuccessMessage(interaction, replaceTemplates(getLocale().userFlows.currencyCreate.messages.success, { currency: currencyNameString }))    

        return
    }
    
    await replyErrorMessage(interaction, error.message)

}

