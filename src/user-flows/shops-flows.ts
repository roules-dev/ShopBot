import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, roleMention, Snowflake, StringSelectMenuInteraction } from "discord.js"
import { getCurrencies, getCurrencyName } from "../database/currencies/currencies-database.js"
import { Currency } from "../database/currencies/currencies-types.js"
import { DatabaseError } from "../database/database-types.js"
import { createDiscountCode, createShop, getShopName, getShops, removeDiscountCode, removeShop, updateShop, updateShopCurrency, updateShopPosition } from "../database/shops/shops-database.js"
import { Shop } from "../database/shops/shops-types.js"
import { ExtendedButtonComponent, ExtendedComponent, ExtendedStringSelectMenuComponent, showEditModal } from "../user-interfaces/extended-components.js"
import { UserInterfaceInteraction } from "../user-interfaces/user-interfaces.js"
import { EMOJI_REGEX } from "../utils/constants.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "../utils/discord.js"
import { defaultComponents, errorMessages, getLocale, replaceTemplates } from "../utils/localisation.js"
import { assertNeverReached } from "../utils/utils.js"
import { UserFlow } from "./user-flow.js"

export class ShopCreateFlow extends UserFlow {
    public id = 'shop-create'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private shopName: string | null = null
    private shopEmoji: string | null = null
    private shopDescription: string | null = null
    private shopReservedTo: Snowflake | undefined = undefined

    protected locale = getLocale().userFlows.shopCreate

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (!currencies.size) return await replyErrorMessage(interaction, `${this.locale.errorMessages.cantCreateShop} ${errorMessages().noCurrencies}`)

        const shopName = interaction.options.getString('name')?.replaceSpaces()
        const shopDescription = interaction.options.getString('description')?.replaceSpaces()  || ''
        const emojiOption = interaction.options.getString('emoji')
        const shopEmoji = emojiOption?.match(EMOJI_REGEX)?.[0] || ''
        const shopReservedTo = interaction.options.getRole('reserved-to')?.id

        if (!shopName) return replyErrorMessage(interaction, errorMessages().insufficientParameters)

        if (shopName.removeCustomEmojis().length == 0) return replyErrorMessage(interaction, errorMessages().notOnlyEmojisInName)

