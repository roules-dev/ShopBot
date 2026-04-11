import { t } from "@/core/i18n/i18n.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { createShop } from "@/core/services/shops/shops.services.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ExtendedComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showEditModal, showValidatedEditModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { validate } from "@/lib/validation.js"
import { EmojiSchema, SnowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, Snowflake, StringSelectMenuInteraction } from "discord.js"

export class ShopCreateFlow extends UserFlow {
    public id = "shop-create"
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private shopName: string | null = null
    private shopEmoji: string | null = null
    private shopDescription: string | null = null
    private shopReservedTo: Snowflake | undefined = undefined

    protected locale = "userFlows.shopCreate" as const

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return await replyErrorMessage(interaction, `${t(`${this.locale}.errorMessages.cantCreateShop`)} ${t("errorMessages.noCurrencies")}`)

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

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return 
    }

    protected override getMessage(): string {
        const shopNameString = formattedEmojiableName({ name: this.shopName!, emoji: this.shopEmoji })

        const message = t(`${this.locale}.messages.default`, {
            shop: bold(shopNameString),
            currency: bold(this.selectedCurrency?.name || t("defaultComponents.selectCurrency"))
        })

        return message
    }

    protected override initComponents() {
        const selectCurrencyMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: t("defaultComponents.selectCurrency"), time: 120_000 },
            getCurrencies(), // TODO hydration needed
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency) => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
        )
        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`${this.locale}.components.submitButton`),
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
                label: t(`${this.locale}.components.changeShopNameButton`),
                emoji: "📝",
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, [error, newShopName]] = await showEditModal(interaction, { edit: t(`${this.locale}.components.editNameModalTitle`), previousValue: this.shopName || undefined })
                
                if (error) return updateAsErrorMessage(modalSubmit, error.message)

                this.shopName = newShopName
                this.updateInteraction(modalSubmit)
            }
        )

        const changeShopEmojiButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-emoji`,
                label: t(`${this.locale}.components.changeShopEmojiButton`),
                emoji: "✏️",
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, [error, emoji]] = await showValidatedEditModal(
                    interaction, { edit: t(`${this.locale}.components.editEmojiModalTitle`), previousValue: this.shopEmoji || undefined },
                    EmojiSchema
                )

                if (error) return replyErrorMessage(modalSubmit, error.message)

                this.shopEmoji = emoji
                this.updateInteraction(modalSubmit)
            }
        )

        this.components.set(selectCurrencyMenu.customId, selectCurrencyMenu)
        this.components.set(submitButton.customId, submitButton)
        this.components.set(changeShopNameButton.customId, changeShopNameButton)
        this.components.set(changeShopEmojiButton.customId, changeShopEmojiButton)
    }

    protected override updateComponents() {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
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

        const message = t(`${this.locale}.messages.success`, {
            shop: bold(newShop.name),
            currency: bold(this.selectedCurrency.name)
        })

        return await updateAsSuccessMessage(interaction, message)

    }
}
