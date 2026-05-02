import { HydratedPrice } from "@/core/database/hydrator.js";
import { HYDRATOR } from "@/core/database/init-databases.js";
import { t } from "@/core/i18n/i18n.js";
import { getCurrencies } from "@/core/services/currencies/currencies.services.js";
import { getItems } from "@/core/services/items/items.services.js";
import { addProduct } from "@/core/services/shops/products.services.js";
import { getShops } from "@/core/services/shops/shops.services.js";
import { NanoId } from "@/database/database.types.js";
import { Item } from "@/features/items/database/items.types.js";
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js";
import { err, ErrorLike, ok, Result } from "@/lib/error-handling.js";
import { MapKey } from "@/lib/types/collections.js";
import { Identifiable } from "@/lib/types/core.js";
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js";
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js";
import { createComponent } from "@/lib/ui/ui-components/extended-components.js";
import { showModal, showValidatedSingleInputModal } from "@/lib/ui/ui-components/modals.js";
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js";
import { StagedUserFlow } from "@/lib/ui/user-flows/user-flow.js";
import { optionalOrNull } from "@/schemas/optional-to-null.js";
import { formattedEmojiableName } from "@/utils/formatting.js";
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, LabelBuilder, MessageComponentInteraction, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import z from "zod";
import { Shop } from "../database/shops.types.js";
import { formatPrice } from "../services/price.js";


// TODO update translation

const MAX_PRICE_LENGTH = 20

export const addProductParamsSchema = z.object({
    stock: optionalOrNull(z.number().min(0)),
})

export class AddProductFlow extends StagedUserFlow<z.infer<typeof addProductParamsSchema>> {
    protected override stage: number = 0
    public override get id(): string { 
        return "add-product" 
    }

    private selectedItem: Item & Identifiable<NanoId> | null = null
    private price: Record<NanoId, number> | null = null
    private selectedShop: Shop & Identifiable<NanoId> | null = null

    protected override async prestart(_interaction: ChatInputCommandInteraction) {
        const items = getItems()
        if (!items.size) return err("No items") // err(t("errorMessages.noItems")) TODO : translation 

        const shops = getShops()
        if (!shops.size) return err(t("errorMessages.noShops"))

        return ok(true)
    }