        this.shopName = shopName
        this.shopEmoji = shopEmoji
        this.shopDescription = shopDescription
        this.shopReservedTo = shopReservedTo

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return 
    }

    protected override getMessage(): string {
        const shopNameString = `${this.shopEmoji ? `${this.shopEmoji} ` : ''}${this.shopName!}`

        const message = replaceTemplates(this.locale.messages.default, {
            shop: bold(shopNameString),
            currency: bold(getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency)
        })

        return message
    }

    protected override initComponents(): void {
        const selectCurrencyMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: defaultComponents().selectCurrency, time: 120_000 },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
        )
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

        const changeShopNameButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-name`,
                label: this.locale.components.changeShopNameButton,
                emoji: '📝',
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, newShopName] = await showEditModal(interaction, { edit: this.locale.components.editNameModalTitle, previousValue: this.shopName || undefined })
                
                this.shopName = newShopName
                this.updateInteraction(modalSubmit)
            }
        )

        const changeShopEmojiButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop-emoji`,
                label: this.locale.components.changeShopEmojiButton,
                emoji: '✏️',
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, newShopEmoji] = await showEditModal(interaction, { edit: this.locale.components.editEmojiModalTitle, previousValue: this.shopEmoji || undefined })
                
                this.shopEmoji = newShopEmoji?.match(EMOJI_REGEX)?.[0] || this.shopEmoji
                this.updateInteraction(modalSubmit)
            }
        )

        this.components.set(selectCurrencyMenu.customId, selectCurrencyMenu)
        this.components.set(submitButton.customId, submitButton)
        this.components.set(changeShopNameButton.customId, changeShopNameButton)
        this.components.set(changeShopEmojiButton.customId, changeShopEmojiButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.shopName) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            if (!this.selectedCurrency) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            
            const newShop = await createShop(this.shopName, this.shopDescription || '', this.selectedCurrency.id, this.shopEmoji || '', this.shopReservedTo)

            const message = replaceTemplates(this.locale.messages.success, {
                shop: bold(getShopName(newShop.id)!),
                currency: bold(getCurrencyName(newShop.currency.id)!)
            })

            return await updateAsSuccessMessage(interaction, message)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class ShopRemoveFlow extends UserFlow {
    public id = 'shop-remove'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null

    protected locale = getLocale().userFlows.shopRemove

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return replaceTemplates(this.locale.messages.default, { shop: getShopName(this.selectedShop?.id) || defaultComponents().selectShop })
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>({
            customId: `${this.id}+select-shop`,
            placeholder: defaultComponents().selectShop,
            time: 120_000
        }, getShops(), 
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
            this.selectedShop = selected
            this.updateInteraction(interaction)
        })

        const submitButton = new ExtendedButtonComponent({
            customId: `${this.id}+submit`,
            time: 120_000,
            label: this.locale.components.submitButton,
            emoji: {name: '⛔'},
            style: ButtonStyle.Danger,
            disabled: true
        }, (interaction: ButtonInteraction) => this.success(interaction))

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)
    }


    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            
            await removeShop(this.selectedShop.id)

            return await updateAsSuccessMessage(interaction, replaceTemplates(this.locale.messages.success, { shop: bold(getShopName(this.selectedShop.id)!) }))
        }
        catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class ShopReorderFlow extends UserFlow {
    public id = 'shop-reorder'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null
    private selectedPosition: number | null = null

    protected locale = getLocale().userFlows.shopReorder

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        this.initComponents()

        this.selectedShop = shops.values().next().value!
        this.selectedPosition = 0 + 1

        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const message = replaceTemplates(this.locale.messages.default, { 
            shop: bold(getShopName(this.selectedShop?.id) || defaultComponents().selectShop),
            position: bold(`${this.selectedPosition}` || this.locale.components.selectPosition)
        })

        return message
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: defaultComponents().selectShop,
                time: 120_000,
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                const shopsArray = Array.from(getShops().keys())
                const shopIndex = shopsArray.findIndex(id => id === selected.id)

                this.selectedPosition = shopIndex + 1
                this.updateInteraction(interaction)
            },
        )

        const upButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+up`,
                time: 120_000,
                label: '',
                emoji: {name: '⬆️'},
                style: ButtonStyle.Primary,
                disabled: this.selectedPosition != null && this.selectedPosition < getShops().size,
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedPosition) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
                this.selectedPosition = Math.max(this.selectedPosition - 1, 1)
                return this.updateInteraction(interaction)
            }
        )

        const downButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+down`,
                time: 120_000,
                label: '',
                emoji: {name: '⬇️'},
                style: ButtonStyle.Primary,
                disabled: this.selectedPosition != null && this.selectedPosition > 1,
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedPosition) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
                this.selectedPosition = Math.min(this.selectedPosition + 1, getShops().size)
            
                return this.updateInteraction(interaction)
            }
        )

        const submitNewPositionButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-new-position`,
                time: 120_000,
                label: this.locale.components.submitNewPositionButton,
                emoji: {name: ''},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(upButton.customId, upButton)
        this.components.set(downButton.customId, downButton)
        this.components.set(submitNewPositionButton.customId, submitNewPositionButton)
    }

    protected override updateComponents(): void {
        const submitNewPositionButton = this.components.get(`${this.id}+submit-new-position`)
        if (submitNewPositionButton instanceof ExtendedButtonComponent) {
            submitNewPositionButton.toggle(this.selectedShop != null && this.selectedPosition != null)
        }

        const upButton = this.components.get(`${this.id}+up`)
        if (upButton instanceof ExtendedButtonComponent) {
            upButton.toggle(this.selectedPosition != null && this.selectedPosition > 1)
        }

        const downButton = this.components.get(`${this.id}+down`)
        if (downButton instanceof ExtendedButtonComponent) {
            downButton.toggle(this.selectedPosition != null && this.selectedPosition < getShops().size)
        }
    }

    protected override async success(interaction: ButtonInteraction) {
        try {
            if (!this.selectedShop || !this.selectedPosition) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

            updateShopPosition(this.selectedShop.id, this.selectedPosition - 1)

            const message = replaceTemplates(this.locale.messages.success, {
                shop: bold(getShopName(this.selectedShop?.id)!),
                position: bold(`${this.selectedPosition}`)
            })

            return await updateAsSuccessMessage(interaction, message)
        }
        catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export const EDIT_SHOP_OPTIONS = {
    Name: 'name',
    Description: 'description',
    Emoji: 'emoji',
    ReservedTo: 'reserved-to-role'
} as const;

type EditShopOption = typeof EDIT_SHOP_OPTIONS[keyof typeof EDIT_SHOP_OPTIONS]

function isShopOption(subcommand: string): subcommand is EditShopOption { return Object.values(EDIT_SHOP_OPTIONS).includes(subcommand as EditShopOption) }

function getShopOptionName(option: EditShopOption): string { 
    switch (option) {
        case EDIT_SHOP_OPTIONS.Name:
        case EDIT_SHOP_OPTIONS.Description:
        case EDIT_SHOP_OPTIONS.Emoji:
            return option
        case EDIT_SHOP_OPTIONS.ReservedTo:
            return 'reservedTo'
        default:
            assertNeverReached(option)
    }
}

export class EditShopFlow extends UserFlow {
    public override id: string = 'edit-shop'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null

    private updateOption: EditShopOption | null = null
    private updateOptionValue: string | null = null
    private updateOptionValueDisplay: string | null = null

    protected locale = getLocale().userFlows.shopEdit

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !isShopOption(subcommand)) return replyErrorMessage(interaction, errorMessages().invalidSubcommand)
        this.updateOption = subcommand as EditShopOption
        
        try {
            this.updateOptionValue = this.getUpdateValue(interaction, subcommand) 
        }
        catch (error) {
            return replyErrorMessage(interaction, (error instanceof Error) ? error.message : undefined)
        }
        
        this.updateOptionValueDisplay = this.getUpdateValueDisplay(interaction, subcommand) || this.updateOptionValue

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const message = replaceTemplates(this.locale.messages.default, { 
            shop: bold(getShopName(this.selectedShop?.id) || defaultComponents().selectShop),
            option: bold(this.getUpdateOptionName(this.updateOption!)),
            value: bold(`${this.updateOptionValueDisplay}`)
        })

        return message
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>({
                customId: `${this.id}+select-shop`,
                placeholder: defaultComponents().selectShop,
                time: 120_000,
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                time: 120_000,
                label: this.locale.components.submitButton,
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => this.success(interaction),
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)
    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            if (!this.updateOption || !this.updateOptionValue || !this.updateOptionValueDisplay) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            
            const oldName = getShopName(this.selectedShop?.id) || ''

            await updateShop(this.selectedShop.id, { [getShopOptionName(this.updateOption)]: this.updateOptionValue })

            const message = replaceTemplates(this.locale.messages.success, {
                shop: bold(oldName),
                option: bold(this.getUpdateOptionName(this.updateOption!)),
                value: bold(`${this.updateOptionValueDisplay}`)
            })

            return await updateAsSuccessMessage(interaction, message)
        }
        catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }


    private getUpdateValue(interaction: ChatInputCommandInteraction, subcommand: EditShopOption): string {
        let updateValue: string | undefined

        switch (subcommand) {
            case EDIT_SHOP_OPTIONS.Name:
                updateValue = interaction.options.getString('new-name')?.replaceSpaces() ?? defaultComponents().unset
                break
            case EDIT_SHOP_OPTIONS.Description:
                updateValue = interaction.options.getString('new-description')?.replaceSpaces() ?? defaultComponents().unset
                break
            case EDIT_SHOP_OPTIONS.Emoji:
                const emojiOption = interaction.options.getString('new-emoji')
                updateValue = emojiOption?.match(EMOJI_REGEX)?.[0] ?? defaultComponents().unset
                break
            case EDIT_SHOP_OPTIONS.ReservedTo:
                updateValue = interaction.options.getRole('reserved-to-role')?.id ?? defaultComponents().unset
                break
            default:
                assertNeverReached(subcommand)
        }

        if (!updateValue) throw new Error(errorMessages().insufficientParameters)

        return updateValue
    }

    private getUpdateOptionName(option: EditShopOption): string { 
        return this.locale.editOptions[option] ?? option
    }

    private getUpdateValueDisplay(interaction: ChatInputCommandInteraction, subcommand: EditShopOption): string | null {
        switch (subcommand) {
            case EDIT_SHOP_OPTIONS.ReservedTo:
                const role = interaction.options.getRole('reserved-to-role')
                if (!role) return defaultComponents().unset
                return roleMention(role.id)
            
            default:
                return null
        }
    }
}


enum EditShopCurrencyStage {
    SELECT_SHOP, SELECT_CURRENCY
}

export class EditShopCurrencyFlow extends UserFlow {
    public override id: string = 'edit-shop-currency'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private stage: EditShopCurrencyStage = EditShopCurrencyStage.SELECT_SHOP
    private componentsByStage: Map<EditShopCurrencyStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedCurrency: Currency | null = null

    private response: InteractionCallbackResponse | null = null

    protected locale = getLocale().userFlows.shopChangeCurrency

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        switch (this.stage) {
            case EditShopCurrencyStage.SELECT_SHOP:
                return replaceTemplates(this.locale.messages.shopSelectStage, {
                    shop: bold(getShopName(this.selectedShop?.id) || defaultComponents().selectShop)
                })
            case EditShopCurrencyStage.SELECT_CURRENCY:
                return replaceTemplates(this.locale.messages.currencySelectStage, {
                    shop: bold(getShopName(this.selectedShop?.id) || defaultComponents().selectShop),
                    currency: bold(getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency)
                })
            default:
                assertNeverReached(this.stage)
        }
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: defaultComponents().selectShop,
                time: 120_000,
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
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
                this.changeStage(EditShopCurrencyStage.SELECT_CURRENCY)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditShopCurrencyStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const currencySelectMenu = new ExtendedStringSelectMenuComponent<Currency>(
            {
                customId: `${this.id}+select-currency`,
                placeholder: defaultComponents().selectCurrency,
                time: 120_000,
            },
            getCurrencies(),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
        )
        const submitCurrencyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-currency`,
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
                this.selectedCurrency = null

                this.changeStage(EditShopCurrencyStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditShopCurrencyStage.SELECT_CURRENCY, new Map())
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_CURRENCY)?.set(currencySelectMenu.customId, currencySelectMenu)
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_CURRENCY)?.set(submitCurrencyButton.customId, submitCurrencyButton)
        this.componentsByStage.get(EditShopCurrencyStage.SELECT_CURRENCY)?.set(changeShopButton.customId, changeShopButton)
    }

    protected override updateComponents(): void {
        if (this.stage == EditShopCurrencyStage.SELECT_SHOP) {
            const submitShopButton = this.components.get(`${this.id}+submit-shop`)
            if (!(submitShopButton instanceof ExtendedButtonComponent)) return

            submitShopButton.toggle(this.selectedShop != null)
        }

        if (this.stage == EditShopCurrencyStage.SELECT_CURRENCY) {
            const submitUpdateButton = this.components.get(`${this.id}+submit-currency`)
            if (submitUpdateButton instanceof ExtendedButtonComponent) {
                submitUpdateButton.toggle(this.selectedCurrency != null)
            }
        }
    }

    private changeStage(newStage: EditShopCurrencyStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected override async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!this.selectedShop || !this.selectedCurrency) return await updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

        try {
            updateShopCurrency(this.selectedShop.id, this.selectedCurrency.id)
            
            const message = replaceTemplates(this.locale.messages.success, { 
                shop: bold(getShopName(this.selectedShop.id)!), 
                currency: bold(getCurrencyName(this.selectedCurrency.id)!)
            })

            return await updateAsSuccessMessage(interaction, message)
        }
        catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

