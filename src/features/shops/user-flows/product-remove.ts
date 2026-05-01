import { t } from "@/core/i18n/i18n.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction } from "discord.js"

import { HYDRATOR } from "@/core/database/init-databases.js"
import { removeProduct } from "@/core/services/shops/products.services.js"
import { getShops } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable, Labelled } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { Product } from "../database/products.types.js"
import { Shop } from "../database/shops.types.js"


export class RemoveProductFlow extends UserFlow {
    public override get id(): string { 
        return "remove-product" 
    }

    private selectedShop: Shop & Identifiable<NanoId> | null = null
    private selectedProduct: Product & Identifiable<NanoId> & Labelled | null = null

    public override async prestart(_interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return err(t("errorMessages.noShops"))

        return ok(true)
    }

    protected getMessage() {
        if (this.selectedShop == null) {
            return t(`userFlows.productRemove.messages.shopSelectStage`, {shop: bold(t("defaultComponents.selectShop"))})
        }

        return t(`userFlows.productRemove.messages.productSelectStage`, {
            shop: bold(formattedEmojiableName(this.selectedShop)),
            product: bold(formattedEmojiableName(this.selectedProduct) || t("defaultComponents.selectProduct"))
        })
    }

    protected initComponents() {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                // check if shop has no products give error message
                this.selectedShop = selected
                this.selectedProduct = null
                this.updateInteraction(interaction)
            }
        )

        const productSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-product`,
                placeholder: t("defaultComponents.selectProduct"),
                time: 120_000
            }, 
            new Map<NanoId, Product & Identifiable<NanoId> & Labelled>(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedProduct = selected

                this.updateInteraction(interaction)
            }
        )

        const submitRemoveButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+remove-product`,
                label: t(`userFlows.productRemove.components.submitButton`),
                emoji: "⛔",
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        return [
            createComponent(shopSelectMenu),

            createComponent(productSelectMenu, () => {
                productSelectMenu.toggle(this.selectedShop != null)

                if (!this.selectedShop) return productSelectMenu.updateMap(new Map())

                const [error, shop] = HYDRATOR.fullyHydrateShop(this.selectedShop.id)
                if (error) throw error
                productSelectMenu.updateMap(shop.products)
            }),

            createComponent(submitRemoveButton, () => submitRemoveButton.toggle(
                this.selectedShop != null && this.selectedProduct != null
            )),
        ]
    }

    protected async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.selectedProduct) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const oldProductName = formattedEmojiableName(this.selectedProduct)

        const [error] =await removeProduct(this.selectedShop.id, this.selectedProduct.id)

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productRemove.messages.success`, {
            product: bold(oldProductName),
            shop: bold(formattedEmojiableName(this.selectedShop))
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}
