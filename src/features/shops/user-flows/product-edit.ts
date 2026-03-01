import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { t } from "@/lib/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, StringSelectMenuInteraction } from "discord.js"
import { updateProduct } from "../database/products-database.js"
import { Product } from "../database/products-types.js"
import { getShops } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { validate } from "@/lib/validation.js"
import { EmojiSchema } from "@/schemas/emojis.js"


enum EditProductFlowStage {
    SELECT_SHOP,
    SELECT_PRODUCT
}

export enum EditProductOption {
    NAME = "name",
    DESCRIPTION = "description",
    PRICE = "price",
    EMOJI = "emoji",
    AMOUNT = "amount"
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

    protected locale = "userFlows.productEdit" as const

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t(`${this.locale}.errorMessages.noShopsWithProducts`))

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !Object.values(EditProductOption).includes(subcommand as EditProductOption)) return replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
        this.updateOption = subcommand as EditProductOption

        this.updateOptionValue = this.getUpdateValue(interaction, this.updateOption)

        if (this.updateOptionValue == null) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

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
                return t(`${this.locale}.messages.shopSelectStage`, {
                    shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
                    option: bold(this.getUpdateOptionName(this.updateOption!)),
                    value: bold(this.getUpdateValueString(this.updateOption!))
                })
            case EditProductFlowStage.SELECT_PRODUCT:
                if (this.selectedShop == null) throw new Error("Unexpected null selectedShop in EditProductFlowStage.SELECT_PRODUCT stage")

                return t(`${this.locale}.messages.productSelectStage`, {
                    product: bold(formattedEmojiableName(this.selectedProduct) || t("defaultComponents.selectProduct")),
                    shop: bold(this.selectedShop.name),
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

                this.changeStage(EditProductFlowStage.SELECT_PRODUCT)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(EditProductFlowStage.SELECT_SHOP, new Map())
        this.componentsByStage.get(EditProductFlowStage.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(EditProductFlowStage.SELECT_SHOP)?.set(submitShopButton.customId, submitShopButton)

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitShopButton.customId, submitShopButton)

        const productSelectMenu = new ExtendedStringSelectMenuComponent<Product>(
            {
                customId: `${this.id}+select-product`,
                placeholder: t("defaultComponents.selectProduct"),
                time: 120_000
            }, new Map(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: Product): void => {
                this.selectedProduct = selected
                this.updateInteraction(interaction)
            }
        )

        const submitEditButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+edit-product`,
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

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.selectedProduct) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.updateOption || this.updateOptionValue == undefined) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const updateOption: Record<string, string | number> = {}
        updateOption[this.updateOption.toString()] = this.updateOptionValue

        const oldName = formattedEmojiableName(this.selectedProduct)

        const [error] = await updateProduct(this.selectedShop.id, this.selectedProduct.id, updateOption)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, {
            product: bold(oldName),
            shop: bold(this.selectedShop.name),
            option: bold(this.getUpdateOptionName(this.updateOption)),
            value: bold(this.getUpdateValueString(this.updateOption))
        })

        return await updateAsSuccessMessage(interaction, message)
    }

    private getUpdateOptionName(option: EditProductOption): string {
        return t(`${this.locale}.editOptions.${option}`)
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

                const [error, emoji] = validate(EmojiSchema, emojiOption)
                return error ? null : emoji
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
                return t("defaultComponents.unset")
            case EditProductOption.NAME:
            case EditProductOption.DESCRIPTION:
                return (this.updateOptionValue as string | null) ?? t("defaultComponents.unset")
            case EditProductOption.PRICE:
                return `${this.updateOptionValue ?? t("defaultComponents.unset")}` 
            case EditProductOption.EMOJI:
                return (this.updateOptionValue as string | null) ?? t("defaultComponents.unset")
            case EditProductOption.AMOUNT:
                if (this.updateOptionValue == -1) return t(`${this.locale}.messages.unlimited`)
                return `${this.updateOptionValue ?? t("defaultComponents.unset")}`
            default:
                assertNeverReached(option)
        }
    }
}