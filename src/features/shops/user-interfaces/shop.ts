import { AccountUserInterface } from "@/features/accounts/user-interfaces/account-ui.js"
import { getCurrencyName } from "@/features/currencies/database/currencies-database.js"
import { replyErrorMessage, updateAsErrorMessage } from "@/lib/discord.js"
import { t } from "@/lib/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { PaginatedEmbedUserInterface, UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { APIEmbedField, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, GuildMember, InteractionCallbackResponse, italic, roleMention, StringSelectMenuInteraction } from "discord.js"
import { getProductName } from "../database/products-database.js"
import { getShopName, getShops } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"
import { BuyProductUserInterface } from "./buy.js"


export class ShopUserInterface extends PaginatedEmbedUserInterface {
    public override id = 'shop-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()
    protected override embed: EmbedBuilder | null = null

    private selectedShop: Shop | null = null

    protected override page: number = 0
    protected override response: InteractionCallbackResponse | null = null

    private member: GuildMember | null = null

    protected locale = "userInterfaces.shop" as const

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        this.selectedShop = shops.values().next().value!

        this.member = interaction.member as GuildMember ?? null
    }

    protected override getMessage(): string { return '' }

    protected override initComponents(): void {
        const selectShopMenu = new ExtendedStringSelectMenuComponent(
            { 
                customId : `${this.id}+select-shop`, 
                placeholder: t("defaultComponents.selectShop"), 
                time: 120_000 
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            async (interaction: StringSelectMenuInteraction, selected: Shop) => {
                this.page = 0
                this.selectedShop = selected
                this.updateInteraction(interaction) 
            }
        )

        const buyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+buy`,
                label: t(`${this.locale}.components.buyButton`),
                emoji: {name: '🪙'},
                style: ButtonStyle.Primary,
                time: 120_000,
                disabled: this.isBuyButtonDisabled()
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

                const buyProductUI = new BuyProductUserInterface(this.selectedShop)
                return buyProductUI.display(interaction)
            }
        )

        const showAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+show-account`,
                label: t(`${this.locale}.components.showAccountButton`),
                emoji: {name: '💰'},
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => {
                const user = interaction.user
                const accountUI = new AccountUserInterface(user)
                accountUI.display(interaction)
            }
        )

        
        buyButton.toggle(this.selectedShop != null && this.selectedShop.products.size > 0 && !this.isBuyButtonDisabled())

        this.components.set(selectShopMenu.customId, selectShopMenu)
        this.components.set(buyButton.customId, buyButton)
        this.components.set(showAccountButton.customId, showAccountButton)
    }

    protected override initEmbeds(_interaction: UserInterfaceInteraction): void {
        if (!this.selectedShop) return

        const reservedToString = this.selectedShop.reservedTo !== undefined ? 
            ` (${t(`${this.locale}.embeds.shop.reservedTo`, { role: roleMention(this.selectedShop.reservedTo) })})\n` : ''

        const shopEmbed = new EmbedBuilder()
            .setTitle(`${getShopName(this.selectedShop.id)!}`)
            .setDescription(`${reservedToString}${this.selectedShop.description}\n${t(`${this.locale}.embeds.shop.products`)} `)
            .setColor(Colors.Gold)


        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }

    protected override updateComponents() {
        const buyButton = this.components.get(`${this.id}+buy`)
        if (buyButton instanceof ExtendedButtonComponent && this.selectedShop != null) {
            buyButton.toggle(this.selectedShop.products.size > 0  && !this.isBuyButtonDisabled())
        }
    }

    protected override updateEmbeds() {
        const shopEmbed = this.embed

        if (!shopEmbed || !this.selectedShop) return

        const reservedToString = this.selectedShop.reservedTo !== undefined ? 
            ` (${t(`${this.locale}.embeds.shop.reservedTo`, { role: roleMention(this.selectedShop.reservedTo) })})\n` : ''

        shopEmbed.setTitle(`${getShopName(this.selectedShop.id)!}`)
        shopEmbed.setDescription(`${reservedToString}${this.selectedShop.description}\n${t(`${this.locale}.embeds.shop.products`)} `)

        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }


    protected override getEmbedFields(): APIEmbedField[] {
        if (!this.selectedShop) return []
        if (this.selectedShop.products.size == 0) return [{ name: '\u200b', value: `🛒 ${italic(t(`${this.locale}.embeds.shop.noProduct`))}` }]

        const fields: APIEmbedField[] = []

        this.selectedShop.products.forEach(product => {
            const descString = product.description ? product.description : '\u200b'
            const amountString = product.amount == undefined ?  '' : 
                product.amount == 0 ? ` (${t(`${this.locale}.embeds.shop.outOfStock`)})` : 
                ` (${t(`${this.locale}.embeds.shop.xProductsLeft`, { x: `${product.amount}` })})`

            fields.push({ 
                name: getProductName(this.selectedShop!.id, product.id)!,
                value: `${t(`${this.locale}.embeds.shop.price`)} **${product.price} ${getCurrencyName(this.selectedShop!.currency.id)}**${amountString}\n${descString}`, 
                inline: true 
            })
        })

        return fields
    }

    protected override getInputSize(): number {
        return this.selectedShop ? this.selectedShop.products.size : 0
    }


    private isBuyButtonDisabled() {
        if (!this.selectedShop) return false

        const isReserved = this.selectedShop.reservedTo
        if (!isReserved) return false
        
        if (!this.member) return false

        const isUserAuthorized = this.member.roles.cache.has(this.selectedShop.reservedTo!)
        const isUserAdmin = this.member.permissions.has("Administrator")

        return !isUserAuthorized && !isUserAdmin 
    }

}


