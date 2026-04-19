import { t } from "@/core/i18n/i18n.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { createShop } from "@/core/services/shops/shops.services.js"
import { Currency } from "@/features/currencies/database/currencies.types.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showEditModal, showValidatedEditModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { validate } from "@/lib/validation.js"
import { BrandedEmoji, EmojiSchema, SnowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, Snowflake, StringSelectMenuInteraction } from "discord.js"

// TODO : Update: shops no longer have a default currency


export class ShopCreateFlow extends UserFlow {
    public override get id(): string { 
        return "shop-create" 
    }

    private selectedCurrency: Currency | null = null
    private shopName: string | null = null
    private shopEmoji: BrandedEmoji | null = null
    private shopDescription: string | null = null
    private shopReservedTo: Snowflake | undefined = undefined

    

    public override async start(interaction: ChatInputCommandInteraction) {
        const currencies = getCurrencies()
        if (!currencies.size) return await replyErrorMessage(interaction, `${t(`userFlows.shopCreate.errorMessages.cantCreateShop`)} ${t("errorMessages.noCurrencies")}`)

        const shopName = interaction.options.getString("name")?.replaceSpaces()
        const shopDescription = interaction.options.getString("description")?.replaceSpaces()  || ""
        const emojiOption = interaction.options.getString("emoji")
        const [error, _shopEmoji] = validate(EmojiSchema, emojiOption)
        const shopEmoji = error ? null : _shopEmoji
        const shopReservedTo = interaction.options.getRole("reserved-to")?.id

        if (!shopName) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        if (shopName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, t("errorMessages.notOnlyEmojisInName"))

        this.shopName = shopName
        this.shopEmoji = shopEmoji
        this.shopDescription = shopDescription
        this.shopReservedTo = shopReservedTo

        
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return 
    }

    protected override getMessage() {
        const shopNameString = formattedEmojiableName({ name: this.shopName!, emoji: this.shopEmoji })

        const message = t(`userFlows.shopCreate.messages.default`, {
            shop: bold(shopNameString),
            currency: bold(this.selectedCurrency?.name || t("defaultComponents.selectCurrency"))
        })

        return message
    }

    protected override initComponents() {
        const selectCurrencyMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: t("defaultComponents.selectCurrency"), time: 120_000 },
            getCurrencies(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency) => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
        )
        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`userFlows.shopCreate.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopNameButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-name`,
                label: t(`userFlows.shopCreate.components.changeShopNameButton`),
                emoji: "📝",
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, [error, newShopName]] = await showEditModal(interaction, { edit: t(`userFlows.shopCreate.components.editNameModalTitle`), previousValue: this.shopName || undefined })
                
                if (error) return updateAsErrorMessage(modalSubmit, error.message)

                this.shopName = newShopName
                this.updateInteraction(modalSubmit)
            }
        )

        const changeShopEmojiButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-emoji`,
                label: t(`userFlows.shopCreate.components.changeShopEmojiButton`),
                emoji: "✏️",
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, [error, emoji]] = await showValidatedEditModal(
                    interaction, { edit: t(`userFlows.shopCreate.components.editEmojiModalTitle`), previousValue: this.shopEmoji || undefined },
                    EmojiSchema
                )

                if (error) return replyErrorMessage(modalSubmit, error.message)

                this.shopEmoji = emoji
                this.updateInteraction(modalSubmit)
            }
        )

        return [
            createComponent(selectCurrencyMenu), 
            createComponent(submitButton, () => submitButton.toggle(this.selectedCurrency != null)),
            createComponent(changeShopNameButton),
            createComponent(changeShopEmojiButton),
        ]
    }


    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.shopName) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.selectedCurrency) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const optionals = {
            ...(this.shopReservedTo !== undefined ? { reservedTo: SnowflakeSchema.parse(this.shopReservedTo) } : {})
        }

        const [error, newShop] = await createShop({
            name: this.shopName,
            emoji: this.shopEmoji,
            description: this.shopDescription,
            ...optionals
        })

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.shopCreate.messages.success`, {
            shop: bold(newShop.name),
            currency: bold(this.selectedCurrency.name)
        })

        return await updateAsSuccessMessage(interaction, message)

    }
}
