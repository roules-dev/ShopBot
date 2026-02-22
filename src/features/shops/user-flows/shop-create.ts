import { getCurrencies, getCurrencyName } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { defaultComponents, errorMessages, getLocale } from "@/lib/localization/localization.js"
import { replaceTemplates } from "@/lib/localization/translate.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { showEditModal } from "@/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { EMOJI_REGEX } from "@/utils/constants.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, Snowflake, StringSelectMenuInteraction } from "discord.js"
import { createShop, getShopName } from "../database/shops-database.js"

export class ShopCreateFlow extends UserFlow {
    public id = 'shop-create'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private shopName: string | null = null
    private shopEmoji: string | null = null
    private shopDescription: string | null = null
    private shopReservedTo: Snowflake | undefined = undefined

    protected locale = getLocale().userFlows.shopCreate

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return await replyErrorMessage(interaction, `${this.locale.errorMessages.cantCreateShop} ${errorMessages().noCurrencies}`)

        const shopName = interaction.options.getString('name')?.replaceSpaces()
        const shopDescription = interaction.options.getString('description')?.replaceSpaces()  || ''
        const emojiOption = interaction.options.getString('emoji')
        const shopEmoji = emojiOption?.match(EMOJI_REGEX)?.[0] || ''
        const shopReservedTo = interaction.options.getRole('reserved-to')?.id

        if (!shopName) return replyErrorMessage(interaction, errorMessages().insufficientParameters)

        if (shopName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, errorMessages().notOnlyEmojisInName)

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
        const shopNameString = `${this.shopEmoji ? `${this.shopEmoji} ` : ''}${this.shopName!}`

        const message = replaceTemplates(this.locale.messages.default, {
            shop: bold(shopNameString),
            currency: bold(getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency)
        })

        return message
    }

    protected override initComponents(): void {
        const selectCurrencyMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: defaultComponents().selectCurrency, time: 120_000 },
            getCurrencies(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
        )
        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: this.locale.components.submitButton,
                emoji: '✅',
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopNameButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-name`,
                label: this.locale.components.changeShopNameButton,
                emoji: '📝',
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, newShopName] = await showEditModal(interaction, { edit: this.locale.components.editNameModalTitle, previousValue: this.shopName || undefined })
                
                this.shopName = newShopName
                this.updateInteraction(modalSubmit)
            }
        )

        const changeShopEmojiButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-emoji`,
                label: this.locale.components.changeShopEmojiButton,
                emoji: '✏️',
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, newShopEmoji] = await showEditModal(interaction, { edit: this.locale.components.editEmojiModalTitle, previousValue: this.shopEmoji || undefined })
                
                this.shopEmoji = newShopEmoji?.match(EMOJI_REGEX)?.[0] || this.shopEmoji
                this.updateInteraction(modalSubmit)
            }
        )

        this.components.set(selectCurrencyMenu.customId, selectCurrencyMenu)
        this.components.set(submitButton.customId, submitButton)
        this.components.set(changeShopNameButton.customId, changeShopNameButton)
        this.components.set(changeShopEmojiButton.customId, changeShopEmojiButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        if (!this.shopName) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        if (!this.selectedCurrency) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        
        const [error, newShop] = await createShop(this.shopName, this.shopDescription || '', this.selectedCurrency.id, this.shopEmoji || '', this.shopReservedTo)

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = replaceTemplates(this.locale.messages.success, {
            shop: bold(getShopName(newShop.id)!),
            currency: bold(getCurrencyName(newShop.currency.id)!)
        })

        return await updateAsSuccessMessage(interaction, message)

    }
}
