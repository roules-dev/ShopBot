import { getCurrencies } from "@/features/currencies/database/currencies-database.js"
import { Currency } from "@/features/currencies/database/currencies-types.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { assertNeverReached, err, ok } from "@/lib/error-handling.js"
import { t } from "@/lib/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, roleMention, StringSelectMenuInteraction } from "discord.js"
import { getShops, updateShop, updateShopCurrency, updateShopPosition } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"
import { validate } from "@/lib/validation.js"
import { EmojiSchema } from "@/schemas/emojis.js"


export const EDIT_SHOP_OPTIONS = {
    Name: "name",
    Description: "description",
    Emoji: "emoji",
    ReservedTo: "reserved-to-role"
} as const

type EditShopOption = typeof EDIT_SHOP_OPTIONS[keyof typeof EDIT_SHOP_OPTIONS]

function isShopOption(subcommand: string): subcommand is EditShopOption { return Object.values(EDIT_SHOP_OPTIONS).includes(subcommand as EditShopOption) }

function getShopOptionName(option: EditShopOption): string { 
    switch (option) {
        case EDIT_SHOP_OPTIONS.Name:
        case EDIT_SHOP_OPTIONS.Description:
        case EDIT_SHOP_OPTIONS.Emoji:
            return option
        case EDIT_SHOP_OPTIONS.ReservedTo:
            return "reservedTo"
        default:
            assertNeverReached(option)
    }
}

export class EditShopFlow extends UserFlow {
    public override id: string = "edit-shop"
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null

    private updateOption: EditShopOption | null = null
    private updateOptionValue: string | null = null
    private updateOptionValueDisplay: string | null = null

    protected locale = "userFlows.shopEdit" as const

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !isShopOption(subcommand)) return replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
        this.updateOption = subcommand as EditShopOption
        
        const [error, updateValue] = this.getUpdateValue(interaction, subcommand)

        if (error) return replyErrorMessage(interaction, error.message)
        this.updateOptionValue = updateValue

        this.updateOptionValueDisplay = this.getUpdateValueDisplay(interaction, subcommand) || this.updateOptionValue

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const message = t(`${this.locale}.messages.default`, { 
            shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
            option: bold(this.getUpdateOptionName(this.updateOption!)),
            value: bold(`${this.updateOptionValueDisplay}`)
        })

        return message
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>({
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000,
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                time: 120_000,
                label: t(`${this.locale}.components.submitButton`),
                emoji: {name: "✅"},
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

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.updateOption || !this.updateOptionValue || !this.updateOptionValueDisplay) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const oldName = this.selectedShop?.name || ""

        const [error] = await updateShop(this.selectedShop.id, { [getShopOptionName(this.updateOption)]: this.updateOptionValue })

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, {
            shop: bold(oldName),
            option: bold(this.getUpdateOptionName(this.updateOption)),
            value: bold(`${this.updateOptionValueDisplay}`)
        })

        return await updateAsSuccessMessage(interaction, message)
    }


    private getUpdateValue(interaction: ChatInputCommandInteraction, subcommand: EditShopOption){
        let updateValue: string | undefined

        switch (subcommand) {
            case EDIT_SHOP_OPTIONS.Name:
                updateValue = interaction.options.getString("new-name")?.replaceSpaces() ?? t("defaultComponents.unset")
                break
            case EDIT_SHOP_OPTIONS.Description:
                updateValue = interaction.options.getString("new-description")?.replaceSpaces() ?? t("defaultComponents.unset")
                break
            case EDIT_SHOP_OPTIONS.Emoji: {
                const emojiOption = interaction.options.getString("new-emoji")
                const [error, emoji] = validate(EmojiSchema, emojiOption)
                updateValue = error ? t("defaultComponents.unset") : emoji
                break
            }
            case EDIT_SHOP_OPTIONS.ReservedTo:
                updateValue = interaction.options.getRole("new-role")?.id ?? t("defaultComponents.unset")
                break
            default:
                assertNeverReached(subcommand)
        }

        if (!updateValue) return err({ message: t("errorMessages.insufficientParameters")})

        return ok(updateValue)
    }

    private getUpdateOptionName(option: EditShopOption): string { 
        return t(`${this.locale}.editOptions.${option}`)
    }

    private getUpdateValueDisplay(interaction: ChatInputCommandInteraction, subcommand: EditShopOption): string | null {
        switch (subcommand) {
            case EDIT_SHOP_OPTIONS.ReservedTo: {
                const role = interaction.options.getRole("new-role")
                if (!role) return t("defaultComponents.unset")
                return roleMention(role.id)
            }
            default:
                return null
        }
    }
}


