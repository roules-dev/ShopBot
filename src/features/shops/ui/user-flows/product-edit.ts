import { HydratedProduct } from "@/core/database/hydrator.js";
import { HYDRATOR } from "@/core/database/init-databases.js";
import { t } from "@/core/i18n/i18n.js";
import { getItems } from "@/core/services/items/items.services.js";
import { updateProduct } from "@/core/services/shops/products.services.js";
import { getShops } from "@/core/services/shops/shops.services.js";
import { NanoId } from "@/database/database.types.js";
import { Item } from "@/features/items/database/items.types.js";
import { errorFormat, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js";
import { err, ok } from "@/lib/error-handling.js";
import { Identifiable } from "@/lib/types/core.js";
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js";
import { ExtendedButtonComponent } from "@/lib/ui/components/button.js";
import { ComponentSeparator, createComponent } from "@/lib/ui/components/extended-components.js";
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/components/string-select-menu.js";
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js";
import { optionalOrNull } from "@/schemas/optional-to-null.js";
import { formattedEmojiableName, getDisplayOptionValue } from "@/utils/formatting.js";
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, italic } from "discord.js";
import z from "zod";
import { Shop } from "../../database/shops.types.js";
import { formatPrice, MAX_PRICE_LENGTH } from "../../services/price.js";
import { getPriceElementComponents } from "../components/price-element-components.js";
import { getAction, productActions } from "../../data/product-actions/index.js";
import { objectEntries } from "@/utils/objects.js";
import { UIComponent } from "@/lib/ui/user-interfaces/user-interfaces.js";
import { productActionSchema } from "../../schemas/products.schemas.js";
import { showConfirmationModal } from "@/lib/ui/components/modals.js";


abstract class BaseEditProductFlow<T extends Record<string, unknown> | void> extends UserFlow<T>  {
    protected selectedShop: Shop & Identifiable<NanoId> | null = null
    protected selectedProduct: HydratedProduct | null = null

    protected override async prepare(_interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (shops.size == 0) return err(t("errorMessages.noShops"))

        return ok(true)
    } 

    protected override initComponents(): UIComponent[] {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                if (Object.keys(selected.products).length === 0) {
                    this.updateInteraction(interaction, errorFormat(t("errorMessages.shopHasNoProducts")))
                    return
                }
                
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
            new Map<NanoId, HydratedProduct>(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedProduct = selected

                this.updateInteraction(interaction)
            }
        )

        const submitEditButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+edit-product`,
                time: 120_000,
                label: t(`userFlows.productEdit.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true
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

            createComponent(submitEditButton, () => submitEditButton.toggle(
                this.selectedShop != null && this.selectedProduct != null
            )),
        ]
    }
}


export const editProductParamsSchema = z.discriminatedUnion("kind", [
    z.object({ 
        kind: z.literal("stock"), 
        stock: optionalOrNull(z.int().min(0))
    })
])

export class EditProductFlow extends BaseEditProductFlow<z.infer<typeof editProductParamsSchema>> {
    public override get id(): string { 
        return "product-edit" 
    }

    protected getMessage(): string {
        if (this.selectedShop == null) {
            return t(`userFlows.productEdit.messages.shopSelectStage`, {
                shop: bold(t("defaultComponents.selectShop")),
                option: bold(this.params.kind),
                value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
            })
        }

        return t(`userFlows.productEdit.messages.productSelectStage`, {
            product: bold(formattedEmojiableName(this.selectedProduct?.item) || t("defaultComponents.selectProduct")),
            shop: bold(formattedEmojiableName(this.selectedShop)),
            option: bold(this.params.kind), // TODO should be translated
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })
    }

    protected override async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        if (!this.selectedShop || !this.selectedProduct) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const oldName = formattedEmojiableName(this.selectedProduct.item)
        const { kind, ...option } = this.params

