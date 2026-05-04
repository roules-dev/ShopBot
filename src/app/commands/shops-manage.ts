import { t } from "@/core/i18n/i18n.js"
import { DISCOUNT_CODE_MAX_LENGTH, DISCOUNT_CODE_MIN_LENGTH, SHOP_DESCRIPTION_MAX_LENGTH, SHOP_NAME_MAX_LENGTH } from "@/features/shops/schemas/shop.schemas.js"
import { createShopFlow } from "@/features/shops/ui/user-flows/shop-create.js"
import { DiscountCodeCreateFlow, DiscountCodeRemoveFlow, discountCodeCreateParamsSchema } from "@/features/shops/ui/user-flows/shop-discount.js"
import { EditShopFlow, ShopReorderFlow, editShopParamsSchema } from "@/features/shops/ui/user-flows/shop-edit.js"
import { ShopRemoveFlow } from "@/features/shops/ui/user-flows/shop-remove.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
    .setName("shops-manage") 
    .setDescription("Manage your Shops")
    .addSubcommand(subcommand => subcommand
        .setName("create")
        .setDescription("Create a new Shop")
        .addStringOption(option => option
            .setName("name")
            .setDescription("The name of the shop")
            .setRequired(true)
            .setMaxLength(SHOP_NAME_MAX_LENGTH)
            .setMinLength(1)
        )
        .addStringOption(option => option
            .setName("description")
            .setDescription("The description of the shop")
            .setMaxLength(SHOP_DESCRIPTION_MAX_LENGTH)
            .setMinLength(1)
        )        
        .addStringOption(option => option
            .setName("emoji")
            .setDescription("The emoji of the shop")
            .setRequired(false)
        )
        .addRoleOption(option => option
            .setName("reserved_to_role")
            .setDescription("Specify if should be reserved to a role")
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("remove")
        .setDescription("Remove the selected shop")
    )
    .addSubcommand(subcommand => subcommand
        .setName("reorder")
        .setDescription("Reorder shops")
    )
    .addSubcommandGroup(subcommandgroup => subcommandgroup
        .setName("edit")
        .setDescription("Edit a shop")
        .addSubcommand(subcommand => subcommand
            .setName("name")
            .setDescription("Change Name. You will select the shop later")
            .addStringOption(option => option
                .setName("name")
                .setDescription("The new name of the shop")
                .setRequired(true)
                .setMaxLength(SHOP_NAME_MAX_LENGTH)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("description")
            .setDescription("Change Description. You will select the shop later")
            .addStringOption(option => option
                .setName("description")
                .setDescription("The new description of the shop (leave empty to remove)")
                .setMaxLength(SHOP_DESCRIPTION_MAX_LENGTH)
                .setMinLength(1)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("emoji")
            .setDescription("Change Emoji. You will select the shop later")
            .addStringOption(option => option
                .setName("emoji")
                .setDescription("The new emoji of the shop (leave empty to remove)")
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("reserved_to_role")
            .setDescription("Change the role the shop is reserved to. You will select the shop later")
            .addRoleOption(option => option
                .setName("role")
                .setDescription("The new tole the shop will be reserved to (leave empty to remove)")
            )
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("create-discount-code")
        .setDescription("Create a discount code")
        .addStringOption(option => option
            .setName("code")
            .setDescription("The discount code")
            .setRequired(true)
            .setMinLength(DISCOUNT_CODE_MIN_LENGTH)
            .setMaxLength(DISCOUNT_CODE_MAX_LENGTH)
        )
        .addIntegerOption(option => option
            .setName("amount")
            .setDescription("The amount of the discount (in %)")
            .setRequired(true)
            .setMaxValue(100)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand => subcommand
        .setName("remove-discount-code")
        .setDescription("Remove a discount code")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

    switch (subCommand) {
        case "create":
            createShopFlow(interaction)
            break
        case "remove":
            new ShopRemoveFlow().start(interaction)
            break
        case "reorder":
            new ShopReorderFlow().start(interaction)
            break
        case "create-discount-code": {
            const [error, options] = validateCommandOptions(interaction.options, discountCodeCreateParamsSchema)
            if (error) return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
            
            new DiscountCodeCreateFlow(options).start(interaction)
            break
        }
        case "remove-discount-code":
            new DiscountCodeRemoveFlow().start(interaction)
            break
        default:
            if (subCommandGroup == "edit") {
                const [error, options] = validateCommandOptions(interaction.options, editShopParamsSchema, { kind: subCommand })
                if (error) return await replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

                new EditShopFlow(options).start(interaction)
                return
            }

            await replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
    }

}
