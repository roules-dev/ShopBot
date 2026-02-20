import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "#root/src/lib/discord.js";
import { getCurrencies, getCurrencyName } from "@/features/currencies/database/currencies-database.js"; // external dependency, should be refactored
import { Currency } from "@/features/currencies/database/currencies-types.js"; // external dependency, should be refactored
import { addProduct, getProductName, removeProduct, updateProduct } from "@/features/shops/database/products-database.js";
import { createProductAction, isProductActionType, Product, PRODUCT_ACTION_TYPE, ProductAction, ProductActionOptions, ProductActionType } from "@/features/shops/database/products-types.js";
import { getShopName, getShops } from "@/features/shops/database/shops-database.js";
import { Shop } from "@/features/shops/database/shops-types.js";
import { assertNeverReached } from "@/lib/error-handling.js";
import { defaultComponents, errorMessages, getLocale, replaceTemplates } from "@/lib/localisation.js";
import { UserFlow } from "@/user-flows/user-flow.js";
import { ExtendedButtonComponent, ExtendedComponent, ExtendedRoleSelectMenuComponent, ExtendedStringSelectMenuComponent, showEditModal } from "@/user-interfaces/extended-components.js";
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js";
import { EMOJI_REGEX } from "@/utils/constants.js";
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, roleMention, RoleSelectMenuInteraction, Snowflake, StringSelectMenuInteraction } from "discord.js";


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

    protected locale = getLocale().userFlows.productAdd

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        const productName = interaction.options.getString('name')?.replaceSpaces()
        const productDescription = interaction.options.getString('description')?.replaceSpaces() || ''
        const productPrice = interaction.options.getNumber('price')

        const productEmojiOption = interaction.options.getString('emoji')
        const productEmoji = productEmojiOption?.match(EMOJI_REGEX)?.[0] || ''
        
        const productAmount = interaction.options.getInteger('amount')

        if (!productName || productPrice == null) return replyErrorMessage(interaction, errorMessages().insufficientParameters)
    
        if (productName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, errorMessages().notOnlyEmojisInName)
        
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
        const descString = (this.productDescription) ? `. ${this.locale.messages.description} ${bold(this.productDescription.replaceSpaces())}` : ''
        const nameString = bold(`${this.productEmoji ? `${this.productEmoji} ` : ''}${this.productName}`)

        const message = replaceTemplates(this.locale.messages.default, {
            product: nameString,
            price: this.productPrice!,
            currency: getCurrencyName(this.selectedShop?.currency.id) || '[ ]',
            shop: getShopName(this.selectedShop?.id) || defaultComponents().selectShop,
            description: descString
        })

        return message
    }

    protected initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: defaultComponents().selectShop,
                time: 120_000
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-shop`,
                label: this.locale.components.submitButton,
                emoji: {name: '✅'},
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
        if (!(this.selectedShop && this.productName && this.productPrice)) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

        const [error, product] = await addProduct(this.selectedShop.id, { 
            name: this.productName, 
            description: this.productDescription || '', 
            emoji: this.productEmoji || '', 
            price: this.productPrice,
            amount: this.productAmount ?? undefined
        })
        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = replaceTemplates(this.locale.messages.success, {
            product: product.name,
            shop: bold(getShopName(this.selectedShop.id)!)
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
        const productActionType = interaction.options.getString('action')

        if (productActionType != null && !isProductActionType(productActionType)) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

        this.productActionType = productActionType

        return await super.start(interaction)
    }

    protected override getMessage(): string {
        switch (this.stage) {
            case AddActionProductFlowStage.SELECT_SHOP:
                return super.getMessage()

            case AddActionProductFlowStage.SETUP_ACTION: {
                const descString = (this.productDescription) ? `. ${this.locale.messages.description} ${bold(this.productDescription.replaceSpaces())}` : ''
                const productNameString = bold(`${this.productEmoji ? `${this.productEmoji} ` : ''}${this.productName}`)

                const productString = replaceTemplates(this.locale.messages.default, {
                    product: productNameString,
                    price: this.productPrice!,
                    currency: getCurrencyName(this.selectedShop?.currency.id) || '[ ]',
                    shop: getShopName(this.selectedShop?.id) || defaultComponents().selectShop,
                    description: descString
                })

                let actionString = ''

                switch (this.productActionType) {
                    case PRODUCT_ACTION_TYPE.GiveRole: {
                        const roleMentionString = 
                            (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveRole> | undefined)?.roleId ? 
                            roleMention((this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveRole>).roleId) : 
                            defaultComponents().unset

                        actionString = replaceTemplates(this.locale.messages.actions.giveRole, { role: roleMentionString })
                        break
                    }

                    case PRODUCT_ACTION_TYPE.GiveCurrency: {
                        const productActionAsGiveCurrency = (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>)
                        const isProductActionGiveCurrency = this.productAction != null 
                            && this.productAction?.options != undefined 
                            && (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).amount !== undefined 
                            && (this.productAction?.options as ProductActionOptions<typeof PRODUCT_ACTION_TYPE.GiveCurrency>).currencyId !== undefined 
                            && productActionAsGiveCurrency != undefined 

                        const amountString = (isProductActionGiveCurrency && productActionAsGiveCurrency.amount >= 0) ? productActionAsGiveCurrency.amount : 'Unset'
                        const currency = (isProductActionGiveCurrency && productActionAsGiveCurrency.currencyId) ? getCurrencies().get(productActionAsGiveCurrency.currencyId) : undefined
                        const currencyString = getCurrencyName(currency?.id) || '[ ]'

                        actionString = replaceTemplates(this.locale.messages.actions.giveCurrency, { amount: amountString, currency: currencyString })
                        break
                    }
                    default:
                        break
                }

                return `${productString}\n${this.locale.messages.action} ${actionString}`}

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
                        placeholder: defaultComponents().selectRole,
                        time: 120_000
                    },
                    (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake): void => {
                        this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveRole, { roleId: selectedRoleId })
                        this.actionSetupCompleted = true
                        this.updateInteraction(interaction)
                    }
                )

                this.componentsByStage.get(AddActionProductFlowStage.SETUP_ACTION)?.set(roleSelectMenu.customId, roleSelectMenu)
                break;
            }
            case PRODUCT_ACTION_TYPE.GiveCurrency: {
                const currencySelectMenu = new ExtendedStringSelectMenuComponent<Currency>(
                    {
                        customId: `${this.id}+select-currency`,
                        placeholder: defaultComponents().selectCurrency,
                        time: 120_000
                    },
                    getCurrencies(),
                    (interaction: StringSelectMenuInteraction, selected: Currency): void => {
                        this.productAction = createProductAction(PRODUCT_ACTION_TYPE.GiveCurrency, { currencyId: selected.id, amount: -1 })
                        this.updateInteraction(interaction)
                    }
                )

                const setAmountButton = new ExtendedButtonComponent(
                    {
                        customId: `${this.id}+set-amount`,
                        label: this.locale.components.setAmountButton,
                        emoji: { name: '🪙' },
                        style: ButtonStyle.Secondary,
                        time: 120_000
                    },
                    async (interaction: ButtonInteraction) => {
                        const [modalSubmit, input] = await showEditModal(interaction, { edit: this.locale.components.editAmountModalTitle, previousValue: '0' })

                        const amount = parseInt(input)
                        if (isNaN(amount) || amount < 0) return this.updateInteraction(modalSubmit)

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
                label: this.locale.components.submitButton,
                emoji: '✅',
                style: ButtonStyle.Success,
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
        
        if (!(this.selectedShop && this.productName && this.productPrice != null && this.productAction)) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

        const [error, product] = await addProduct(this.selectedShop.id, { 
            name: this.productName, 
            description: this.productDescription || '', 
            emoji: this.productEmoji || '', 
            price: this.productPrice,
            action: this.productAction 
        })

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = replaceTemplates(this.locale.messages.success, {
            product: product.name,
            shop: bold(getShopName(this.selectedShop.id)!)
        })

        const withActionMessage = replaceTemplates(this.locale.messages.withAction, { action: bold(`${this.productActionType}`) })

        return await updateAsSuccessMessage(interaction, `${message} ${withActionMessage}`)

    }
}

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

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>({
            customId: `${this.id}+select-product`,
            placeholder: defaultComponents().selectProduct,
            time: 120_000
        }, new Map(), (interaction: StringSelectMenuInteraction, selected: Product): void => {
            this.selectedProduct = selected
            this.updateInteraction(interaction)
        })

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

enum EditProductFlowStage {
    SELECT_SHOP,
    SELECT_PRODUCT
}

export enum EditProductOption {
    NAME = 'name',
    DESCRIPTION = 'description',
    PRICE = 'price',
    EMOJI = 'emoji',
    AMOUNT = 'amount'
}

export class EditProductFlow extends UserFlow {
    public id = "edit-product"
    protected components: Map<string, ExtendedComponent> = new Map()

    private stage: EditProductFlowStage = EditProductFlowStage.SELECT_SHOP
    private componentsByStage: Map<EditProductFlowStage, Map<string, ExtendedComponent>> = new Map()

    private updateOption: EditProductOption | null = null
    private updateOptionValue: string | number | null = null

    private selectedShop: Shop | null = null
    private selectedProduct: Product | null = null

    private response: InteractionCallbackResponse | null = null

    protected locale = getLocale().userFlows.productEdit

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, this.locale.errorMessages.noShopsWithProducts)

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !Object.values(EditProductOption).includes(subcommand as EditProductOption)) return replyErrorMessage(interaction, errorMessages().invalidSubcommand)
        this.updateOption = subcommand as EditProductOption

        this.updateOptionValue = this.getUpdateValue(interaction, this.updateOption)

        if (this.updateOptionValue == null) return replyErrorMessage(interaction, errorMessages().insufficientParameters)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected getMessage(): string {
        switch (this.stage) {
            case EditProductFlowStage.SELECT_SHOP:
                return replaceTemplates(this.locale.messages.shopSelectStage, {
                    shop: bold(getShopName(this.selectedShop?.id) || defaultComponents().selectShop),
                    option: bold(this.getUpdateOptionName(this.updateOption!)),
                    value: bold(this.getUpdateValueString(this.updateOption!))
                })
            case EditProductFlowStage.SELECT_PRODUCT:
                return replaceTemplates(this.locale.messages.productSelectStage, {
                    product: bold(getProductName(this.selectedShop?.id, this.selectedProduct?.id) || defaultComponents().selectProduct),
                    shop: bold(getShopName(this.selectedShop?.id)!),
                    option: bold(this.getUpdateOptionName(this.updateOption!)),
                    value: bold(this.getUpdateValueString(this.updateOption!))
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

                this.changeStage(EditProductFlowStage.SELECT_PRODUCT)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditProductFlowStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(EditProductFlowStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(EditProductFlowStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>({
            customId: `${this.id}+select-product`,
            placeholder: defaultComponents().selectProduct,
            time: 120_000
        }, new Map(), (interaction: StringSelectMenuInteraction, selected: Product): void => {
            this.selectedProduct = selected
            this.updateInteraction(interaction)
        })

        const submitEditButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+edit-product`,
                time: 120_000,
                label: this.locale.components.submitButton,
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop`,
                time: 120_000,
                label: defaultComponents().changeShopButton,
                emoji: {name: '📝'},
                style: ButtonStyle.Secondary
            },
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedProduct = null

                this.changeStage(EditProductFlowStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditProductFlowStage.SELECT_PRODUCT, new Map())
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(productSelectMenu.customId, productSelectMenu)
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(submitEditButton.customId, submitEditButton)
        this.componentsByStage.get(EditProductFlowStage.SELECT_PRODUCT)?.set(changeShopButton.customId, changeShopButton)
    }

    protected updateComponents(): void {
        if (this.stage == EditProductFlowStage.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == EditProductFlowStage.SELECT_PRODUCT) {
            const submitRemoveButton = this.components.get(`${this.id}+edit-product`)
            if (submitRemoveButton instanceof ExtendedButtonComponent) {
                submitRemoveButton.toggle(this.selectedProduct != null)
            }

            const selectProductMenu = this.components.get(`${this.id}+select-product`)
            if (selectProductMenu instanceof ExtendedStringSelectMenuComponent) {
                selectProductMenu.updateMap(this.selectedShop?.products || new Map())
            }
        }
    }

    private changeStage(newStage: EditProductFlowStage): void {
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
        if (!this.updateOption || this.updateOptionValue == undefined) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        
        const updateOption: Record<string, string | number> = {}
        updateOption[this.updateOption.toString()] = this.updateOptionValue

        const oldName = getProductName(this.selectedShop.id, this.selectedProduct.id) || ''

        const [error] = await updateProduct(this.selectedShop.id, this.selectedProduct.id, updateOption)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = replaceTemplates(this.locale.messages.success, {
            product: bold(oldName),
            shop: bold(getShopName(this.selectedShop.id)!),
            option: bold(this.getUpdateOptionName(this.updateOption)),
            value: bold(this.getUpdateValueString(this.updateOption))
        })

        return await updateAsSuccessMessage(interaction, message)
    }

    private getUpdateOptionName(option: EditProductOption): string {
        return this.locale.editOptions[option] ?? option
    }

    private getUpdateValue(interaction: ChatInputCommandInteraction, option: EditProductOption): string | number | null {
        const interactionOption = `new-${option}`

        switch (option) {
            case EditProductOption.NAME:
            case EditProductOption.DESCRIPTION:
                return interaction.options.getString(interactionOption)?.replaceSpaces() ?? null
            case EditProductOption.PRICE: {
                const priceString = interaction.options.getNumber(interactionOption)?.toFixed(2)
                if (priceString == undefined) return null
                return +priceString
            }
            case EditProductOption.EMOJI: {
                const emojiOption = interaction.options.getString(interactionOption)
                return emojiOption?.match(EMOJI_REGEX)?.[0] ?? null
            }
            case EditProductOption.AMOUNT:
                return interaction.options.getInteger(interactionOption)
            default:
                assertNeverReached(option)
        }
    }

    private getUpdateValueString(option: EditProductOption | null): string {
        switch (option) {
            case null:
                return defaultComponents().unset
            case EditProductOption.NAME:
            case EditProductOption.DESCRIPTION:
                return (this.updateOptionValue as string | null) ?? defaultComponents().unset
            case EditProductOption.PRICE:
                return `${this.updateOptionValue ?? defaultComponents().unset}` 
            case EditProductOption.EMOJI:
                return (this.updateOptionValue as string | null) ?? defaultComponents().unset
            case EditProductOption.AMOUNT:
                if (this.updateOptionValue == -1) return this.locale.messages.unlimited
                return `${this.updateOptionValue ?? defaultComponents().unset}`
            default:
                assertNeverReached(option)
        }
    }
}