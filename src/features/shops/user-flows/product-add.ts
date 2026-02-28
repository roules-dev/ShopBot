import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { t } from "@/lib/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { showEditModal } from "@/ui-components/modals.js"
import { ExtendedRoleSelectMenuComponent } from "@/ui-components/select-menus.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { EMOJI_REGEX } from "@/utils/constants.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, roleMention, RoleSelectMenuInteraction, Snowflake, StringSelectMenuInteraction } from "discord.js"
import { addProduct } from "../database/products-database.js"
import { createProductAction, isProductActionType, PRODUCT_ACTION_TYPE, ProductAction, ProductActionOptions, ProductActionType } from "../database/products-types.js"
import { getShops } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"


export class AddProductFlow extends UserFlow {
    public id = "add-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    protected productName: string | null = null
    protected productPrice: number | null = null
    protected productEmoji: string | null = null
    protected productDescription: string | null = null
    protected productAmount: number | null = null

    protected selectedShop: Shop | null = null

    protected response: InteractionCallbackResponse | null = null

    protected locale = "userFlows.productAdd" as const

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        const productName = interaction.options.getString("name")?.replaceSpaces()
        const productDescription = interaction.options.getString("description")?.replaceSpaces() || ""
        const productPrice = interaction.options.getNumber("price")

        const productEmojiOption = interaction.options.getString("emoji")
        const productEmoji = productEmojiOption?.match(EMOJI_REGEX)?.[0] || ""
        
        const productAmount = interaction.options.getInteger("amount")

        if (!productName || productPrice == null) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
    
        if (productName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, t("errorMessages.notOnlyEmojisInName"))
        
        this.productName = productName
        this.productPrice = +productPrice.toFixed(2)
        this.productEmoji = productEmoji
        this.productDescription = productDescription

        this.productAmount = productAmount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        this.response = response
        return
    }
    
    protected getMessage(): string {
        const descString = (this.productDescription) ? `. ${t(`${this.locale}.messages.description`)} ${bold(this.productDescription.replaceSpaces())}` : ""
        const nameString = bold(`${this.productEmoji ? `${this.productEmoji} ` : ""}${this.productName}`)

        const message = t(`${this.locale}.messages.default`, {
            product: nameString,
            price: `${this.productPrice!}`,
            currency: this.selectedShop?.currency.name || "[ ]",
            shop: this.selectedShop?.name || t("defaultComponents.selectShop"),
            description: descString
        })

        return message
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
                label: t(`${this.locale}.components.submitButton`),
                emoji: {name: "✅"},
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)
    }

    protected updateComponents(): void {
        const submitShopButton = this.components.get(`${this.id}+submit-shop`)
        if (!(submitShopButton instanceof ExtendedButtonComponent)) return

        submitShopButton.toggle(this.selectedShop != null)
    }

    protected async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!(this.selectedShop && this.productName && this.productPrice)) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error, product] = await addProduct(this.selectedShop.id, { 
            name: this.productName, 
            description: this.productDescription || "", 
            emoji: this.productEmoji || "", 
            price: this.productPrice,
            stock: this.productAmount ?? undefined
        })
        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, {
            product: product.name,
            shop: bold(this.selectedShop.name)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}

enum AddActionProductFlowStage {
    SELECT_SHOP,
    SETUP_ACTION
}

export class AddActionProductFlow extends AddProductFlow {
    public override id = "add-action-product"

    private stage: AddActionProductFlowStage = AddActionProductFlowStage.SELECT_SHOP
    private componentsByStage: Map<AddActionProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private productActionType: ProductActionType | null = null
    private productAction: ProductAction| null = null

    private actionSetupCompleted: boolean = false

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const productActionType = interaction.options.getString("action")

        if (productActionType != null && !isProductActionType(productActionType)) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        this.productActionType = productActionType

