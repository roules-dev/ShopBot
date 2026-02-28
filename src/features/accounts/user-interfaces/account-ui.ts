import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { replyErrorMessage } from "@/lib/discord.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { t } from "@/lib/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { ObjectValues, PaginatedMultipleEmbedUserInterface, UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { APIEmbedField, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, InteractionCallbackResponse, User } from "discord.js"
import { getOrCreateAccount } from "../database/accounts-database.js"
import { Account } from "../database/accounts-type.js"

export class AccountUserInterface extends PaginatedMultipleEmbedUserInterface {
    public override id: string = "account-ui"
    protected override components: Map<string, ExtendedComponent> = new Map()
    
    protected override readonly modes = {
        CURRENCIES:"currencies",
        INVENTORY: "inventory"
    } as const
    
    protected override mode: ObjectValues<typeof this.modes> = this.modes.CURRENCIES
    
    protected override embed: EmbedBuilder | null = null
    protected override embedByMode: Map<ObjectValues<typeof this.modes>, EmbedBuilder> = new Map()

    protected override page: number = 0
    
    protected override response: InteractionCallbackResponse | null = null

    private user: User
    private account: Account | null = null

    private locale = "userInterfaces.account" as const

    constructor(user: User) {
        super()
        this.user = user
    }

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        const [error, account] = await getOrCreateAccount(this.user.id)
        if (error) {
            await replyErrorMessage(interaction, error.message)
            return false
        }

        this.account = account
        return true
    }

    protected override getMessage(): string {
        return ""
    }

    protected override initEmbeds(interaction: UserInterfaceInteraction): void {
        this.mode = this.modes.CURRENCIES
        const currenciesEmbed = new EmbedBuilder()
            .setTitle(t(`${this.locale}.embeds.account.title`, { user: this.user.displayName }))
            .setColor(Colors.Gold)
            .setFooter({ text: "ShopBot", iconURL: interaction.client.user.displayAvatarURL()})
            .setFields(this.getPageEmbedFields())


        this.mode = this.modes.INVENTORY
        const inventoryEmbed = new EmbedBuilder()
            .setTitle(t(`${this.locale}.embeds.inventory.title`, { user: this.user.displayName }))
            .setColor(Colors.DarkRed)
            .setFooter({ text: "ShopBot", iconURL: interaction.client.user.displayAvatarURL()})
            .setFields(this.getPageEmbedFields())

        this.embedByMode.set(this.modes.CURRENCIES, currenciesEmbed)
        this.embedByMode.set(this.modes.INVENTORY, inventoryEmbed)

        this.embed = currenciesEmbed

        this.mode = this.modes.CURRENCIES
    }

    protected override updateEmbeds(): void {
        const currentModeEmbed = this.embedByMode.get(this.mode)
        if (!currentModeEmbed) return

        currentModeEmbed.setFields(this.getPageEmbedFields())
        this.embed = currentModeEmbed
    }

    protected override initComponents(): void {
        const showAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+show-account`,
                label: t(`${this.locale}.components.showAccountButton`),
                emoji: {name: "💰"},
                style: ButtonStyle.Secondary,
                disabled: this.mode == this.modes.CURRENCIES,
                time: 120_000
            }, 
            (interaction: ButtonInteraction) => this.changeDisplayMode(interaction, this.modes.CURRENCIES)
        )

        const showInventoryButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+show-inventory`,
                label: t(`${this.locale}.components.showInventoryButton`),
                emoji: {name: "💼"},
                style: ButtonStyle.Secondary,
                disabled: this.mode == this.modes.INVENTORY,
                time: 120_000
            }, 
            (interaction: ButtonInteraction) => this.changeDisplayMode(interaction, this.modes.INVENTORY)
        )

        this.components.set(showAccountButton.customId, showAccountButton)
        this.components.set(showInventoryButton.customId, showInventoryButton)
    }

    protected override updateComponents(): void {
        const showAccountButton = this.components.get(`${this.id}+show-account`)
        if (showAccountButton instanceof ExtendedButtonComponent) {
            showAccountButton.toggle(this.mode != this.modes.CURRENCIES)
        }

        const showInventoryButton = this.components.get(`${this.id}+show-inventory`)
        if (showInventoryButton instanceof ExtendedButtonComponent) {
            showInventoryButton.toggle(this.mode != this.modes.INVENTORY)
        }
    }

    protected override getInputSize(): number {
        switch (this.mode) {
            case this.modes.CURRENCIES:
                return getCurrencies().size
            case this.modes.INVENTORY:
                return this.account?.inventory.size ?? 0
        }
    }

    private getAccountFields(): APIEmbedField[] {
        if (!this.account || !this.account.currencies.size) return [{ name: t(`${this.locale}.errors.accountEmpty`), value: "\u200b" }]
        const fields: APIEmbedField[] = []

        this.account.currencies.forEach(currencyBalance => {
            const emojiString = currencyBalance.item.emoji != null ? `${currencyBalance.item.emoji} ` : ""

            fields.push({ name: `${emojiString}${currencyBalance.item.name}`, value: `${currencyBalance.amount}`, inline: true })
        })

        return fields
    }

    private getInventoryFields(): APIEmbedField[] { 
        if (!this.account || !this.account.inventory.size) return [{ name: t(`${this.locale}.errors.inventoryEmpty`), value: "\u200b" }]
        const fields: APIEmbedField[] = []

        this.account.inventory.forEach(productBalance => {
            const emojiString = productBalance.item.emoji != null ? `${productBalance.item.emoji} ` : ""

            fields.push({ name: `${emojiString}${productBalance.item.name}`, value: `${productBalance.amount}`, inline: true })
        })

        return fields
    }

    protected override getEmbedFields(): APIEmbedField[] {
        switch (this.mode) {
            case this.modes.CURRENCIES:
                return this.getAccountFields()
            case this.modes.INVENTORY:
                return this.getInventoryFields()
            default:
                assertNeverReached(this.mode)
        }
    }
}