import { t } from "@/core/i18n/i18n.js"
import { addProduct } from "@/core/services/shops/products.services.js"
import { getShops } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { Identifiable } from "@/lib/types/core.js"
import { TODO } from "@/lib/types/index.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { validate } from "@/lib/validation.js"
import { EmojiSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags } from "discord.js"
import { Shop } from "../database/shops.types.js"

// TODO: must be updated for the new system (products only hold an itemId and some metadata)
// TODO: must be updated to support multi-currency products


export class AddProductFlow extends UserFlow {
    public override get id(): string { 
        return "add-product" 
    }

    protected productName: string | null = null
    protected productPrice: number | null = null
    protected productEmoji: string | null = null
    protected productDescription: string | null = null
    protected productStock: number | null = null

    protected selectedShop: Shop & Identifiable<NanoId> | null = null

    protected response: InteractionCallbackResponse | null = null

    

    public async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        const productName = interaction.options.getString("name")?.replaceSpaces()
        const productDescription = interaction.options.getString("description")?.replaceSpaces() || ""
        const productPrice = interaction.options.getNumber("price")

        const productEmojiOption = interaction.options.getString("emoji")
        const [error, _productEmoji] = validate(EmojiSchema, productEmojiOption)
        
        const productEmoji = error ? null : this.productEmoji

        const productStock = interaction.options.getInteger("stock")

        if (!productName || productPrice == null) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
    
        if (productName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, t("errorMessages.notOnlyEmojisInName"))
        
        this.productName = productName
        this.productPrice = +productPrice.toFixed(2)
        this.productEmoji = productEmoji
        this.productDescription = productDescription

        this.productStock = productStock

        
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        this.response = response
        return
    }
    
    protected getMessage() {
        const descString = (this.productDescription) ? `. ${t(`userFlows.productAdd.messages.description`)} ${bold(this.productDescription.replaceSpaces())}` : ""
        const nameString = bold(formattedEmojiableName({ name: this.productName!, emoji: this.productEmoji}))

        const message = t(`userFlows.productAdd.messages.default`, {
            product: nameString,
            price: `${this.productPrice!}`,
            currency: "[ ]", 
            shop: this.selectedShop?.name || t("defaultComponents.selectShop"),
            description: descString
        })

        return message
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
                label: t(`userFlows.productAdd.components.submitButton`),
                emoji: {name: "✅"},
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        return [
            createComponent(shopSelectMenu),
            createComponent(submitShopButton, () => submitShopButton.toggle(this.selectedShop != null)),
        ]
    }


    protected async success(interaction: UserInterfaceInteraction) {
        if (!(this.selectedShop && this.productName && this.productPrice)) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const optionals = {
            ...(this.productStock ? {stock: this.productStock} : {}),
        }
        
        const [error, _] = await addProduct(this.selectedShop.id, {
            itemId: "" as TODO,
            price: {},
            ...optionals
        })
        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productAdd.messages.success`, {
            product: "TODO: Item Name",
            shop: bold(this.selectedShop.name)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}

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
//                     shop: this.selectedShop?.name || t("defaultComponents.selectShop"),
//                     description: descString
//                 })

//                 let actionString = ""
                
//                 // TODO: refactor
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
//                         emoji: { name: "🪙" },
//                         style: ButtonStyle.Secondary,
//                         time: 120_000
//                     },
//                     async (interaction: ButtonInteraction) => {
//                         const [modalSubmit, [error, amount]] = await showValidatedEditModal(
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
//                 emoji: {name: "📝"},
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
//             shop: bold(this.selectedShop.name)
//         })

//         const withActionMessage = t(`userFlows.productAdd.messages.withAction`, { action: bold(`${this.productActionType}`) })

//         return await updateAsSuccessMessage(interaction, `${message} ${withActionMessage}`)

//     }
// }

