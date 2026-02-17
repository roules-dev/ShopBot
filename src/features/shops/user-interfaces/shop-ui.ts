import { getOrCreateAccount, setAccountCurrencyAmount, setAccountItemAmount } from "@/features/accounts/database/accounts-database.js"
import { AccountUserInterface } from "@/features/accounts/user-interfaces/account-ui.js"
import { getCurrencyName } from "@/features/currencies/database/currencies-database.js"
import { getProductName, updateProduct } from "@/features/shops/database/products-database.js"
import { Product, PRODUCT_ACTION_TYPE } from "@/features/shops/database/products-types.js"
import { getShopName, getShops } from "@/features/shops/database/shops-database.js"
import { Shop } from "@/features/shops/database/shops-types.js"
import { defaultComponents, errorMessages, getLocale, replaceTemplates } from "@/lib/localisation.js"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent } from "@/user-interfaces/extended-components.js"
import { MessageUserInterface, PaginatedEmbedUserInterface, UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/utils/discord.js"
import { APIEmbedField, bold, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, GuildMember, InteractionCallbackResponse, italic, LabelBuilder, ModalBuilder, ModalSubmitInteraction, roleMention, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js"

export class ShopUserInterface extends PaginatedEmbedUserInterface {
    public override id = 'shop-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()
    protected override embed: EmbedBuilder | null = null

    private selectedShop: Shop | null = null

    protected override page: number = 0
    protected override response: InteractionCallbackResponse | null = null

    private member: GuildMember | null = null

    protected locale = getLocale().userInterfaces.shop

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        this.selectedShop = shops.values().next().value!

        this.member = interaction.member as GuildMember ?? null
    }

    protected override getMessage(): string { return '' }

    protected override initComponents(): void {
        const selectShopMenu = new ExtendedStringSelectMenuComponent(
            { customId : `${this.id}+select-shop`, placeholder: defaultComponents().selectShop, time: 120_000 },
            getShops(),
            async (interaction: StringSelectMenuInteraction, selected: Shop) => {
                this.page = 0
                this.selectedShop = selected
                this.updateInteraction(interaction) 
            }
        )

        const buyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+buy`,
                label: this.locale.components.buyButton,
                emoji: {name: '🪙'},
                style: ButtonStyle.Primary,
                time: 120_000,
                disabled: this.isBuyButtonDisabled()
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedShop) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

                const buyProductUI = new BuyProductUserInterface(this.selectedShop)
                return buyProductUI.display(interaction)
            }
        )

        const showAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+show-account`,
                label: this.locale.components.showAccountButton,
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
            ` (${replaceTemplates(this.locale.embeds.shop.reservedTo, { role: roleMention(this.selectedShop.reservedTo) })})\n` : ''

        const shopEmbed = new EmbedBuilder()
            .setTitle(`${getShopName(this.selectedShop.id)!}`)
            .setDescription(`${reservedToString}${this.selectedShop.description}\n${this.locale.embeds.shop.products} `)
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
            ` (${replaceTemplates(this.locale.embeds.shop.reservedTo, { role: roleMention(this.selectedShop.reservedTo) })})\n` : ''

        shopEmbed.setTitle(`${getShopName(this.selectedShop.id)!}`)
        shopEmbed.setDescription(`${reservedToString}${this.selectedShop.description}\n${this.locale.embeds.shop.products} `)

        shopEmbed.setFields(this.getPageEmbedFields())

        this.embed = shopEmbed
    }


    protected override getEmbedFields(): APIEmbedField[] {
        if (!this.selectedShop) return []
        if (this.selectedShop.products.size == 0) return [{ name: '\u200b', value: `🛒 ${italic(this.locale.embeds.shop.noProduct)}` }]

        const fields: APIEmbedField[] = []

        this.selectedShop.products.forEach(product => {
            const descString = product.description ? product.description : '\u200b'
            const amountString = product.amount == undefined ?  '' : 
                product.amount == 0 ? ` (${this.locale.embeds.shop.outOfStock})` : 
                ` (${replaceTemplates(this.locale.embeds.shop.xProductsLeft, { x: product.amount })})`

            fields.push({ 
                name: getProductName(this.selectedShop!.id, product.id)!,
                value: `${this.locale.embeds.shop.price} **${product.price} ${getCurrencyName(this.selectedShop!.currency.id)}**${amountString}\n${descString}`, 
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


export class BuyProductUserInterface extends MessageUserInterface {
    public override id = 'buy-product-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop
    private selectedProduct: Product | null = null

    private discountCode?: string = undefined
    private discount: number = 0

    private locale = getLocale().userInterfaces.buy

    constructor (selectedShop: Shop) {
        super()
        this.selectedShop = selectedShop
    }

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        if (!this.selectedShop.products.size) return await replyErrorMessage(interaction, errorMessages().noProducts)
    }

    protected override getMessage(): string {
        const discountCodeString = this.discountCode ? `\n${this.locale.messages.discountCode} ${bold(this.discountCode)}` : ''
        const priceString = this.priceString() != '' ? replaceTemplates(this.locale.messages.price, { price: this.priceString() }) : ''

        const message = replaceTemplates(this.locale.messages.default, {
            product: bold(getProductName(this.selectedShop.id, this.selectedProduct?.id) || defaultComponents().selectProduct),
            shop: bold(getShopName(this.selectedShop.id)!),
        })

        return `${message}${priceString}.${discountCodeString}`
    }

    protected override initComponents(): void {
        const selectProductMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-product`,
                placeholder: defaultComponents().selectProduct,
                time: 120_000,
            },
            this.selectedShop.products,
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            }
        )

        const buyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+buy`,
                label: this.locale.components.buyButton,
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.buyProduct(interaction)
        )

        const discountCodeButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+discount-code`,
                label: this.locale.components.discountCodeButton,
                emoji: {name: '🎁'},
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.handleSetDiscountCodeInteraction(interaction)
        )

        this.components.set(selectProductMenu.customId, selectProductMenu)
        this.components.set(buyButton.customId, buyButton)
        this.components.set(discountCodeButton.customId, discountCodeButton)
    }

    protected override updateComponents(): void {
        const buyButton = this.components.get(`${this.id}+buy`)
        if (buyButton instanceof ExtendedButtonComponent) {
            buyButton.toggle(this.selectedProduct != null)
        }
    }

    private async handleSetDiscountCodeInteraction(interaction: ButtonInteraction) {
        const modalId = `${this.id}+set-discount-code-modal`

        const modal = new ModalBuilder()
            .setCustomId(modalId)
            .setTitle(this.locale.components.setDiscountCodeModal.title)

        const discountCodeInput = new TextInputBuilder()
            .setCustomId('discount-code-input')
            .setPlaceholder('XXXXXXX')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(8)
            .setMinLength(6)

        const label = new LabelBuilder()
            .setLabel(this.locale.components.setDiscountCodeModal.input)
            .setTextInputComponent(discountCodeInput)

        modal.addLabelComponents(label)

        await interaction.showModal(modal)

        const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
        const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 }).catch(() => null)
        
        if (!modalSubmit) return

        const input = modalSubmit.fields.getTextInputValue('discount-code-input')
        if (!input) return this.updateInteraction(modalSubmit)

        const shopDiscountCodes = this.selectedShop.discountCodes
        if (!shopDiscountCodes[input]) return this.updateInteraction(modalSubmit)

        this.discountCode = input
        this.discount = shopDiscountCodes[input]
        this.updateInteraction(modalSubmit)
    }

    private async buyProduct(interaction: UserInterfaceInteraction): Promise<unknown> { // TODO: split this method into smaller methods
        if (!this.selectedProduct) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        
        if (this.selectedShop.reservedTo 
            && interaction.member instanceof GuildMember 
            && !(interaction.member?.roles.cache.has(this.selectedShop.reservedTo) || interaction.member.permissions.has('Administrator'))
        ) {
            return replyErrorMessage(interaction, this.locale.errorMessages.cantBuyHere)
        }

        const user = await getOrCreateAccount(interaction.user.id)
        
        const userCurrencyAmount = user.currencies.get(this.selectedShop.currency.id)?.amount || 0
        const price = this.selectedProduct.price * (1 - this.discount / 100)

        if (userCurrencyAmount < price) return replyErrorMessage(interaction, replaceTemplates(this.locale.errorMessages.notEnoughMoney, { currency: bold(getCurrencyName(this.selectedShop.currency.id)!) }))
        
        const [error] = await setAccountCurrencyAmount(interaction.user.id, this.selectedShop.currency.id, userCurrencyAmount - price)
        if (error) return replyErrorMessage(interaction, error.message)

        if (this.selectedProduct.amount != undefined && this.selectedProduct.amount <= 0) return replyErrorMessage(interaction, this.locale.errorMessages.productNoLongerAvailable)
        if (this.selectedProduct.amount != undefined) updateProduct(this.selectedShop.id, this.selectedProduct.id, { amount: this.selectedProduct.amount - 1 })

        if (this.selectedProduct.action != undefined) return this.buyActionProduct(interaction)

        const userProductAmount = user.inventory.get(this.selectedProduct.id)?.amount || 0
        
        await setAccountItemAmount(interaction.user.id, this.selectedProduct, userProductAmount + 1)

        const message = replaceTemplates(this.locale.messages.success, { 
            product: bold(getProductName(this.selectedShop.id, this.selectedProduct.id)!),
            shop: bold(getShopName(this.selectedShop.id)!),
            price: this.priceString()
        })

        await updateAsSuccessMessage(interaction, message)

        logToDiscord(interaction, `${interaction.member} purchased ${getProductName(this.selectedShop.id, this.selectedProduct.id)!} from ${getShopName(this.selectedShop.id)!} for ${this.priceString()} with discount code ${this.discountCode ? this.discountCode : 'none'}`)
        return
         
    }

    private priceString(): string {
        if (!this.selectedProduct) return ''
        const price = this.selectedProduct.price * (1 - this.discount / 100)
        return (this.discount == 0) ? `**${price} ${getCurrencyName(this.selectedShop.currency.id)!}**` : `~~${this.selectedProduct.price}~~ **${price} ${getCurrencyName(this.selectedShop.currency.id)!}**`
    }

    private async buyActionProduct(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!this.selectedProduct) return

        let actionMessage = ''

        switch (this.selectedProduct.action?.type) {
            case PRODUCT_ACTION_TYPE.GiveRole: {
                const roleId = this.selectedProduct.action.options.roleId
                if (!roleId) return

                const member = interaction.member
                if (!(member instanceof GuildMember)) return

                member.roles.add(roleId)

                actionMessage = replaceTemplates(this.locale.actionProducts.giveRole.message, { role: bold(roleMention(roleId)) })
                break
            }
            case PRODUCT_ACTION_TYPE.GiveCurrency: {
                const currency = this.selectedProduct.action.options.currencyId
                if (!currency) return

                const amount = this.selectedProduct.action.options.amount
                if (!amount) return

                const user = await getOrCreateAccount(interaction.user.id)
                const userCurrencyAmount = user.currencies.get(this.selectedShop.currency.id)?.amount || 0

                setAccountCurrencyAmount(interaction.user.id, currency, userCurrencyAmount + amount)

                actionMessage = replaceTemplates(this.locale.actionProducts.giveCurrency.message, { currency: getCurrencyName(currency)!, amount })
                break
            }
            default:
                break
        }

            const message = replaceTemplates(this.locale.messages.success, { 
                product: bold(getProductName(this.selectedShop.id, this.selectedProduct.id)!),
                shop: bold(getShopName(this.selectedShop.id)!),
                price: this.priceString()
            })


        await updateAsSuccessMessage(interaction, `${message}.\n${actionMessage}`)

        logToDiscord(interaction, `${interaction.member} purchased ${getProductName(this.selectedShop.id, this.selectedProduct.id)!} from ${getShopName(this.selectedShop.id)!} for ${this.priceString()} with discount code ${this.discountCode ? this.discountCode : 'none'}. Action: ${this.selectedProduct.action?.type || 'none'} ${actionMessage}`)
        return

    }
}