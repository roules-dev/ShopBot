import { HYDRATOR } from "@/core/database/init-databases.js"
import { t } from "@/core/i18n/i18n.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { ObjectValues } from "@/lib/types/collections.js"
import { DeepReadonly } from "@/lib/types/readonly.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { MultiplePaginatedEmbedUserInterface } from "@/lib/ui/user-interfaces/special-embed-ui.js"
import { SnowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { APIEmbedField, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, InteractionCallbackResponse, User } from "discord.js"
import { Account } from "../database/accounts.type.js"

export class AccountUserInterface extends MultiplePaginatedEmbedUserInterface {
    public override get id(): string { 
        return "account-ui" 
    }
    
    protected override get modes() {
        return {
            CURRENCIES:"currencies",
            INVENTORY: "inventory"
        } as const
    }
    protected override mode: ObjectValues<typeof this.modes> = this.modes.CURRENCIES
    
    protected override embed: EmbedBuilder | null = null
    protected override embedByMode: Map<ObjectValues<typeof this.modes>, EmbedBuilder> = new Map()

    protected override page: number = 0
    
    protected override response: InteractionCallbackResponse | null = null

    private user: User
    private account: DeepReadonly<Account> | null = null

    constructor(user: User) {
        super()
        this.user = user
    }

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        const [error, account] = await getOrCreateAccount(SnowflakeSchema.parse(this.user.id))
        if (error) {
            await replyErrorMessage(interaction, error.message)
            return false
        }

        this.account = account
        return true
    }

    protected override getMessage() {
        return ""
    }

    protected override initEmbeds(interaction: UserInterfaceInteraction) {
        const currenciesEmbed = new EmbedBuilder()
            .setTitle(t(`userInterfaces.account.embeds.account.title`, { user: this.user.displayName }))
            .setColor(Colors.Gold)
            .setFooter({ text: "ShopBot", iconURL: interaction.client.user.displayAvatarURL()})
            .setFields(this.getPageEmbedFields())


        const inventoryEmbed = new EmbedBuilder()
            .setTitle(t(`userInterfaces.account.embeds.inventory.title`, { user: this.user.displayName }))
            .setColor(Colors.DarkRed)
            .setFooter({ text: "ShopBot", iconURL: interaction.client.user.displayAvatarURL()})
            .setFields(this.getPageEmbedFields())

        this.embedByMode.set(this.modes.CURRENCIES, currenciesEmbed)
        this.embedByMode.set(this.modes.INVENTORY, inventoryEmbed)

        this.embed = currenciesEmbed

        this.mode = this.modes.CURRENCIES
    }

    protected override updateEmbeds() {
        const currentModeEmbed = this.embedByMode.get(this.mode)
        if (!currentModeEmbed) return

        currentModeEmbed.setFields(this.getPageEmbedFields())
        this.embed = currentModeEmbed
    }

    protected override initComponents() {
        const showAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+show-account`,
                label: t(`userInterfaces.account.components.showAccountButton`),
                emoji: "💰",
                style: ButtonStyle.Secondary,
                disabled: this.mode == this.modes.CURRENCIES,
                time: 120_000
            }, 
            (interaction: ButtonInteraction) => this.changeDisplayMode(interaction, this.modes.CURRENCIES)
        )

        const showInventoryButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+show-inventory`,
                label: t(`userInterfaces.account.components.showInventoryButton`),
                emoji: "💼",
                style: ButtonStyle.Secondary,
                disabled: this.mode == this.modes.INVENTORY,
                time: 120_000
            }, 
            (interaction: ButtonInteraction) => this.changeDisplayMode(interaction, this.modes.INVENTORY)
        )

        return [
            createComponent(showAccountButton, () => showAccountButton.toggle(this.mode != this.modes.CURRENCIES)),
            createComponent(showInventoryButton, () => showInventoryButton.toggle(this.mode != this.modes.INVENTORY))
        ]
    }

    protected override getInputSize() {
        switch (this.mode) {
            case this.modes.CURRENCIES:
                return Object.keys(this.account?.currencies ?? {}).length
            case this.modes.INVENTORY:
                return Object.keys(this.account?.inventory ?? {}).length
        }
    }

    private getAccountFields() {
        const emptyAccountField = { name: t(`userInterfaces.account.errors.accountEmpty`), value: "\u200b" }
        if (!this.account) return [emptyAccountField]

        const [error, currencies] = HYDRATOR.getHydratedAccountCurrencies(this.account)
        if (error) return [emptyAccountField]

        if (currencies.size === 0) return [emptyAccountField]
        const fields: APIEmbedField[] = []

        currencies.forEach(currencyBalance => {
            fields.push({ name: formattedEmojiableName(currencyBalance.resource), value: `${currencyBalance.amount}`, inline: true })
        })

        return fields
    }

    private getInventoryFields() { 
        const emptyInventoryField = { name: t(`userInterfaces.account.errors.inventoryEmpty`), value: "\u200b" }
        if (!this.account) return [emptyInventoryField]

        const [error, inventory] = HYDRATOR.getHydratedAccountInventory(this.account)
        if (error) return [emptyInventoryField]

        if (inventory.size === 0) return [emptyInventoryField]
        const fields: APIEmbedField[] = []

        inventory.forEach(itemBalance => {
            fields.push({ name: formattedEmojiableName(itemBalance.resource), value: `${itemBalance.amount}`, inline: true })
        })

        return fields
    }

    protected override getEmbedFields() {
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