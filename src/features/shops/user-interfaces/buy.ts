import { getOrCreateAccount, setAccountCurrencyAmount, setAccountItemAmount } from "@/features/accounts/database/accounts-database.js"
import { Account } from "@/features/accounts/database/accounts-type.js"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { t } from "@/lib/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ComponentSeparator } from "@/ui-components/extended-components.js"
import { showEditModal, showSingleInputModal } from "@/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { MessageUserInterface, UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { objToString } from "@/utils/objects.js"
import { bold, ButtonInteraction, ButtonStyle, GuildMember, roleMention, StringSelectMenuInteraction } from "discord.js"
import { updateProduct } from "../database/products-database.js"
import { Product, PRODUCT_ACTION_TYPE } from "../database/products-types.js"
import { Shop } from "../database/shops-types.js"
import { formattedProductName } from "../utils/products.js"


export class BuyProductUserInterface extends MessageUserInterface {
    public override id = "buy-product-ui"
    protected override components = new Map()

    private selectedShop: Shop
    private selectedProduct: Product | null = null

    private quantity: number = 1

    private discountCode?: string = undefined
    private discount: number = 0

    private locale = "userInterfaces.buy" as const

    constructor (selectedShop: Shop) {
        super()
        this.selectedShop = selectedShop
    }

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        if (!this.selectedShop.products.size) {
            await replyErrorMessage(interaction, t("errorMessages.noProducts"))
            return false
        }
        return true
    }

    protected override getMessage(): string {
        const discountCodeString = this.discountCode ? `\n${t(`${this.locale}.messages.discountCode`)} ${bold(this.discountCode)}` : ""
        const priceString = this.priceString() != "" ? t(`${this.locale}.messages.price`, { price: this.priceString() }) : ""

        const message = t(`${this.locale}.messages.default`, {
            product: bold(formattedProductName(this.selectedProduct) || t("defaultComponents.selectProduct")),
            quantity: this.quantity > 1 ? `**${this.quantity}x** ` : "",
            shop: bold(this.selectedShop.name),
        })

        return `${message} ${priceString}.${discountCodeString}`
    }

    protected override initComponents(): void {
        const selectProductMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-product`,
                placeholder: t("defaultComponents.selectProduct"),
                time: 120_000,
            },
            this.selectedShop.products,
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            }
        )

        const plusButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+plus`,
                emoji: "➕",
                style: ButtonStyle.Primary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => {
                this.quantity += 1
                this.updateInteraction(interaction)
            }
        )

        const setQuantityButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+set-quantity`,
                label: t(`${this.locale}.components.setQuantityButton`),
                emoji: "🔢",
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, quantityInput] = await showEditModal(
                    interaction,
                    {
                        edit: t(`${this.locale}.components.editQuantityModalTitle`),
                        previousValue: this.quantity.toString(),
                        required: true
                    }
                )

                const quantity = parseInt(quantityInput)
                if (isNaN(quantity) || quantity < 1) return this.updateInteraction(modalSubmit)
                
                this.quantity = quantity
                this.updateInteraction(modalSubmit)
            }
        )

        const minusButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+minus`,
                label: "",
                emoji: "➖",
                style: ButtonStyle.Primary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => {
                this.quantity = Math.max(1, this.quantity - 1)
                this.updateInteraction(interaction)
            }
        )

        const buyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+buy`,
                label: t(`${this.locale}.components.buyButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.buyProduct(interaction)
        )

        const discountCodeButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+discount-code`,
                label: t(`${this.locale}.components.discountCodeButton`),
                emoji: "🎁",
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.handleSetDiscountCodeInteraction(interaction)
        )

        this.components.set(selectProductMenu.customId, selectProductMenu)
        this.components.set(plusButton.customId, plusButton)
        this.components.set(setQuantityButton.customId, setQuantityButton)
        this.components.set(minusButton.customId, minusButton)
        this.components.set("separator", new ComponentSeparator())
        this.components.set(buyButton.customId, buyButton)
        this.components.set(discountCodeButton.customId, discountCodeButton)
    }

    protected override updateComponents(): void {
        const isProductSelected = this.selectedProduct != null 
        
        const buyButton = this.components.get(`${this.id}+buy`)
        if (buyButton instanceof ExtendedButtonComponent) {
            buyButton.toggle(isProductSelected)
        }

        const isActionProduct = this.selectedProduct != null && this.selectedProduct.action != undefined

        const minusButton = this.components.get(`${this.id}+minus`)
        if (minusButton instanceof ExtendedButtonComponent) {
            minusButton.toggle(isProductSelected && this.quantity > 1 && !isActionProduct)
        }

        const setQuantityButton = this.components.get(`${this.id}+set-quantity`)
        if (setQuantityButton instanceof ExtendedButtonComponent) {
            setQuantityButton.toggle(isProductSelected && !isActionProduct)
        }

        const plusButton = this.components.get(`${this.id}+plus`)
        if (plusButton instanceof ExtendedButtonComponent) {
            plusButton.toggle(isProductSelected && !isActionProduct)
        }
    }

    private async handleSetDiscountCodeInteraction(interaction: ButtonInteraction) {
        const modalId = `${this.id}+set-discount-code-modal`

        const [modalSubmit, input] = await showSingleInputModal(interaction, {
            id: modalId,
            title: t(`${this.locale}.components.setDiscountCodeModal.title`),
            inputLabel: t(`${this.locale}.components.setDiscountCodeModal.input`),
            placeholder: "XXXXXXX",
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

        if (!this.selectedProduct) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        if (this.isNotAllowedToBuy(interaction)) {
            return replyErrorMessage(interaction, t(`${this.locale}.errorMessages.cantBuyHere`))
        }

        const [error, account] = await getOrCreateAccount(interaction.user.id)
        if (error) return replyErrorMessage(interaction, error.message)
        
        const balanceAfterBuy = this.balanceAfterBuy(account, this.selectedShop.currency.id)
        if (balanceAfterBuy < 0) {
            return replyErrorMessage(
                interaction, 
                t(`${this.locale}.errorMessages.notEnoughMoney`, { currency: bold(this.selectedShop.currency.name) })
            )
        }

        const itemStockAfterBuy = this.itemStockAfterBuy(this.selectedProduct, this.quantity)
        if (itemStockAfterBuy != undefined && itemStockAfterBuy < 0) {
            return replyErrorMessage(interaction, t(`${this.locale}.errorMessages.productNoLongerAvailable`))
        }

    
        const [error2] = await updateProduct(this.selectedShop.id, this.selectedProduct.id, { stock: itemStockAfterBuy })
        if (error2) return replyErrorMessage(interaction, error2.message)


        const [error3] = await setAccountCurrencyAmount(interaction.user.id, this.selectedShop.currency.id, balanceAfterBuy)
        if (error3) return replyErrorMessage(interaction, error3.message)
        
        if (this.selectedProduct.action != undefined) return this.buyActionProduct(interaction)

        const userProductAmount = account.inventory.get(this.selectedProduct.id)?.amount || 0

        const [error4] = await setAccountItemAmount(interaction.user.id, this.selectedProduct, userProductAmount + this.quantity)
        if (error4) return replyErrorMessage(interaction, error4.message)
        
        await this.printAndLogPurchase(interaction, this.selectedProduct)
    }

    private priceString(): string {
        if (!this.selectedProduct) return ""

        const priceAsString = this.getPrice().toFixed(2)

        const originalPriceAsString = this.selectedProduct.price.toFixed(2)
        if (this.discount != 0) return `~~${originalPriceAsString}~~ **${priceAsString} ${this.selectedShop.currency.name}**`

        return `**${priceAsString} ${this.selectedShop.currency.name}**`
    }

    private async buyActionProduct(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!this.selectedProduct) return

        let actionMessage = ""

        switch (this.selectedProduct.action?.type) {
            case PRODUCT_ACTION_TYPE.GiveRole: {
                const roleId = this.selectedProduct.action.options.roleId
                if (!roleId) return

                const member = interaction.member
                if (!(member instanceof GuildMember)) return

                member.roles.add(roleId)

                actionMessage = t(
                    `${this.locale}.actionProducts.giveRole.message`, 
                    { role: bold(roleMention(roleId)) }
                )
                break
            }
            case PRODUCT_ACTION_TYPE.GiveCurrency: {
                const currencyId = this.selectedProduct.action.options.currencyId
                if (!currencyId) return

                const amount = this.selectedProduct.action.options.amount
                if (!amount) return

                const [error, account] = await getOrCreateAccount(interaction.user.id)
                if (error) return replyErrorMessage(interaction, error.message)

                const userCurrencyAmount = account.currencies.get(this.selectedShop.currency.id)?.amount || 0

                const [error2, currency] = await setAccountCurrencyAmount(interaction.user.id, currencyId, userCurrencyAmount + amount)

                if (error2) return replyErrorMessage(interaction, error2.message)

                actionMessage = t(
                    `${this.locale}.actionProducts.giveCurrency.message`, 
                    { currency: bold(currency.name), amount: bold(`${amount}`) }
                )

                break
            }
            default:
                break
        }

        await this.printAndLogPurchase(interaction, this.selectedProduct, actionMessage)
    }

    private balanceAfterBuy(user: Account, currencyId: string) {
        const userCurrencyAmount = user.currencies.get(currencyId)?.amount || 0

        return userCurrencyAmount - this.getPrice()
    }

    private itemStockAfterBuy(product: Product, quantity: number) {
        if (product.stock == undefined) {
            return undefined
        }

        return product.stock - quantity
    }

    private getPrice() {
        if (!this.selectedProduct) return 0
        return this.quantity * this.selectedProduct.price * (1 - this.discount / 100)
    }

    private async printAndLogPurchase(interaction: UserInterfaceInteraction, product: Product, appendix?: string) {
        const productName = formattedProductName(product)
        const shopName = this.selectedShop.name
        const priceString = this.priceString()
        const discountCodeString = this.discountCode ? this.discountCode : "none"

        const message = t(`${this.locale}.messages.success`, { 
            product: bold(productName),
            shop: bold(shopName),
            quantity: this.quantity > 1 ? `**${this.quantity}x** ` : "",
            price: priceString
        })

        const appendixString = appendix ? `\n${appendix}` : ""

        await updateAsSuccessMessage(interaction, `${message}${appendixString}`)

        if (interaction.guild) {
            logToDiscord(interaction.guild, 
                `${interaction.member} purchased ${this.quantity}x **${productName}** from **${shopName}** for ${priceString}.\nDiscount code: ${discountCodeString}. Action: ${product.action != undefined ? `${product.action.type} (${objToString(product.action.options)})` : "none"}`
            )
        }
    }

    private isNotAllowedToBuy(interaction: UserInterfaceInteraction) {
        console.log(`reservedTo: ${this.selectedShop.reservedTo}`)

        return this.selectedShop.reservedTo != undefined
            && interaction.member instanceof GuildMember 
            && !(interaction.member.roles.cache.has(this.selectedShop.reservedTo) || interaction.member.permissions.has("Administrator"))
    }
}