    protected override getMessage() {
        const nameString = bold(formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem"))

        let priceString = "Add price"
        if (this.price !== null) {
            const [error, price] = HYDRATOR.getHydratedPrice(this.price)
            if (!error) {
                priceString = price.size > 0 ? formatPrice(price) : "Free"
            }
            else {
                priceString = "❌ error displaying price"
            } 
        }
        

        const message = t(`userFlows.productAdd.messages.default`, {
            product: nameString,
            price: bold(priceString),
            shop: bold(formattedEmojiableName(this.selectedShop) || t("defaultComponents.selectShop"))
        })

        return message
    }

    protected override initStageComponents() {
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
        const submitItem = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-item`,
                label: "Submit Item",
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => {
                this.changeStage(1)
                this.price = {}
                this.updateInteraction(interaction)
            }
        )

        const addPriceWithCurrencySelect = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-currency`,
                placeholder: "➕ Add to price (or update)",
                time: 120_000
            },
            getCurrencies(),
            (interaction) => this.updateInteraction(interaction),
            async (interaction, selectedCurrency) => {
                this.price = this.price ?? {}
                
                const previousAmount = this.price[selectedCurrency.id]
                
                const [modalSubmit, [error, amount]] = await showValidatedSingleInputModal(interaction, {
                    id: `${this.id}+amount`,
                    title: "Amount",
                    inputLabel: "Amount",
                    placeholder: previousAmount?.toString() ?? "Amount",
                    required: true
                }, z.coerce.number().positive())

                if (error) {
                    if (error.name === "ModalTimeout") return
                    return this.updateInteraction(modalSubmit) // TODO it should not fail silently
                }

                this.price[selectedCurrency.id] = amount
                this.updateInteraction(modalSubmit)
            }
        )
        const removePricePieceButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+remove-price-piece`,
                emoji: "➖",
                style: ButtonStyle.Primary,
                time: 120_000
            },
            async (interaction) => {
                const [error1, price] = HYDRATOR.getHydratedPrice(this.price ?? {})
                if (error1) {
                    this.updateInteraction(interaction)
                    return // TODO it should not fail silently
                }
                const [modalSubmit, [error2, pricePieceCurrencyId]] = await showPricePieceSelectModal(interaction, {id: this.id, title: "Remove price piece" }, price)

                if (error2) {
                    if (error2.name === "ModalTimeout") return

                    return this.updateInteraction(modalSubmit) // TODO it should not fail silently
                }

                this.price = this.price ?? {}
                delete this.price[pricePieceCurrencyId]

                this.updateInteraction(modalSubmit)
            }
        )

        const submitPriceButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-price`,
                label: "Submit Price",
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction) => {
                this.changeStage(2)
                this.updateInteraction(interaction)
            }
        )

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
                label: t(`userFlows.productAdd.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        return [
            [
                createComponent(itemSelectMenu),
                createComponent(submitItem, () => submitItem.toggle(this.selectedItem != null)),
            ],
            [
                createComponent(addPriceWithCurrencySelect, () => addPriceWithCurrencySelect.toggle(this.price == null || Object.keys(this.price).length < MAX_PRICE_LENGTH)),
                createComponent(removePricePieceButton, () => removePricePieceButton.toggle(this.price != null && Object.values(this.price).length > 0)),
                createComponent(submitPriceButton, () => submitPriceButton.toggle(this.price != null)),
            ],
            [
                createComponent(shopSelectMenu, () => shopSelectMenu.toggle(this.selectedItem != null && this.price != null)), 
                createComponent(submitShopButton, () => submitShopButton.toggle(this.selectedShop != null && this.selectedItem != null && this.price != null)),
            ]
        ]
    }


    protected override async success(interaction: UserInterfaceInteraction) {
        if (!(this.selectedShop && this.selectedItem && (this.price !== null))) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const optionals = {
            ...(this.params.stock ? {stock: this.params.stock} : {}),
        }
        
        const [error, _] = await addProduct(this.selectedShop.id, {
            itemId: this.selectedItem.id,
            price: this.price,
            ...optionals
        })
        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productAdd.messages.success`, {
            product: bold(formattedEmojiableName(this.selectedItem)),
            shop: bold(formattedEmojiableName(this.selectedShop))
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}

async function showPricePieceSelectModal( 
    interaction: MessageComponentInteraction | ChatInputCommandInteraction,
    { id, title }: { 
        id: string, 
        title: string 
    }, 
    hydratedPrice: HydratedPrice
): Promise<[
    ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, 
    Result<MapKey<HydratedPrice>, ErrorLike<"Error"> | ErrorLike<"ModalTimeout">>]
> {
    const modal = new ModalBuilder()
        .setCustomId(id)
        .setTitle(title)

    const SELECT_ID = `${id}+price-piece-select`
    const pricePieceSelect = new StringSelectMenuBuilder()
        .setCustomId(`${id}+price-piece-select`)
        .setPlaceholder("Select price piece")

    const options: StringSelectMenuOptionBuilder[] = []
    hydratedPrice.forEach((value, key) => {
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(`${value.amount} ${value.resource.name}`)
            .setValue(key)

        if (value.resource.emoji != undefined && value.resource.emoji.length > 0) {
            option.setEmoji(value.resource.emoji)
        }

        options.push(option)
    })
    
    pricePieceSelect.setOptions(options)

    const pricePieceLabel = new LabelBuilder()
        .setLabel("Price piece")
        .setStringSelectMenuComponent(pricePieceSelect)

    modal.addLabelComponents(pricePieceLabel)

    const [modalSubmit, [error, fields]] = await showModal(interaction, modal)
    if (error) return [modalSubmit, err(error)]

    const inputValue = fields.getStringSelectValues(SELECT_ID)[0]
    if (!inputValue) return [modalSubmit, err("No price piece selected")]

    return [modalSubmit, ok(inputValue as MapKey<HydratedPrice>)]

}


// TODO: add action product
// const ADD_ACTION_PRODUCT_FLOW_STAGE = {
//     SELECT_SHOP: "SELECT_SHOP",
//     SETUP_ACTION: "SETUP_ACTION"
// } as const

// type AddActionProductFlowStage = keyof typeof ADD_ACTION_PRODUCT_FLOW_STAGE

// export class AddActionProductFlow extends AddProductFlow {
//     public override get id(): string { 
//         return "add-action-product" 
//     }

//     private stage: AddActionProductFlowStage = ADD_ACTION_PRODUCT_FLOW_STAGE.SELECT_SHOP
//     private componentsByStage: Map<AddActionProductFlowStage, Map<string, ExtendedComponent>> = new Map()

//     private productActionType: ProductActionType | null = null
//     private productAction: ProductAction | null = null

//     private actionSetupCompleted: boolean = false

//     public override async start(interaction: ChatInputCommandInteraction) {
//         const productActionType = interaction.options.getString("action")

//         if (productActionType != null && !isProductActionType(productActionType)) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

//         this.productActionType = productActionType

//         return await super.start(interaction)
//     }

//     protected override getMessage() {
//         switch (this.stage) {
//             case ADD_ACTION_PRODUCT_FLOW_STAGE.SELECT_SHOP:
//                 return super.getMessage()

//             case ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION: {
//                 const descString = (this.productDescription) ? `. ${t(`userFlows.productAdd.messages.description`)} ${bold(this.productDescription.replaceSpaces())}` : ""
//                 const productNameString = bold(`${this.productEmoji ? `${this.productEmoji} ` : ""}${this.productName}`)

//                 const productString = t(`userFlows.productAdd.messages.default`, {
//                     product: productNameString,
//                     price: `${this.productPrice!}`,
//                     currency: this.selectedShop?.currency.name || "[ ]",
//                     shop: formattedEmojiableName(this.selectedShop) || t("defaultComponents.selectShop"),
//                     description: descString
//                 })

//                 let actionString = ""
                
//                 switch (this.productActionType) {
//                     case PRODUCT_ACTION_TYPE.GiveRole: {
//                         const roleMentionString = 
//                             (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveRole> | undefined)?.roleId ? 
//                             roleMention((this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveRole>).roleId) : 
//                             t("defaultComponents.unset")

//                         actionString = t(`userFlows.productAdd.messages.actions.giveRole`, { role: roleMentionString })
//                         break
//                     }

//                     case PRODUCT_ACTION_TYPE.GiveCurrency: {
//                         const productActionAsGiveCurrency = (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>)
//                         const isProductActionGiveCurrency = this.productAction != null 
//                             && this.productAction?.options != undefined 
//                             && (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).amount !== undefined 
//                             && (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).currencyId !== undefined 
//                             && productActionAsGiveCurrency != undefined 

//                         const amountString = (isProductActionGiveCurrency && productActionAsGiveCurrency.amount >= 0) ? productActionAsGiveCurrency.amount : "Unset"
//                         const currency = (isProductActionGiveCurrency && productActionAsGiveCurrency.currencyId) ? getCurrencies().get(productActionAsGiveCurrency.currencyId as NanoId) : undefined
//                         const currencyString = currency?.name || "[ ]"

//                         actionString = t(`userFlows.productAdd.messages.actions.giveCurrency`, { amount: `${amountString}`, currency: currencyString })
//                         break
//                     }
//                     default:
//                         break
//                 }

//                 return `${productString}\n${t(`userFlows.productAdd.messages.action`)} ${actionString}`
//             }
//         }
//     }

//     protected override initComponents() {
//         super.initComponents()

//         this.componentsByStage.set(ADD_ACTION_PRODUCT_FLOW_STAGE.SELECT_SHOP, new Map(this.components))

//         this.componentsByStage.set(ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION, new Map())
//         switch (this.productActionType) {
//             case PRODUCT_ACTION_TYPE.GiveRole: {
//                 const roleSelectMenu = new ExtendedRoleSelectMenuComponent(
//                     {
//                         customId: `${this.id}+select-role`,
//                         placeholder: t("defaultComponents.selectRole"),
//                         time: 120_000
//                     },
//                     (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake) => {
//                         this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveRole, { roleId: selectedRoleId })
//                         this.actionSetupCompleted = true
//                         this.updateInteraction(interaction)
//                     }
//                 )

//                 this.componentsByStage.get(ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION)?.set(roleSelectMenu.customId, roleSelectMenu)
//                 break
//             }
//             case PRODUCT_ACTION_TYPE.GiveCurrency: {
//                 const currencySelectMenu = new ExtendedStringSelectMenuComponent(
//                     {
//                         customId: `${this.id}+select-currency`,
//                         placeholder: t("defaultComponents.selectCurrency"),
//                         time: 120_000
//                     },
//                     getCurrencies(), 
//                     (interaction) => this.updateInteraction(interaction),
//                     (interaction , selected) => {
//                         this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveCurrency, { currencyId: selected.id, amount: -1 })
//                         this.updateInteraction(interaction)
//                     }
//                 )

//                 const setAmountButton = new ExtendedButtonComponent(
//                     {
//                         customId: `${this.id}+set-amount`,
//                         label: t(`userFlows.productAdd.components.setAmountButton`),
//                         emoji: "🪙",
//                         style: ButtonStyle.Secondary,
//                         time: 120_000
//                     },
//                     async (interaction: ButtonInteraction) => {
//                         const [ , [error, amount]] = await showValidatedEditModal(
//                             interaction, 
//                             { edit: t(`userFlows.productAdd.components.editAmountModalTitle`), previousValue: "0" },
//                             z.coerce.number().int().min(0).transform(n => Math.floor(n))
//                         )

//                         if (error) return replyErrorMessage(modalSubmit, error.message)

//                         this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveCurrency, {
//                             currencyId: (this.productAction!.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).currencyId,
//                             amount
//                         })

//                         this.actionSetupCompleted = true
//                         this.updateInteraction(modalSubmit)
//                     }
//                 )

//                 this.componentsByStage.get(ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION)?.set(currencySelectMenu.customId, currencySelectMenu)
//                 this.componentsByStage.get(ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION)?.set(setAmountButton.customId, setAmountButton)
//                 break
//             }
//             default:
//                 break   
//         }

//         const submitButton = new ExtendedButtonComponent(
//             {
//                 customId: `${this.id}+submit`,
//                 label: t(`userFlows.productAdd.components.submitButton`),
//                 emoji: "✅",
//                 style: ButtonStyle.Success,
//                 disabled: true,
//                 time: 120_000
//             },
//             (interaction: ButtonInteraction) => this.success(interaction)
//         )

//         const changeShopButton = new ExtendedButtonComponent(
//             {
//                 customId: `${this.id}+change-shop`,
//                 label: t("defaultComponents.changeShopButton"),
//                 emoji: "📝",
//                 style: ButtonStyle.Secondary,
//                 time: 120_000
//             },
//             (interaction: ButtonInteraction) => {
//                 this.selectedShop = null
//                 this.productAction = null
//                 this.actionSetupCompleted = false

//                 this.changeStage(ADD_ACTION_PRODUCT_FLOW_STAGE.SELECT_SHOP)
//                 this.updateInteraction(interaction)
//             }
//         )

//         this.componentsByStage.get(ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION)?.set(submitButton.customId, submitButton)
//         this.componentsByStage.get(ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION)?.set(changeShopButton.customId, changeShopButton)
//     }

//     override updateComponents() {
//         if (this.stage == ADD_ACTION_PRODUCT_FLOW_STAGE.SELECT_SHOP) super.updateComponents()

//         if (this.stage == ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION) {
//             const setAmountButton = this.components.get(`${this.id}+set-amount`)
//             if (setAmountButton instanceof ExtendedButtonComponent) {
//                 setAmountButton.toggle(this.productAction != null && this.productAction.type == PRODUCT_ACTION_TYPE.GiveCurrency)
//             }

//             const submitButton = this.components.get(`${this.id}+submit`)
//             if (submitButton instanceof ExtendedButtonComponent) {
//                 submitButton.toggle(this.productAction != null && this.actionSetupCompleted)
//             }
//         }
//     }
//     private changeStage(newStage: AddActionProductFlowStage) {
//         this.stage = newStage

//         this.destroyComponentsCollectors()

//         this.components = this.componentsByStage.get(newStage) || new Map()
//         this.updateComponents()


//         if (!this.response) return
//         this.createComponentsCollectors(this.response)
//     }

//     protected override async success(interaction: UserInterfaceInteraction) {
//         if (this.stage == ADD_ACTION_PRODUCT_FLOW_STAGE.SELECT_SHOP) {
//             this.changeStage(ADD_ACTION_PRODUCT_FLOW_STAGE.SETUP_ACTION)
//             return this.updateInteraction(interaction)
//         }
        
//         if (!(this.selectedShop && this.productName && this.productPrice != null && this.productAction)) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

//         const [error, product] = await addProduct(this.selectedShop.id, { 
//             name: this.productName, 
//             description: this.productDescription, 
//             emoji: this.productEmoji, 
//             price: this.productPrice,
//             action: this.productAction 
//         })

//         if (error) return await updateAsErrorMessage(interaction, error.message)

//         const message = t(`userFlows.productAdd.messages.success`, {
//             product: product.name,
//             shop: bold(formattedEmojiableName(this.selectedShop))
//         })

//         const withActionMessage = t(`userFlows.productAdd.messages.withAction`, { action: bold(`${this.productActionType}`) })

//         return await updateAsSuccessMessage(interaction, `${message} ${withActionMessage}`)

//     }
// }

