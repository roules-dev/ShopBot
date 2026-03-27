import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { t } from "@/core/i18n/i18n.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ExtendedComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { UserInterfaceInteraction } from "@/lib/ui/user-interfaces/user-interfaces.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, StringSelectMenuInteraction } from "discord.js"
import { removeProduct } from "../database/products-database.js"
import { Product } from "../database/products-types.js"
import { getShops } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"

export const REMOVE_PRODUCT_FLOW_STAGE = {
    SELECT_SHOP: "SELECT_SHOP",
    SELECT_PRODUCT: "SELECT_PRODUCT",
} as const

export type RemoveProductFlowStage = keyof typeof REMOVE_PRODUCT_FLOW_STAGE

export class RemoveProductFlow extends UserFlow {
    public id = "remove-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private stage: RemoveProductFlowStage = REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP
    private componentsByStage: Map<RemoveProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedProduct: Product | null = null

    private response: InteractionCallbackResponse | null = null

    protected locale = "userFlows.productRemove" as const

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected getMessage(): string {
        switch (this.stage) {
            case REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP:
                return t(`${this.locale}.messages.shopSelectStage`, {
                    shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop"))
                })
            case REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT:
                if (this.selectedShop == null) throw new Error("Unexpected null selectedShop in REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT stage")

                return t(`${this.locale}.messages.productSelectStage`, {
                    product: bold(formattedEmojiableName(this.selectedProduct) || t("defaultComponents.selectProduct")),
                    shop: bold(this.selectedShop.name)
                })

            default:
                assertNeverReached(this.stage)
        }
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
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
                if (this.selectedShop.products.size == 0) return updateAsErrorMessage(interaction, t("errorMessages.noProducts"))

                this.changeStage(REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP, new Map())
        this.componentsByStage.get(REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>(
            {
                customId: `${this.id}+select-product`,
                placeholder: t("defaultComponents.selectProduct"),
                time: 120_000
            }, 
            new Map(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            }
        )

        const submitRemoveButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+remove-product`,
                label: t(`${this.locale}.components.submitButton`),
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
    }

    protected updateComponents(): void {
        if (this.stage == REMOVE_PRODUCT_FLOW_STAGE.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == REMOVE_PRODUCT_FLOW_STAGE.SELECT_PRODUCT) {
            const submitRemoveButton = this.components.get(`${this.id}+remove-product`)
            if (submitRemoveButton instanceof ExtendedButtonComponent) {
                submitRemoveButton.toggle(this.selectedProduct != null)
            }

            const selectProductMenu = this.components.get(`${this.id}+select-product`)
            if (selectProductMenu instanceof ExtendedStringSelectMenuComponent) {
                selectProductMenu.updateMap(this.selectedShop?.products || new Map())
            }
        }
    }

    private changeStage(newStage: RemoveProductFlowStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        this.disableComponents()

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.selectedProduct) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const oldProductName = formattedEmojiableName(this.selectedProduct)

        const [error] =await removeProduct(undefined, this.selectedShop.id, this.selectedProduct.id)

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, {
            product: bold(oldProductName),
            shop: bold(this.selectedShop.name)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}