        return await super.start(interaction)
    }

    protected override getMessage(): string {
        switch (this.stage) {
            case AddActionProductFlowStage.SELECT_SHOP:
                return super.getMessage()

            case AddActionProductFlowStage.SETUP_ACTION: {
                const descString = (this.productDescription) ? `. ${t(`${this.locale}.messages.description`)} ${bold(this.productDescription.replaceSpaces())}` : ""
                const productNameString = bold(`${this.productEmoji ? `${this.productEmoji} ` : ""}${this.productName}`)

                const productString = t(`${this.locale}.messages.default`, {
                    product: productNameString,
                    price: `${this.productPrice!}`,
                    currency: this.selectedShop?.currency.name || "[ ]",
                    shop: this.selectedShop?.name || t("defaultComponents.selectShop"),
                    description: descString
                })

                let actionString = ""
                
                // TODO: refactor
                switch (this.productActionType) {
                    case PRODUCT_ACTION_TYPE.GiveRole: {
                        const roleMentionString = 
                            (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveRole> | undefined)?.roleId ? 
                            roleMention((this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveRole>).roleId) : 
                            t("defaultComponents.unset")

                        actionString = t(`${this.locale}.messages.actions.giveRole`, { role: roleMentionString })
                        break
                    }

                    case PRODUCT_ACTION_TYPE.GiveCurrency: {
                        const productActionAsGiveCurrency = (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>)
                        const isProductActionGiveCurrency = this.productAction != null 
                            && this.productAction?.options != undefined 
                            && (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).amount !== undefined 
                            && (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).currencyId !== undefined 
                            && productActionAsGiveCurrency != undefined 

                        const amountString = (isProductActionGiveCurrency && productActionAsGiveCurrency.amount >= 0) ? productActionAsGiveCurrency.amount : "Unset"
                        const currency = (isProductActionGiveCurrency && productActionAsGiveCurrency.currencyId) ? getCurrencies().get(productActionAsGiveCurrency.currencyId) : undefined
                        const currencyString = currency?.name || "[ ]"

                        actionString = t(`${this.locale}.messages.actions.giveCurrency`, { amount: `${amountString}`, currency: currencyString })
                        break
                    }
                    default:
                        break
                }

                return `${productString}\n${t(`${this.locale}.messages.action`)} ${actionString}`
            }
        }
    }

    protected override initComponents(): void {
        super.initComponents()

        this.componentsByStage.set(AddActionProductFlowStage.SELECT_SHOP, new Map(this.components))

        this.componentsByStage.set(AddActionProductFlowStage.SETUP_ACTION, new Map())
        switch (this.productActionType) {
            case PRODUCT_ACTION_TYPE.GiveRole: {
                const roleSelectMenu = new ExtendedRoleSelectMenuComponent(
                    {
                        customId: `${this.id}+select-role`,
                        placeholder: t("defaultComponents.selectRole"),
                        time: 120_000
                    },
                    (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake): void => {
                        this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveRole, { roleId: selectedRoleId })
                        this.actionSetupCompleted = true
                        this.updateInteraction(interaction)
                    }
                )

                this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(roleSelectMenu.customId, roleSelectMenu)
                break
            }
            case PRODUCT_ACTION_TYPE.GiveCurrency: {
                const currencySelectMenu = new ExtendedStringSelectMenuComponent<Currency>(
                    {
                        customId: `${this.id}+select-currency`,
                        placeholder: t("defaultComponents.selectCurrency"),
                        time: 120_000
                    },
                    getCurrencies(),
                    (interaction) => this.updateInteraction(interaction),
                    (interaction: StringSelectMenuInteraction, selected: Currency): void => {
                        this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveCurrency, { currencyId: selected.id, amount: -1 })
                        this.updateInteraction(interaction)
                    }
                )

                const setAmountButton = new ExtendedButtonComponent(
                    {
                        customId: `${this.id}+set-amount`,
                        label: t(`${this.locale}.components.setAmountButton`),
                        emoji: { name: "🪙" },
                        style: ButtonStyle.Secondary,
                        time: 120_000
                    },
                    async (interaction: ButtonInteraction) => {
                        const [modalSubmit, input] = await showEditModal(interaction, { edit: t(`${this.locale}.components.editAmountModalTitle`), previousValue: "0" })

                        const amount = parseInt(input)
                        if (isNaN(amount) || amount < 0) return this.updateInteraction(modalSubmit)

                        // Weirdly implemented
                        this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveCurrency, {
                            currencyId: (this.productAction!.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).currencyId,
                            amount
                        })

                        this.actionSetupCompleted = true
                        this.updateInteraction(modalSubmit)
                    }
                )

                this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(currencySelectMenu.customId, currencySelectMenu)
                this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(setAmountButton.customId, setAmountButton)
                break
            }
            default:
                break   
        }

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`${this.locale}.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
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
                this.productAction = null
                this.actionSetupCompleted = false

                this.changeStage(AddActionProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(submitButton.customId, submitButton)
        this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(changeShopButton.customId, changeShopButton)
    }

    override updateComponents(): void {
        if (this.stage == AddActionProductFlowStage.SELECT_SHOP) super.updateComponents()

        if (this.stage == AddActionProductFlowStage.SETUP_ACTION) {
            const setAmountButton = this.components.get(`${this.id}+set-amount`)
            if (setAmountButton instanceof ExtendedButtonComponent) {
                setAmountButton.toggle(this.productAction != null && this.productAction.type == PRODUCT_ACTION_TYPE.GiveCurrency)
            }

            const submitButton = this.components.get(`${this.id}+submit`)
            if (submitButton instanceof ExtendedButtonComponent) {
                submitButton.toggle(this.productAction != null && this.actionSetupCompleted)
            }
        }
    }
    private changeStage(newStage: AddActionProductFlowStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()


        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected override async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (this.stage == AddActionProductFlowStage.SELECT_SHOP) {
            this.changeStage(AddActionProductFlowStage.SETUP_ACTION)
            return this.updateInteraction(interaction)
        }
        
        if (!(this.selectedShop && this.productName && this.productPrice != null && this.productAction)) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error, product] = await addProduct(this.selectedShop.id, { 
            name: this.productName, 
            description: this.productDescription || "", 
            emoji: this.productEmoji || "", 
            price: this.productPrice,
            action: this.productAction 
        })

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, {
            product: product.name,
            shop: bold(this.selectedShop.name)
        })

        const withActionMessage = t(`${this.locale}.messages.withAction`, { action: bold(`${this.productActionType}`) })

        return await updateAsSuccessMessage(interaction, `${message} ${withActionMessage}`)

    }
}

