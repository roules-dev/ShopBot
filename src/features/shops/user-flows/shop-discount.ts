import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { t } from "@/lib/localization.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, StringSelectMenuInteraction } from "discord.js"
import { createDiscountCode, getShops, removeDiscountCode } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"


export class DiscountCodeCreateFlow extends UserFlow {
    public override id: string = 'discount-code-create'
    protected override components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null
    private discountCode: string | null = null
    private discountAmount: number | null = null

    protected locale = "userFlows.discountCodeCreate" as const

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        const discountCode = interaction.options.getString('code')?.replaceSpaces('').toUpperCase()
        const discountAmount = interaction.options.getInteger('amount')

        if (!discountCode || !discountAmount) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        this.discountCode = discountCode
        this.discountAmount = discountAmount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const message = t(`${this.locale}.messages.default`, {
            shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
            code: bold(this.discountCode!),
            amount: bold(`${this.discountAmount}`)
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
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`${this.locale}.components.submitButton`),
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

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.discountCode || !this.discountAmount) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await createDiscountCode(this.selectedShop.id, this.discountCode, this.discountAmount)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, { 
            shop: bold(this.selectedShop.name), 
            code: bold(this.discountCode), 
            amount: bold(`${this.discountAmount}`)
        })

        return await updateAsSuccessMessage(interaction, message)

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

    protected locale = "userFlows.discountCodeRemove" as const

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
            case DiscountCodeRemoveStage.SELECT_SHOP:
                return t(`${this.locale}.messages.shopSelectStage`, {
                    shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop"))
                })
            case DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE:
                if (this.selectedShop == null) throw new Error("Unexpected null selectedShop in DiscountCodeRemoveStage.SELECT_DISCOUNT_CODE stage")

                return t(`${this.locale}.messages.codeSelectStage`, {
                    shop: bold(this.selectedShop?.name),
                    code: bold(this.selectedDiscountCode || t(`${this.locale}.components.discountCodeSelect`))
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
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                time: 120_000,
                label: t("defaultComponents.submitShopButton"),
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

        const discountCodeSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-discount-code`,
                placeholder: t(`${this.locale}.components.discountCodeSelect`),
                time: 120_000,
            },
            new Map(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: string): void => {
                this.selectedDiscountCode = selected
                this.updateInteraction(interaction)
            }
        )

        const submitRemoveButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+remove-discount-code`,
                time: 120_000,
                label: t(`${this.locale}.components.submitButton`),
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
                label: t("defaultComponents.changeShopButton"),
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

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.selectedDiscountCode) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await removeDiscountCode(this.selectedShop.id, this.selectedDiscountCode)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`${this.locale}.messages.success`, { 
            shop: bold(this.selectedShop.name), 
            code: bold(this.selectedDiscountCode) 
        })

        return await updateAsSuccessMessage(interaction, message)

    }
}