import { HYDRATOR } from "@/core/database/init-databases.js"
import { t } from "@/core/i18n/i18n.js"
import { getShops } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database-types.js"
import { AccountUserInterface } from "@/features/accounts/user-interfaces/account-ui.js"
import { replyErrorMessage, updateAsErrorMessage } from "@/lib/discord.js"
import { Identifiable } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ExtendedComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { PaginatedEmbedUserInterface } from "@/lib/ui/user-interfaces/user-interfaces.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { APIEmbedField, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, GuildMember, InteractionCallbackResponse, italic, roleMention } from "discord.js"
import { Shop } from "../database/shops-types.js"
import { BuyProductUserInterface } from "./buy.js"


export class ShopUserInterface extends PaginatedEmbedUserInterface {
    public override id = "shop-ui"
    protected override components: Map<string, ExtendedComponent> = new Map()
    protected override embed: EmbedBuilder | null = null

    private selectedShop: Shop & Identifiable<NanoId> | null = null

    protected override page: number = 0
    protected override response: InteractionCallbackResponse | null = null

    private member: GuildMember | null = null

    protected locale = "userInterfaces.shop" as const

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        const shops = getShops()
        const firstShopEntry = shops.entries().next().value

        if (!firstShopEntry) {
            replyErrorMessage(interaction, t("errorMessages.noShops"))
            return false
        }

        this.selectedShop = { ...firstShopEntry[1], id: firstShopEntry[0] }

        this.member = interaction.member as GuildMember ?? null

        return true
    }

    protected override getMessage(): string { return "" }

    protected override initComponents() {
        const selectShopMenu = new ExtendedStringSelectMenuComponent(
            { 
                customId : `${this.id}+select-shop`, 
                placeholder: t("defaultComponents.selectShop"), 
                time: 120_000 
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            async (interaction, selected) => {
                this.page = 0
                this.selectedShop = selected
                this.updateInteraction(interaction) 
            }
        )

        const buyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+buy`,
                label: t(`${this.locale}.components.buyButton`),
                emoji: {name: "🪙"},
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
                emoji: {name: "💰"},
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => {
                const user = interaction.user
                const accountUI = new AccountUserInterface(user)
                accountUI.display(interaction)
            }
        )

        
        buyButton.toggle(this.selectedShop != null && Object.keys(this.selectedShop.products).length > 0 && !this.isBuyButtonDisabled())

        this.components.set(selectShopMenu.customId, selectShopMenu)
        this.components.set(buyButton.customId, buyButton)
        this.components.set(showAccountButton.customId, showAccountButton)
    }

    protected override initEmbeds(_interaction: UserInterfaceInteraction) {
        if (!this.selectedShop) return

        const reservedToString = this.selectedShop.reservedTo !== undefined && this.selectedShop.reservedTo !== null ? 
            ` (${t(`${this.locale}.embeds.shop.reservedTo`, { role: roleMention(this.selectedShop.reservedTo) })})\n` : ""

        const shopEmbed = new EmbedBuilder()
            .setTitle(`${this.selectedShop.name}`)
            .setDescription(`${reservedToString}${this.selectedShop.description}\n${t(`${this.locale}.embeds.shop.products`)} `)
            .setColor(Colors.Gold)


        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }

    protected override updateComponents() {
        const buyButton = this.components.get(`${this.id}+buy`)
        if (buyButton instanceof ExtendedButtonComponent && this.selectedShop != null) {
            buyButton.toggle(Object.keys(this.selectedShop.products).length > 0 && !this.isBuyButtonDisabled())
        }
    }

    protected override updateEmbeds() {
        const shopEmbed = this.embed

        if (!shopEmbed || !this.selectedShop) return

        const reservedToString = this.selectedShop.reservedTo !== undefined && this.selectedShop.reservedTo !== null ? 
            ` (${t(`${this.locale}.embeds.shop.reservedTo`, { role: roleMention(this.selectedShop.reservedTo) })})\n` : ""

        shopEmbed.setTitle(`${this.selectedShop.name}`)
        shopEmbed.setDescription(`${reservedToString}${this.selectedShop.description}\n${t(`${this.locale}.embeds.shop.products`)} `)

        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }


    protected override getEmbedFields() {
        if (this.selectedShop == null) return []
        if (Object.keys(this.selectedShop.products).length == 0) return [{ name: "\u200b", value: `🛒 ${italic(t(`${this.locale}.embeds.shop.noProduct`))}` }]

        const fields: APIEmbedField[] = []

        const [error, hydratedShop] = HYDRATOR.fullyHydrateShop(this.selectedShop.id)
        if (error) throw error 

        hydratedShop.products.forEach(product => {
            const descString = product.item.description ? product.item.description : "\u200b"
            const amountString = product.stock == undefined ?  "" : 
                product.stock == 0 ? ` (${t(`${this.locale}.embeds.shop.outOfStock`)})` : 
                ` (${t(`${this.locale}.embeds.shop.xProductsLeft`, { x: `${product.stock}` })})`

            // TODO Price formatting with multiple currencies
            fields.push({ 
                name: formattedEmojiableName(product.item),
                value: `${t(`${this.locale}.embeds.shop.price`)} **TODO PRICE**${amountString}\n${descString}`, 
                inline: true 
            })
        })

        return fields
    }

    protected override getInputSize(): number {
        return this.selectedShop ? Object.keys(this.selectedShop.products).length : 0
    }


    private isBuyButtonDisabled() {
        if (!this.selectedShop) return false

        const isReserved = this.selectedShop.reservedTo
        if (!isReserved) return false
        
        if (!this.member) return false

        const isUserAuthorized = this.member.roles.cache.has(isReserved)
        const isUserAdmin = this.member.permissions.has("Administrator")

        return !isUserAuthorized && !isUserAdmin 
    }

}