        const [error] = await updateProduct(this.selectedShop.id, this.selectedProduct.id, option)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productEdit.messages.success`, {
            product: bold(oldName),
            shop: bold(formattedEmojiableName(this.selectedShop)),
            option: bold(this.params.kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}



export class EditProductPriceFlow extends BaseEditProductFlow<void> {
    public override get id(): string { 
        return "product-edit+price" 
    }

    private price: Record<NanoId, number> | null = null

    private getPriceDisplay() {
        if (this.price == null) return t("defaultComponents.unset")
        
        const [error, price] = HYDRATOR.getHydratedPrice(this.price)
        if (error) return errorFormat(t("errorMessages.hydration.priceDisplayFailed"))
        
        return formatPrice(price)
    }

    protected override getMessage(): string {
        if (this.selectedShop == null) {
            return t(`userFlows.productEdit.messages.shopSelectStage`, {
                shop: bold(t("defaultComponents.selectShop")),
                option: bold("price"),
                value: bold(this.getPriceDisplay())
            })
        }

        return t(`userFlows.productEdit.messages.productSelectStage`, {
            product: bold(formattedEmojiableName(this.selectedProduct?.item) || t("defaultComponents.selectProduct")),
            shop: bold(formattedEmojiableName(this.selectedShop)),
            option: bold("price"),
            value: bold(this.getPriceDisplay())
        })
    }


    protected override initComponents() {
        const [shopSelect, productSelect, submit] = super.initComponents()
        if (!shopSelect || !productSelect || !submit || !("comp" in submit)) throw new Error("Unxpected Error loading EditPriceFlow components")

        const { addPriceWithCurrencySelect, removePriceElementButton } = getPriceElementComponents(
            this.id, 
            this.price, 
            (price) => this.price = price, 
            (interaction) => this.updateInteraction(interaction)
        )
        
        return [
            shopSelect,
            productSelect,

            createComponent(addPriceWithCurrencySelect, () => addPriceWithCurrencySelect.toggle(
                this.selectedShop != null && 
                this.selectedProduct != null && 
                (this.price == null || Object.keys(this.price).length < MAX_PRICE_LENGTH))
            ),
            createComponent(removePriceElementButton, () => removePriceElementButton.toggle(this.price != null && Object.keys(this.price).length > 0)),

            createComponent(submit.comp, () => submit.comp.toggle(this.selectedShop != null && this.selectedProduct != null && this.price != null))
        ]
    }

    protected override async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        if (!this.selectedShop || !this.selectedProduct || !this.price) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await updateProduct(this.selectedShop.id, this.selectedProduct.id, {price: this.price})

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productEdit.messages.success`, 
            {
                product: bold(formattedEmojiableName(this.selectedProduct.item)),
                shop: bold(formattedEmojiableName(this.selectedShop)),
                option: bold("price"),
                value: bold(this.getPriceDisplay())
            }
        )

        return await updateAsSuccessMessage(interaction, message)
    }
}


export class EditProductItemFlow extends EditProductFlow {
    public override get id(): string { 
        return "product-edit+price" 
    }

    constructor() {
        super({kind: "stock",stock: null})
    }

    private selectedItem: Item & Identifiable<NanoId> | null = null


    protected override getMessage(): string {
        if (this.selectedShop == null) {
            return t(`userFlows.productEdit.messages.shopSelectStage`, {
                shop: bold(t("defaultComponents.selectShop")),
                option: bold("item"),
                value: bold(t("defaultComponents.selectItem"))
            })
        }

        return t(`userFlows.productEdit.messages.productSelectStage`, {
            product: bold(formattedEmojiableName(this.selectedProduct?.item) || t("defaultComponents.selectProduct")),
            shop: bold(formattedEmojiableName(this.selectedShop)),
            option: bold("item"),
            value: bold(formattedEmojiableName(this.selectedItem) ?? t("defaultComponents.selectItem"))
        })
    }


    protected override initComponents() {
        const [shopSelect, productSelect, submit] = super.initComponents()
        if (!shopSelect || !productSelect || !submit || !("comp" in submit)) throw new Error("Unxpected Error loading EditPriceFlow components")

        const itemSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-item`,
                placeholder: t("defaultComponents.selectItem"),
                time: 120_000
            },
            getItems(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selectedItem) => {
                this.selectedItem = selectedItem
                this.updateInteraction(interaction)
            }
        )
        
        return [
            shopSelect,
            productSelect,

            createComponent(itemSelectMenu, () => itemSelectMenu.toggle(this.selectedShop != null && this.selectedProduct != null)),

            createComponent(submit.comp, () => submit.comp.toggle(this.selectedShop != null && this.selectedProduct != null && this.selectedItem != null))
        ]
    }

    protected override async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        if (!this.selectedShop || !this.selectedProduct || !this.selectedItem) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await updateProduct(this.selectedShop.id, this.selectedProduct.id, {itemId: this.selectedItem.id})

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productEdit.messages.success`, 
            {
                product: bold(formattedEmojiableName(this.selectedProduct.item)),
                shop: bold(formattedEmojiableName(this.selectedShop)),
                option: bold("item"),
                value: bold(formattedEmojiableName(this.selectedItem))
            }
        )

        return await updateAsSuccessMessage(interaction, message)
    }
}

// TODO translations
export class EditProductActionFlow extends BaseEditProductFlow<void> {
    public override get id(): string { 
        return "product-edit+action" 
    }

    private response: InteractionCallbackResponse | null = null
    
    private selectedActionKind: keyof typeof productActions | null = null
    private selectedAction: z.infer<typeof productActionSchema> | null = null
    

    public override async start(interaction: ChatInputCommandInteraction) {
        const response = await super.start(interaction)
        this.response = response
        return response
    }


