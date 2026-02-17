import { PRODUCT_ACTION_TYPE } from "@/features/shops/database/products-types.js"
import { AddActionProductFlow, AddProductFlow, EditProductFlow, EditProductOption, RemoveProductFlow } from "@/features/shops/user-flows/product-flows.js"
import { errorMessages } from "@/lib/localisation.js"
import { replyErrorMessage } from "@/utils/discord.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"


export const data = new SlashCommandBuilder()
    .setName('products-manage') 
    .setDescription('Manage your products')
    .addSubcommand(subcommand => subcommand
        .setName('add')
        .setDescription('Add a new product')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The name of the product')
            .setRequired(true)
            .setMaxLength(70)
            .setMinLength(1)
        )
        .addNumberOption(option => option
            .setName('price')
            .setDescription('The price of the product')
            .setRequired(true)
            .setMaxValue(99999999)
            .setMinValue(0)
        )
        .addStringOption(option => option
            .setName('description')
            .setDescription('The description of the product')
            .setMaxLength(300)
            .setMinLength(1)
        )
        .addStringOption(option => option
            .setName('emoji')
            .setDescription('The emoji of the product')
            .setRequired(false)
        )
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('The amount of the product')
            .setRequired(false)
            .setMaxValue(99999999)
            .setMinValue(1)
        )
        .addStringOption(option => option
            .setName('action')
            .setDescription('The action of the product')
            .setRequired(false)
            .addChoices(
                { name: 'Give Role', value: PRODUCT_ACTION_TYPE.GiveRole },
                { name: 'Give Currency', value: PRODUCT_ACTION_TYPE.GiveCurrency }
            )
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Remove a product')
    )
    .addSubcommandGroup(subcommandgroup => subcommandgroup
        .setName('edit')
        .setDescription('Edit a product')
        .addSubcommand(subcommand => subcommand
            .setName(EditProductOption.NAME)
            .setDescription('Change Name. You will select the product later')
            .addStringOption(option => option
                .setName('new-name')
                .setDescription('The new name of the product')
                .setRequired(true)
                .setMaxLength(70)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(EditProductOption.DESCRIPTION)
            .setDescription('Change Description. You will select the product later')
            .addStringOption(option => option
                .setName('new-description')
                .setRequired(true)
                .setDescription('The new description of the product')
                .setMaxLength(300)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(EditProductOption.PRICE)
            .setDescription('Change Price. You will select the product later')
            .addNumberOption(option => option
                .setName('new-price')
                .setDescription('The new price of the product')
                .setRequired(true)
                .setMaxValue(99999999)
                .setMinValue(0)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName(EditProductOption.EMOJI)
            .setDescription('Change Emoji. You will select the product later')
            .addStringOption(option => option
                .setName('new-emoji')
                .setDescription('The new emoji of the product (if you just want to remove it write anything)')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand 
            .setName(EditProductOption.AMOUNT)
            .setDescription('Change Amount. You will select the product later')
            .addIntegerOption(option => option
                .setName('new-amount')
                .setDescription('The new amount of the product (-1 for unlimited)')
                .setRequired(true)
                .setMaxValue(99999999)
                .setMinValue(-1)
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

    switch (subCommand) {
        case 'add':
            if (interaction.options.getString('action') != null) {
                const addActionProductFlow = new AddActionProductFlow()
                addActionProductFlow.start(interaction)

                break
            }

            new AddProductFlow().start(interaction)
            break

        case 'remove':
            new RemoveProductFlow().start(interaction)

            break
            
        default:
            if (subCommandGroup == 'edit') {
                const editProductFlow = new EditProductFlow()
                editProductFlow.start(interaction)
                
                break
            }

            await replyErrorMessage(interaction, errorMessages().invalidSubcommand)
    }
}