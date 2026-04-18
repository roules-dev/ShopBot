import { HYDRATOR } from "@/core/database/init-databases.js"
import { t } from "@/core/i18n/i18n.js"
import { processPurchase } from "@/core/services/shops/buy.js"
import { NanoId } from "@/database/database.types.js"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { Identifiable, Labelled } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ComponentSeparator } from "@/lib/ui/ui-components/extended-components.js"
import { showSingleInputModal, showValidatedEditModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { MessageUserInterface } from "@/lib/ui/user-interfaces/user-interfaces.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { stringifyObj } from "@/utils/objects.js"
import { bold, ButtonInteraction, ButtonStyle, GuildMember } from "discord.js"
import z from "zod"
import { Product } from "../database/products.types.js"
import { Shop } from "../database/shops.types.js"
import { applyQuantityHydrated, formatPrice } from "../services/price.js"


export class BuyProductUserInterface extends MessageUserInterface {
    public override id = "buy-product-ui"
    protected override components = new Map()

    private selectedShop: Shop & Identifiable<NanoId>
    private selectedProduct: Product & Identifiable<NanoId> & Labelled | null = null

    private quantity: number = 1

    private discountCode?: string = undefined
    private discount: number = 0

    private locale = "userInterfaces.buy" as const

    constructor (selectedShop: Shop & Identifiable<NanoId>) {
        super()
        this.selectedShop = selectedShop
    }

    protected override async predisplay(interaction: UserInterfaceInteraction) {
        if (Object.keys(this.selectedShop.products).length === 0) {
            await replyErrorMessage(interaction, t("errorMessages.noProducts"))
            return false
        }
        return true
    }

    protected override getMessage() {
        const discountCodeString = this.discountCode ? `\n${t(`${this.locale}.messages.discountCode`)} ${bold(this.discountCode)}` : ""

        const priceString = this.priceString() != "" ? t(`${this.locale}.messages.price`, { price: this.priceString() }) : ""

        const message = t(`${this.locale}.messages.default`, {
            product: bold(formattedEmojiableName(this.selectedProduct) || t("defaultComponents.selectProduct")),
            quantity: this.quantity > 1 ? `**${this.quantity}x** ` : "",
            shop: bold(this.selectedShop.name),
        })

        return `${message} ${priceString}.${discountCodeString}`
    }

    protected override initComponents() {
        const [error, shop] = HYDRATOR.fullyHydrateShop(this.selectedShop.id)
        if (error) throw error

        const selectProductMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-product`,
                placeholder: t("defaultComponents.selectProduct"),
                time: 120_000,
            },
            shop.products,
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
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
                const [modalSubmit, [error, quantity]] = await showValidatedEditModal(
                    interaction,
                    {
                        edit: t(`${this.locale}.components.editQuantityModalTitle`),
                        previousValue: this.quantity.toString(),
                        required: true
                    },
                    z.coerce.number().int().min(1).transform(n => Math.floor(n))
                )
                
                if (error) return replyErrorMessage(modalSubmit, error.message)

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

    protected override updateComponents() {
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

        const [modalSubmit, [error, input]] = await showSingleInputModal(interaction, {
            id: modalId,
            title: t(`${this.locale}.components.setDiscountCodeModal.title`),
            inputLabel: t(`${this.locale}.components.setDiscountCodeModal.input`),
            placeholder: "XXXXXXX",
            required: true,
            minLength: 6,
            maxLength: 8
        })

        if (error) return replyErrorMessage(modalSubmit, error.message)

        const shopDiscountCodes = this.selectedShop.discountCodes
        if (!shopDiscountCodes[input]) return this.updateInteraction(modalSubmit)

        this.discountCode = input
        this.discount = shopDiscountCodes[input]
        this.updateInteraction(modalSubmit)
    }

    private async buyProduct(interaction: UserInterfaceInteraction) {

        if (!this.selectedProduct) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        if (!(interaction.member instanceof GuildMember)) return updateAsErrorMessage(interaction, "Unexpected error: member is not a guild member")

        const [error, buyResult] = await processPurchase(interaction.member, this.selectedShop, this.selectedProduct, this.quantity, this.discount)

        if (error === null) {
            return this.printAndLogPurchase(interaction, this.selectedProduct, buyResult.quantity, buyResult.message)
        }

        const errorName = error.name
        switch (errorName) {
            case "ApiError":
            case "DatabaseError":
                return updateAsErrorMessage(interaction, error.message)

            case "NotAllowedToBuy":
                return updateAsErrorMessage(interaction, t(`${this.locale}.errorMessages.cantBuyHere`))
            
            case "NotEnoughMoney": {
                const currenciesName = error.currencies.map(c => formattedEmojiableName((HYDRATOR.hydrateCurrency(c))[1])).join(", ")
                return updateAsErrorMessage(interaction, t(`${this.locale}.errorMessages.notEnoughMoney`, { currency: bold(currenciesName) }))
            }
            
            case "ProductNoLongerAvailable":
                return updateAsErrorMessage(interaction, t(`${this.locale}.errorMessages.productNoLongerAvailable`))

            default:
                assertNeverReached(errorName)
        }
    }


    private priceString() {
        if (!this.selectedProduct) return "No product selected"

        const [error, price] = HYDRATOR.getHydratedProductPrice(this.selectedProduct)
        if (error) {
            PrettyLog.error(`${error.name} (${error.status}) - ${error.message}`)
            return "❌ error displaying price"
        }    

        return formatPrice(applyQuantityHydrated(price, this.quantity), this.discount)
    }


    private async printAndLogPurchase(interaction: UserInterfaceInteraction, product: Product & Labelled, quantity: number, appendix?: string) {

        const productName = formattedEmojiableName(product)
        const shopName = this.selectedShop.name
        const priceString = this.priceString()
        const discountCodeString = this.discountCode ? this.discountCode : "none"

        const message = t(`${this.locale}.messages.success`, { 
            product: bold(productName),
            shop: bold(shopName),
            quantity: quantity > 1 ? `**${quantity}x** ` : "",
            price: priceString
        })

        const appendixString = appendix ? `\n${appendix}` : ""

        await updateAsSuccessMessage(interaction, `${message}${appendixString}`)

        if (interaction.guild) {
            logToDiscord(interaction.guild, 
                `${interaction.member} purchased ${quantity}x **${productName}** from **${shopName}** for ${priceString}.\nDiscount code: ${discountCodeString}. Action: ${product.action != undefined ? `${product.action.type} (${stringifyObj(product.action.options)})` : "none"}`
            )
        }
    }

}