export class DiscountCodeCreateFlow extends UserFlow {
    public override id: string = 'discount-code-create'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null
    private discountCode: string | null = null
    private discountAmount: number | null = null

    protected locale = getLocale().userFlows.discountCodeCreate

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        const discountCode = interaction.options.getString('code')?.replaceSpaces('').toUpperCase()
        const discountAmount = interaction.options.getInteger('amount')

        if (!discountCode || !discountAmount) return replyErrorMessage(interaction, errorMessages().insufficientParameters)

        this.discountCode = discountCode
        this.discountAmount = discountAmount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const message = replaceTemplates(this.locale.messages.default, {
            shop: bold(getShopName(this.selectedShop?.id) || defaultComponents().selectShop),
            code: bold(this.discountCode!),
            amount: bold(`${this.discountAmount}`)
        })

        return message
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>({
            customId: `${this.id}+select-shop`,
            placeholder: defaultComponents().selectShop,
            time: 120_000,
        },
        getShops(),
        (interaction: StringSelectMenuInteraction, selected: Shop): void => {
            this.selectedShop = selected
            this.updateInteraction(interaction)
        })

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: this.locale.components.submitButton,
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        this.components.set(shopSelectMenu.customId, shopSelectMenu)    
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)

    }

    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            if (!this.discountCode || !this.discountAmount) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

            await createDiscountCode(this.selectedShop.id, this.discountCode, this.discountAmount)

            const message = replaceTemplates(this.locale.messages.success, { 
                shop: bold(getShopName(this.selectedShop.id)!), 
                code: bold(this.discountCode), 
                amount: bold(`${this.discountAmount}`)
            })

            return await updateAsSuccessMessage(interaction, message)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}

