import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { getLocale, errorMessages, replaceTemplates, defaultComponents } from "@/lib/localisation.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { ExtendedComponent, ExtendedStringSelectMenuComponent, ExtendedButtonComponent } from "@/user-interfaces/extended-components.js"
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { InteractionCallbackResponse, ChatInputCommandInteraction, MessageFlags, bold, StringSelectMenuInteraction, ButtonStyle, ButtonInteraction } from "discord.js"
import { getProductName, removeProduct } from "../database/products-database.js"
import { Product } from "../database/products-types.js"
import { getShops, getShopName } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"

enum RemoveProductFlowStage {
    SELECT_SHOP,
    SELECT_PRODUCT
}

export class RemoveProductFlow extends UserFlow {
    public id = "remove-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private stage: RemoveProductFlowStage = RemoveProductFlowStage.SELECT_SHOP
    private componentsByStage: Map<RemoveProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedProduct: Product | null = null

    private response: InteractionCallbackResponse | null = null

    protected locale = getLocale().userFlows.productRemove

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected getMessage(): string {
        switch (this.stage) {
            case RemoveProductFlowStage.SELECT_SHOP:
                return replaceTemplates(this.locale.messages.shopSelectStage, {
                    shop: bold(getShopName(this.selectedShop?.id) || defaultComponents().selectShop)
                })
            case RemoveProductFlowStage.SELECT_PRODUCT:
                return replaceTemplates(this.locale.messages.productSelectStage, {
                    product: bold(getProductName(this.selectedShop?.id, this.selectedProduct?.id) || defaultComponents().selectProduct),
                    shop: bold(getShopName(this.selectedShop?.id)!)
                })

            default:
                assertNeverReached(this.stage)
        }
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: defaultComponents().selectShop,
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
                label: defaultComponents().submitShopButton,
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => {
                if (this.selectedShop!.products.size == 0) return updateAsErrorMessage(interaction, errorMessages().noProducts)

                this.changeStage(RemoveProductFlowStage.SELECT_PRODUCT)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(RemoveProductFlowStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>(
            {
                customId: `${this.id}+select-product`,
                placeholder: defaultComponents().selectProduct,
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
                label: this.locale.components.submitButton,
                emoji: {name: '⛔'},
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop`,
                label: defaultComponents().changeShopButton,
                emoji: {name: '📝'},
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedProduct = null

                this.changeStage(RemoveProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(RemoveProductFlowStage.SELECT_PRODUCT, new Map())
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(productSelectMenu.customId, productSelectMenu)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(submitRemoveButton.customId, submitRemoveButton)
        this.componentsByStage.get(RemoveProductFlowStage.SELECT_PRODUCT)?.set(changeShopButton.customId, changeShopButton)
    }

    protected updateComponents(): void {
        if (this.stage == RemoveProductFlowStage.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == RemoveProductFlowStage.SELECT_PRODUCT) {
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

        if (!this.selectedShop) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        if (!this.selectedProduct) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

        const oldProductName = getProductName(this.selectedShop.id, this.selectedProduct.id) || ''

        const [error, _] =await removeProduct(this.selectedShop.id, this.selectedProduct.id)

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = replaceTemplates(this.locale.messages.success, {
            product: bold(oldProductName),
            shop: bold(getShopName(this.selectedShop.id)!)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}