enum EditShopCurrencyStage {
    SELECT_SHOP, SELECT_CURRENCY
}

export class EditShopCurrencyFlow extends UserFlow {
    public override id: string = "edit-shop-currency"
    protected override components: Map<string, ExtendedComponent> = new Map()

    private stage: EditShopCurrencyStage = EditShopCurrencyStage.SELECT_SHOP
    private componentsByStage: Map<EditShopCurrencyStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop | null = null
    private selectedCurrency: Currency | null = null

    private response: InteractionCallbackResponse | null = null

    protected locale = "userFlows.shopChangeCurrency" as const

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

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
                return t(`${this.locale}.messages.shopSelectStage`, {
                    shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop"))
                })
            case EditShopCurrencyStage.SELECT_CURRENCY:
                return t(`${this.locale}.messages.currencySelectStage`, {
                    shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
                    currency: bold(this.selectedCurrency?.name || t("defaultComponents.selectCurrency"))
                })
            default:
                assertNeverReached(this.stage)
        }
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000,
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
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
                placeholder: t("defaultComponents.selectCurrency"),
                time: 120_000,
            },
            getCurrencies(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            },
        )
        const submitCurrencyButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-currency`,
                time: 120_000,
                label: t(`${this.locale}.components.submitButton`),
                emoji: {name: "✅"},
                style: ButtonStyle.Success,
                disabled: true
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const changeShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+change-shop`,
                time: 120_000,
                label: t("defaultComponents.changeShopButton"),
                emoji: {name: "📝"},
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
        if (!this.selectedShop || !this.selectedCurrency) return await updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error, shop] = await updateShopCurrency(this.selectedShop.id, this.selectedCurrency.id)
        
        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, { 
            shop: bold(shop.name), 
            currency: bold(this.selectedCurrency.name)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}


export class ShopReorderFlow extends UserFlow {
    public id = "shop-reorder"
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null
    private selectedPosition: number | null = null

    protected locale = "userFlows.shopReorder" as const

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        this.initComponents()

        this.selectedShop = shops.values().next().value!
        this.selectedPosition = 0 + 1

        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const message = t(`${this.locale}.messages.default`, { 
            shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
            position: bold(`${this.selectedPosition}` || t(`${this.locale}.components.selectPosition`))
        })

        return message
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000,
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
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
                label: "",
                emoji: {name: "⬆️"},
                style: ButtonStyle.Primary,
                disabled: this.selectedPosition != null && this.selectedPosition < getShops().size,
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedPosition) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
                this.selectedPosition = Math.max(this.selectedPosition - 1, 1)
                return this.updateInteraction(interaction)
            }
        )

        const downButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+down`,
                time: 120_000,
                label: "",
                emoji: {name: "⬇️"},
                style: ButtonStyle.Primary,
                disabled: this.selectedPosition != null && this.selectedPosition > 1,
            },
            (interaction: ButtonInteraction) => {
                if (!this.selectedPosition) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
                this.selectedPosition = Math.min(this.selectedPosition + 1, getShops().size)
            
                return this.updateInteraction(interaction)
            }
        )

        const submitNewPositionButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-new-position`,
                time: 120_000,
                label: t(`${this.locale}.components.submitNewPositionButton`),
                emoji: {name: ""},
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
        if (!this.selectedShop || !this.selectedPosition) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await updateShopPosition(this.selectedShop.id, this.selectedPosition - 1)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, {
            shop: bold(this.selectedShop.name),
            position: bold(`${this.selectedPosition}`)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}