enum DiscountCodeRemoveStage {
    SELECT_SHOP,
    SELECT_DISCOUNT_CODE
}

export class DiscountCodeRemoveFlow extends UserFlow {
    public override id: string = 'discount-code-remove'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private stage: DiscountCodeRemoveStage = DiscountCodeRemoveStage.SELECT_SHOP
    private componentsByStage: Map<DiscountCodeRemoveStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedDiscountCode: string | null = null

    private response: InteractionCallbackResponse | null = null

    protected locale = getLocale().userFlows.discountCodeRemove

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        switch (this.stage) {
            case DiscountCodeRemoveStage.SELECT_SHOP:
                return replaceTemplates(this.locale.messages.shopSelectStage, {
                    shop: bold(getShopName(this.selectedShop?.id) || defaultComponents().selectShop)
                })
            case DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE:
                return replaceTemplates(this.locale.messages.codeSelectStage, {
                    shop: bold(getShopName(this.selectedShop?.id)!),
                    code: bold(this.selectedDiscountCode || this.locale.components.discountCodeSelect)
                })
            default:
                assertNeverReached(this.stage)
        }
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: defaultComponents().selectShop,
                time: 120_000,
            },
            getShops(),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                time: 120_000,
                label: defaultComponents().submitShopButton,
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => {
                const shopDiscountCodes = this.selectedShop?.discountCodes

                if (!shopDiscountCodes || Object.keys(shopDiscountCodes).length == 0) return updateAsErrorMessage(interaction, 'The selected shop has no discount codes')

                this.changeStage(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(DiscountCodeRemoveStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_SHOP)?.set(submitButton.customId, submitButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)    
        this.components.set(submitButton.customId, submitButton)

        const discountCodeSelectMenu = new ExtendedStringSelectMenuComponent({
            customId: `${this.id}+select-discount-code`,
            placeholder: this.locale.components.discountCodeSelect,
            time: 120_000,
        },
        new Map(),
        (interaction: StringSelectMenuInteraction, selected: string): void => {
            this.selectedDiscountCode = selected
            this.updateInteraction(interaction)
        })

        const submitRemoveButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+remove-discount-code`,
                time: 120_000,
                label: this.locale.components.submitButton,
                emoji: {name: '⛔'},
                style: ButtonStyle.Danger,
                disabled: true
            },
            (interaction: ButtonInteraction) => this.success(interaction),
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
                this.selectedDiscountCode = null

                this.changeStage(DiscountCodeRemoveStage.SELECT_SHOP)
                this.updateInteraction(interaction)
            },
        )

        this.componentsByStage.set(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE, new Map())
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)?.set(discountCodeSelectMenu.customId, discountCodeSelectMenu)
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)?.set(submitRemoveButton.customId, submitRemoveButton)
        this.componentsByStage.get(DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE)?.set(changeShopButton.customId, changeShopButton)
    }

    protected override updateComponents(): void {
        if (this.stage == DiscountCodeRemoveStage.SELECT_SHOP) {
            const submitButton = this.components.get(`${this.id}+submit`)
            if (!(submitButton instanceof ExtendedButtonComponent)) return

            submitButton.toggle(this.selectedShop != null)
        } 
        
        if (this.stage == DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE) {
            const submitRemoveButton = this.components.get(`${this.id}+remove-discount-code`)
            if (submitRemoveButton instanceof ExtendedButtonComponent) {
                submitRemoveButton.toggle(this.selectedDiscountCode != null)
            }

            const selectDiscountCodeMenu = this.components.get(`${this.id}+select-discount-code`)
            if (selectDiscountCodeMenu instanceof ExtendedStringSelectMenuComponent) {
                selectDiscountCodeMenu.updateMap(new Map(Object.keys(this.selectedShop?.discountCodes || {}).map(code => [code, {id: code, name: code}])))
            }
        }
    }

    private changeStage(newStage: DiscountCodeRemoveStage): void {
        this.stage = newStage

        this.destroyComponentsCollectors()

        this.components = this.componentsByStage.get(newStage) || new Map()
        this.updateComponents()

        if (!this.response) return
        this.createComponentsCollectors(this.response)
    }

    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()

        try {
            if (!this.selectedShop) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
            if (!this.selectedDiscountCode) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)

            await removeDiscountCode(this.selectedShop.id, this.selectedDiscountCode)

            const message = replaceTemplates(this.locale.messages.success, { 
                shop: bold(getShopName(this.selectedShop.id)!), 
                code: bold(this.selectedDiscountCode) 
            })

            return await updateAsSuccessMessage(interaction, message)
        } catch (error) {
            return await updateAsErrorMessage(interaction, (error instanceof DatabaseError) ? error.message : undefined)
        }
    }
}