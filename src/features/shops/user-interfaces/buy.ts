import { getOrCreateAccount, setAccountCurrencyAmount, setAccountItemAmount } from "@/features/accounts/database/accounts-database.js"
import { Account } from "@/features/accounts/database/accounts-type.js"
import { getCurrencyName } from "@/features/currencies/database/currencies-database.js"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { defaultComponents, errorMessages, getLocale } from "@/lib/localization/localization.js"
import { replaceTemplates } from "@/lib/localization/translate.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { showSingleInputModal } from "@/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { MessageUserInterface, UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { bold, ButtonInteraction, ButtonStyle, GuildMember, roleMention, StringSelectMenuInteraction } from "discord.js"
import { getProductName, updateProduct } from "../database/products-database.js"
import { Product, PRODUCT_ACTION_TYPE } from "../database/products-types.js"
import { getShopName } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"


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
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            }
        )

        // TODO : select number of items to buy (modal and/or buttons)
        //? user suggestion #17


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

        const [modalSubmit, input] = await showSingleInputModal(interaction, {
            id: modalId,
            title: this.locale.components.setDiscountCodeModal.title,
            inputLabel: this.locale.components.setDiscountCodeModal.input,
            placeholder: 'XXXXXXX',
            required: true,
            minLength: 6,
            maxLength: 8
        })

        const shopDiscountCodes = this.selectedShop.discountCodes
        if (!shopDiscountCodes[input]) return this.updateInteraction(modalSubmit)

        this.discountCode = input
        this.discount = shopDiscountCodes[input]
        this.updateInteraction(modalSubmit)
    }

    private async buyProduct(interaction: UserInterfaceInteraction) {

        if (!this.selectedProduct) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        
        if (this.isNotAllowedToBuy(interaction)) {
            return replyErrorMessage(interaction, this.locale.errorMessages.cantBuyHere)
        }

        const user = await getOrCreateAccount(interaction.user.id)
        
        const balanceAfterBuy = this.balanceAfterBuy(user, this.selectedProduct, this.selectedShop.currency.id)
        if (balanceAfterBuy < 0) {
            return replyErrorMessage(
                interaction, 
                replaceTemplates(this.locale.errorMessages.notEnoughMoney, { currency: bold(getCurrencyName(this.selectedShop.currency.id)!) })
            )
        }

        const itemStockAfterBuy = this.itemStockAfterBuy(this.selectedProduct, 1)
        if (itemStockAfterBuy != undefined && itemStockAfterBuy < 0) {
            return replyErrorMessage(interaction, this.locale.errorMessages.productNoLongerAvailable)
        }

        if (itemStockAfterBuy != undefined) {
            updateProduct(this.selectedShop.id, this.selectedProduct.id, { amount: itemStockAfterBuy })
        }

        const [error] = await setAccountCurrencyAmount(interaction.user.id, this.selectedShop.currency.id, balanceAfterBuy)
        if (error) return replyErrorMessage(interaction, error.message)
        
        if (this.selectedProduct.action != undefined) return this.buyActionProduct(interaction)

        const userProductAmount = user.inventory.get(this.selectedProduct.id)?.amount || 0
        await setAccountItemAmount(interaction.user.id, this.selectedProduct, userProductAmount + 1)

        await this.printAndLogPurchase(interaction, this.selectedProduct)
    }

    private priceString(): string {
        if (!this.selectedProduct) return ''

        const price = this.selectedProduct.price * (1 - this.discount / 100)
        const priceAsString = price.toFixed(2)

        const originalPriceAsString = this.selectedProduct.price.toFixed(2)
        if (this.discount != 0) return `~~${originalPriceAsString}~~ **${priceAsString} ${getCurrencyName(this.selectedShop.currency.id)!}**`

        return `**${priceAsString} ${getCurrencyName(this.selectedShop.currency.id)!}**`
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

                actionMessage = replaceTemplates(
                    this.locale.actionProducts.giveRole.message, 
                    { role: bold(roleMention(roleId)) }
                )
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

                actionMessage = replaceTemplates(
                    this.locale.actionProducts.giveCurrency.message, 
                    { currency: getCurrencyName(currency)!, amount }
                )

                break
            }
            default:
                break
        }

        await this.printAndLogPurchase(interaction, this.selectedProduct, actionMessage)
    }

    private balanceAfterBuy(user: Account, selectedProduct: Product, currencyId: string) {
        const userCurrencyAmount = user.currencies.get(currencyId)?.amount || 0
        const price = selectedProduct.price * (1 - this.discount / 100)

        return userCurrencyAmount - price
    }

    private itemStockAfterBuy(product: Product, amountToBuy: number) {
        if (product.amount == undefined) {
            return undefined
        }

        return product.amount - amountToBuy
    }

    private async printAndLogPurchase(interaction: UserInterfaceInteraction, product: Product, appendix?: string) {
        const productName = getProductName(this.selectedShop.id, product.id) || 'unknown product'
        const shopName = getShopName(this.selectedShop.id) || 'unknown shop'
        const priceString = this.priceString()
        const discountCodeString = this.discountCode ? this.discountCode : 'none'

        const message = replaceTemplates(this.locale.messages.success, { 
            product: bold(productName),
            shop: bold(shopName),
            price: priceString
        })

        const appendixString = appendix ? `\n${appendix}` : ''

        await updateAsSuccessMessage(interaction, `${message}${appendixString}`)

        logToDiscord(interaction, 
            `${interaction.member} purchased ${productName} from ${shopName} for ${priceString} with discount code ${discountCodeString}. Action: ${product.action?.type || 'none'} ${appendixString}`
        )
    }

    private isNotAllowedToBuy(interaction: UserInterfaceInteraction) {
        console.log(`reservedTo: ${this.selectedShop.reservedTo}`)

        return this.selectedShop.reservedTo != undefined
            && interaction.member instanceof GuildMember 
            && !(interaction.member?.roles.cache.has(this.selectedShop.reservedTo) || interaction.member.permissions.has('Administrator'))
    }
}