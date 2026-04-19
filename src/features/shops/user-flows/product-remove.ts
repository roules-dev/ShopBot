import { t } from "@/core/i18n/i18n.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ComponentSeparator, createComponent, ExtendedComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags } from "discord.js"

import { HYDRATOR } from "@/core/database/init-databases.js"
import { removeProduct } from "@/core/services/shops/products.services.js"
import { getShops } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { Identifiable, Labelled } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { Product } from "../database/products.types.js"
import { Shop } from "../database/shops.types.js"

export const REMOVE_PRODUCT_FLOW_STAGE = {
    SELECT_SHOP: "SELECT_SHOP",
    SELECT_PRODUCT: "SELECT_PRODUCT",
} as const

export type RemoveProductFlowStage = keyof typeof REMOVE_PRODUCT_FLOW_STAGE

export class RemoveProductFlow extends UserFlow {
    public override get id(): string { 
        return "remove-product" 
    }

    private stage: RemoveProductFlowStage = REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP
    private componentsByStage: Map<RemoveProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop & Identifiable<NanoId> | null = null
    private selectedProduct: Product & Identifiable<NanoId> & Labelled | null = null

    private response: InteractionCallbackResponse | null = null

    

    public async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected getMessage() {
        switch (this.stage) {
            case REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP:
                return t(`userFlows.productRemove.messages.shopSelectStage`, {
                    shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop"))
                })
            case REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT:
                if (this.selectedShop == null) throw new Error("Unexpected null selectedShop in REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT stage")

                return t(`userFlows.productRemove.messages.productSelectStage`, {
                    product: bold(formattedEmojiableName(this.selectedProduct) || t("defaultComponents.selectProduct")),
                    shop: bold(this.selectedShop.name)
                })

            default:
                assertNeverReached(this.stage)
        }
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
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-shop`,
                time: 120_000,
                label: t("defaultComponents.submitShopButton"),
                emoji: {name: "✅"},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => {
                if (this.selectedShop == null) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
                if (Object.keys(this.selectedShop.products).length == 0) return updateAsErrorMessage(interaction, t("errorMessages.noProducts"))

                this.changeStage(REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP, new Map())
        this.componentsByStage.get(REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)


        const productSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-product`,
                placeholder: t("defaultComponents.selectProduct"),
                time: 120_000
            }, 
            new Map(), 
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
                emoji: {name: "⛔"},
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop`,
                label: t("defaultComponents.changeShopButton"),
                emoji: {name: "📝"},
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedProduct = null

                this.changeStage(REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT, new Map())
        this.componentsByStage.get(REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT)?.set(productSelectMenu.customId, productSelectMenu)
        this.componentsByStage.get(REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT)?.set(submitRemoveButton.customId, submitRemoveButton)
        this.componentsByStage.get(REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT)?.set(changeShopButton.customId, changeShopButton)

        return [
            createComponent(shopSelectMenu),
            createComponent(submitShopButton, () => submitShopButton.toggle(this.selectedShop != null)),
        ]
    }

    protected override onUpdateComponents() {
        // if (this.stage == REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP) {
        //     const submitShopButton = this.components.get(`${this.id}+submit-shop`)
        //     if (!(submitShopButton instanceof ExtendedButtonComponent)) return

        //     submitShopButton.toggle(this.selectedShop != null)
        // }

        if (this.stage == REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT) {
            const submitRemoveButton = this.components.get(`${this.id}+remove-product`)
            if (
                submitRemoveButton && 
                !(submitRemoveButton instanceof ComponentSeparator) && 
                submitRemoveButton.comp instanceof ExtendedButtonComponent
            ) {
                submitRemoveButton.comp.toggle(this.selectedProduct != null)
            }

            const selectProductMenu = this.components.get(`${this.id}+select-product`)
            if (
                selectProductMenu && 
                !(selectProductMenu instanceof ComponentSeparator) &&
                selectProductMenu.comp instanceof ExtendedStringSelectMenuComponent && 
                this.selectedShop
            ) {
                const [error, shop] = HYDRATOR.fullyHydrateShop(this.selectedShop.id)
                if (error) throw error
                selectProductMenu.comp.updateMap(shop.products)
            }
        }
    }

    private changeStage(newStage: RemoveProductFlowStage) {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
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
            shop: bold(this.selectedShop.name)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}
