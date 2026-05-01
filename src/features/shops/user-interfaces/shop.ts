import { HYDRATOR } from "@/core/database/init-databases.js"
import { t } from "@/core/i18n/i18n.js"
import { getShops } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { AccountUserInterface } from "@/features/accounts/user-interfaces/account-ui.js"
import { replyErrorMessage, updateAsErrorMessage } from "@/lib/discord/answer-interactions.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { Identifiable } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { PaginatedEmbedUserInterface } from "@/lib/ui/user-interfaces/special-embed-ui.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { APIEmbedField, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, GuildMember, InteractionCallbackResponse, italic, roleMention } from "discord.js"
import { Shop } from "../database/shops.types.js"
import { formatPrice } from "../services/price.js"
import { BuyProductUserInterface } from "./buy.js"


export class ShopUserInterface extends PaginatedEmbedUserInterface {
    public override get id(): string { 
        return "shop-ui" 
    }
    protected override embed: EmbedBuilder | null = null

    private selectedShop: Shop & Identifiable<NanoId> | null = null

    protected override page: number = 0
    protected override response: InteractionCallbackResponse | null = null

    private member: GuildMember | null = null

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        const shops = getShops()
        const firstShopEntry = shops.entries().next().value

        if (!firstShopEntry) {
            replyErrorMessage(interaction, t("errorMessages.noShops"))
            return false
        }

        this.selectedShop = { ...firstShopEntry[1], id: firstShopEntry[0] }

        const member = interaction.member
        if (!(member instanceof GuildMember)) return false

        this.member = member

        return true
    }

    protected override getMessage() { return "" }

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
                label: t(`userInterfaces.shop.components.buyButton`),
                emoji: {name: "🪙"},
                style: ButtonStyle.Primary,
                time: 120_000,
                disabled: this.isBuyingAllowed()
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

                new BuyProductUserInterface(this.selectedShop).display(interaction)
            }
        )

        const showAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+show-account`,
                label: t(`userInterfaces.shop.components.showAccountButton`),
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

        
        
        const buyButtonEnabled = () => this.selectedShop != null && Object.keys(this.selectedShop.products).length > 0 && this.isBuyingAllowed()
        buyButton.toggle(buyButtonEnabled())
 
        return [
            createComponent(selectShopMenu),
            createComponent(buyButton, () => buyButton.toggle(buyButtonEnabled())),
            createComponent(showAccountButton)
        ]
    }

    protected override initEmbeds(_interaction: UserInterfaceInteraction) {
        if (!this.selectedShop) return

        const reservedToString = this.selectedShop.reservedTo != null ? 
            ` (${t(`userInterfaces.shop.embeds.shop.reservedTo`, { role: roleMention(this.selectedShop.reservedTo) })})\n` : ""

        const shopEmbed = new EmbedBuilder()
            .setTitle(`${formattedEmojiableName(this.selectedShop)}`)
            .setDescription(`${reservedToString}${this.selectedShop.description ?? ""}\n${t(`userInterfaces.shop.embeds.shop.products`)} `)
            .setColor(Colors.Gold)


        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }

    protected override updateEmbeds() {
        const shopEmbed = this.embed

        if (!shopEmbed || !this.selectedShop) return

        const reservedToString = this.selectedShop.reservedTo != null ? 
            ` (${t(`userInterfaces.shop.embeds.shop.reservedTo`, { role: roleMention(this.selectedShop.reservedTo) })})\n` : ""

        shopEmbed.setTitle(`${formattedEmojiableName(this.selectedShop)}`)
        shopEmbed.setDescription(`${reservedToString}${this.selectedShop.description ?? ""}\n${t(`userInterfaces.shop.embeds.shop.products`)} `)

        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }


    protected override getEmbedFields() {
        if (this.selectedShop == null) return []
        if (Object.keys(this.selectedShop.products).length == 0) return [{ name: "\u200b", value: `🛒 ${italic(t(`userInterfaces.shop.embeds.shop.noProduct`))}` }]

        const fields: APIEmbedField[] = []

        const [error, hydratedShop] = HYDRATOR.fullyHydrateShop(this.selectedShop.id)
        if (error) throw error 

        hydratedShop.products.forEach(product => {
            const descString = product.item.description ? product.item.description : "\u200b"
            const amountString = product.stock == undefined ?  "" : 
                product.stock == 0 ? ` (${t(`userInterfaces.shop.embeds.shop.outOfStock`)})` : 
                ` (${t(`userInterfaces.shop.embeds.shop.xProductsLeft`, { x: `${product.stock}` })})`

            const [error, price] = HYDRATOR.getHydratedPrice(product.price)

            if (error) {
                PrettyLog.error(`${error.name} (${error.status}) - ${error.message}`)
                return
            }

            const formattedPrice = price.size > 0 ? formatPrice(price) : t("userInterfaces.shop.embeds.shop.free")

            fields.push({ 
                name: formattedEmojiableName(product.item),
                value: `${t(`userInterfaces.shop.embeds.shop.price`)} **${formattedPrice}**${amountString}\n${descString}`, 
                inline: true 
            })
        })

        return fields
    }

    protected override getInputSize() {
        return this.selectedShop ? Object.keys(this.selectedShop.products).length : 0
    }

    
    private isBuyingAllowed() {
        if (!this.selectedShop) return false

        const isReserved = this.selectedShop.reservedTo ?? null
        if (isReserved === null) return true
        
        if (!this.member) return false

        const isUserAuthorized = this.member.roles.cache.has(isReserved)
        const isUserAdmin = this.member.permissions.has("Administrator")

        return isUserAuthorized || isUserAdmin 
    }

}