    protected override getMessage(): string {
        if (this.selectedShop == null) {
            return t(`userFlows.productEdit.messages.shopSelectStage`, {
                shop: bold(t("defaultComponents.selectShop")),
                option: bold("action"),
                value: italic("select action kind")
            })
        }

        const actionMessage = this.selectedActionKind ? getAction(this.selectedActionKind).getMessage(this.selectedAction?.options, HYDRATOR) : "select action kind"
        
        return t(`userFlows.productEdit.messages.productSelectStage`, {
            product: bold(formattedEmojiableName(this.selectedProduct?.item) || t("defaultComponents.selectProduct")),
            shop: bold(formattedEmojiableName(this.selectedShop)),
            option: bold("action"),
            value: italic(actionMessage)
        })
    }

    protected override initComponents() {
        const [shopSelect, productSelect, _] = super.initComponents()
        if (!shopSelect || !("comp" in shopSelect) || 
            !productSelect || !("comp" in productSelect)
        ) throw new Error("Unxpected Error loading EditPriceFlow components")

        
        const actionKindMap = new Map(objectEntries(productActions).map(([kind, action]) => [kind, {name: action.name}]))

        const actionKindSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-action-kind`,
                placeholder: "Select Action",// TODO t("defaultComponents.selectAction"),
                time: 120_000
            },
            actionKindMap,
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedActionKind = selected.id
                this.updateInteraction(interaction)
            }
        )

        const actionComponentsPlaceholder = new ComponentSeparator(`action-components-placeholder`)


        const submitEditButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+edit-product`,
                time: 120_000,
                label: t(`userFlows.productEdit.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true
            },
            async (interaction: ButtonInteraction) => {
                if (this.selectedProduct != null && !this.selectedAction && this.selectedProduct.action != null) {
                    const [modalSubmit, approved] = await showConfirmationModal(interaction, "Remove action from product? (Can't be undone)")
                    if (!approved) return this.updateInteraction(modalSubmit)

                    return this.success(modalSubmit)
                }

                this.success(interaction)
            }
        )

        return [
            createComponent(shopSelect.comp, () => { 
                if (!this.selectedShop) {
                    this.selectedActionKind = null
                    this.selectedAction = null
                }
            }), 
            createComponent(productSelect.comp, () => { 
                if (!this.selectedProduct) {
                    this.selectedActionKind = null
                    this.selectedAction = null
                }
                productSelect.update?.()
            }), 

            createComponent(actionKindSelectMenu, () => actionKindSelectMenu.toggle(this.selectedShop != null && this.selectedProduct != null)),
            actionComponentsPlaceholder,

            createComponent(submitEditButton, () => 
                submitEditButton.toggle(
                    this.selectedShop != null && this.selectedProduct != null &&
                    (this.selectedAction != null || this.selectedProduct.action != null)
                )
        )
        ]
    }


    override onUpdateComponents() {
        const previousEditActionComponents = Array.from(this.components.keys()).filter(id => id.startsWith("!edit-action-component"))
        previousEditActionComponents.forEach(id => this.components.delete(id))

        if (!this.selectedShop || !this.selectedProduct || !this.selectedActionKind) return

        const componentsArray = Array.from(this.components)
        const separatorIndex = componentsArray.findIndex(([key, _]) => key === `action-components-placeholder`)
        if (separatorIndex === -1) throw new Error("Action components placeholder not found")

        const actionEditComponents = productActions[this.selectedActionKind].getEditComponents(            
            this.id, 
            (interaction, action) => {
                this.selectedAction = action
                this.updateInteraction(interaction)
            }, 
            i => this.updateInteraction(i)
        )

        const actionEditComponentsArray: [string, UIComponent][] = actionEditComponents.map(c => {
            const id = c instanceof ComponentSeparator ? c.customId : c.comp.customId
            return [`!edit-action-component-${id}`, c]
        })

        componentsArray.splice(separatorIndex+1, 0, ...actionEditComponentsArray)

        this.components = new Map(componentsArray)
        this.destroyComponentsCollectors()
        this.createComponentsCollectors(this.response!)
    }


    protected override async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()
        
        if (!this.selectedShop || !this.selectedProduct) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await updateProduct(this.selectedShop.id, this.selectedProduct.id, {
            action: this.selectedAction
        })

        if (error) return updateAsErrorMessage(interaction, error.message)

        const actionMessage = this.selectedActionKind ? getAction(this.selectedActionKind).getMessage(this.selectedAction?.options, HYDRATOR) : "Removed"

        const message = t(`userFlows.productEdit.messages.success`, 
            {
                product: bold(formattedEmojiableName(this.selectedProduct.item)),
                shop: bold(formattedEmojiableName(this.selectedShop)),
                option: bold("action"),
                value: bold(actionMessage)
            }
        )

        return await updateAsSuccessMessage(interaction, message)
    }
}