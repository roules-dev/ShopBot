import { logToDiscord } from "@/app/services/logging.js"
import { HYDRATOR } from "@/core/database/init-databases.js"
import { t } from "@/core/i18n/i18n.js"
import { processPurchase } from "@/core/services/shops/buy.js"
import { NanoId } from "@/database/database.types.js"
import { errorFormat, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { assertNeverReached, err, ok } from "@/lib/error-handling.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { Identifiable, Labelled } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/components/button.js"
import { ComponentSeparator, createComponent } from "@/lib/ui/components/extended-components.js"
import { showSingleInputModal, showValidatedEditModal } from "@/lib/ui/components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/components/string-select-menu.js"
import { MessageUserInterface } from "@/lib/ui/user-interfaces/user-interfaces.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { stringifyObj } from "@/utils/objects.js"
import { bold, ButtonInteraction, ButtonStyle, GuildMember } from "discord.js"
import z from "zod"
import { Product } from "../../database/products.types.js"
import { Shop } from "../../database/shops.types.js"
import { applyQuantityHydrated, formatPrice } from "../../services/price.js"


export class BuyProductUserInterface extends MessageUserInterface {
    public override get id(): string { 
        return "buy-product-ui" 
    }

    private selectedShop: Shop & Identifiable<NanoId>
    private selectedProduct: Product & Identifiable<NanoId> & Labelled | null = null

    private quantity: number = 1

    private discountCode?: string = undefined
    private discount: number = 0

    constructor (selectedShop: Shop & Identifiable<NanoId>) {
        super()
        this.selectedShop = selectedShop
        this.populateProductSelectMenu()
    }

    protected override async prepare(_interaction: UserInterfaceInteraction) {
        if (Object.keys(this.selectedShop.products).length === 0) {
            return err(t("errorMessages.noProducts"))
        }
        return ok(true)
    }

    protected override getMessage() {
        const discountCodeString = this.discountCode ? `\n${t(`userInterfaces.buy.messages.discountCode`)} ${bold(this.discountCode)}` : ""

        const priceString = this.priceString()
        const displayPrice = priceString !== null ? t(`userInterfaces.buy.messages.price`, { price: bold(priceString) }) : ""

        const message = t(`userInterfaces.buy.messages.default`, {
            product: bold(formattedEmojiableName(this.selectedProduct) || t("defaultComponents.selectProduct")),
            quantity: this.quantity > 1 ? `**${this.quantity}x** ` : "",
            shop: bold(formattedEmojiableName(this.selectedShop)),
        })

        return `${message} ${displayPrice}.${discountCodeString}`
    }

    protected override initComponents() {
        const selectProductMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-product`,
                placeholder: t("defaultComponents.selectProduct"),
                time: 120_000,
            },
            new Map<NanoId, Product & Identifiable<NanoId> & Labelled>(),
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
                label: t(`userInterfaces.buy.components.setQuantityButton`),
                emoji: "🔢",
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, [error, quantity]] = await showValidatedEditModal(
                    interaction,
                    {
                        edit: t(`userInterfaces.buy.components.editQuantityModalTitle`),
                        previousValue: this.quantity.toString(),
                        required: true
                    },
                    z.coerce.number().int().min(1).transform(n => Math.floor(n))
                )
                
                if (error) {
                    if (error.name === "ModalTimeout") return
                    return replyErrorMessage(modalSubmit, error.message)
                }

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
                label: t(`userInterfaces.buy.components.buyButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.buyProduct(interaction)
        )

        const discountCodeButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+discount-code`,
                label: t(`userInterfaces.buy.components.discountCodeButton`),
                emoji: "🎁",
                style: ButtonStyle.Secondary,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.handleSetDiscountCodeInteraction(interaction)
        )

        return [
            createComponent(selectProductMenu),

            createComponent(plusButton, () => plusButton.toggle(this.selectedProduct != null && !this.selectedProduct.action)),
            createComponent(setQuantityButton, () => setQuantityButton.toggle(this.selectedProduct != null && !this.selectedProduct.action)),
            createComponent(minusButton, () => minusButton.toggle(this.quantity > 1 && this.selectedProduct != null && !this.selectedProduct.action)),

            new ComponentSeparator("separator1"),

            createComponent(buyButton, () => buyButton.toggle(this.selectedProduct != null)),
            createComponent(discountCodeButton),
        ]
    }

    private populateProductSelectMenu() {
        const [error, shop] = HYDRATOR.fullyHydrateShop(this.selectedShop.id)
        if (error) throw error

        const productSelectMenu = this.components.get(`${this.id}+select-product`)

        if (!productSelectMenu || 
            productSelectMenu instanceof ComponentSeparator || 
            !(productSelectMenu.comp instanceof ExtendedStringSelectMenuComponent)
            ) {
                throw new Error("Unexpected Error: Product select menu not found")
            }

        productSelectMenu.comp.updateMap(shop.products)
    }

    private async handleSetDiscountCodeInteraction(interaction: ButtonInteraction) {
        const modalId = `${this.id}+set-discount-code-modal`

        const [modalSubmit, [error, input]] = await showSingleInputModal(interaction, {
            id: modalId,
            title: t(`userInterfaces.buy.components.setDiscountCodeModal.title`),
            inputLabel: t(`userInterfaces.buy.components.setDiscountCodeModal.input`),
            placeholder: "XXXXXXX",
            required: true,
            minLength: 6,
            maxLength: 8
        })

        if (error) {
            if (error.name === "ModalTimeout") return
            return replyErrorMessage(modalSubmit, error.message)
        }

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
                return updateAsErrorMessage(interaction, t(`userInterfaces.buy.errorMessages.cantBuyHere`))
            
            case "NotEnoughMoney": {
                const currenciesName = error.currencies.map(c => formattedEmojiableName((HYDRATOR.hydrateCurrency(c))[1])).join(", ")
                return updateAsErrorMessage(interaction, t(`userInterfaces.buy.errorMessages.notEnoughMoney`, { currency: bold(currenciesName) }))
            }
            
            case "ProductNoLongerAvailable":
                return updateAsErrorMessage(interaction, t(`userInterfaces.buy.errorMessages.productNoLongerAvailable`))

            default:
                assertNeverReached(errorName)
        }
    }


    private priceString() {
        if (!this.selectedProduct) return null

        const [error, price] = HYDRATOR.getHydratedPrice(this.selectedProduct.price)
        if (error) {
            PrettyLog.error(`${error.name} (${error.status}) - ${error.message}`)
            return errorFormat(t("errorMessages.hydration.priceDisplayFailed"))
        }    

        return price.size > 0 ? formatPrice(applyQuantityHydrated(price, this.quantity), this.discount) : t("userInterfaces.buy.messages.free")
    }


    private async printAndLogPurchase(interaction: UserInterfaceInteraction, product: Product & Labelled, quantity: number, appendix?: string) {

        const productName = formattedEmojiableName(product)
        const shopName = formattedEmojiableName(this.selectedShop)
        const priceString = this.priceString() ?? errorFormat(t("errorMessages.hydration.priceDisplayFailed"))
        const discountCodeString = this.discountCode ? this.discountCode : "none"

        const message = t(`userInterfaces.buy.messages.success`, { 
            product: bold(productName),
            shop: bold(shopName),
            quantity: quantity > 1 ? `**${quantity}x** ` : "",
            price: bold(priceString)
        })

        const appendixString = appendix ? `\n${appendix}` : ""

        await updateAsSuccessMessage(interaction, `${message}${appendixString}`)

        if (interaction.guild) {
            logToDiscord(interaction.guild, 
                `${interaction.member} purchased ${quantity}x **${productName}** from **${shopName}** for ${priceString}.\nDiscount code: ${discountCodeString}. Action: ${product.action != undefined ? `${product.action.kind} (${stringifyObj(product.action.options)})` : "none"}`
            )
        }
    }

}