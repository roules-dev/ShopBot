import { t } from "@/core/i18n/i18n.js"
import { createDiscountCode, getShops, removeDiscountCode } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { assertNeverReached, err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ComponentSeparator, createComponent, ExtendedComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow, UserFlow2 } from "@/lib/ui/user-flows/user-flow.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags, StringSelectMenuInteraction } from "discord.js"
import { Shop } from "../database/shops.types.js"
import z from "zod"


export class DiscountCodeCreateFlow extends UserFlow {
    public override get id(): string { 
        return "discount-code-create" 
    }
    
    private selectedShop: Shop & Identifiable<NanoId> | null = null
    private discountCode: string | null = null
    private discountAmount: number | null = null


    public override async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        const discountCode = interaction.options.getString("code")?.replaceSpaces("").toUpperCase()
        const discountAmount = interaction.options.getInteger("amount")

        if (!discountCode || !discountAmount) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        this.discountCode = discountCode
        this.discountAmount = discountAmount

        
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage() {
        const message = t(`userFlows.discountCodeCreate.messages.default`, {
            shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
            code: bold(this.discountCode!),
            amount: bold(`${this.discountAmount}`)
        })

        return message
    }

    protected override initComponents() {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000,
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`userFlows.discountCodeCreate.components.submitButton`),
                emoji: {name: "✅"},
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        return [
            createComponent(shopSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedShop != null))
        ]
    }

    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (!this.discountCode || !this.discountAmount) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await createDiscountCode(this.selectedShop.id, this.discountCode, this.discountAmount)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.discountCodeCreate.messages.success`, { 
            shop: bold(this.selectedShop.name), 
            code: bold(this.discountCode), 
            amount: bold(`${this.discountAmount}`)
        })

        return await updateAsSuccessMessage(interaction, message)

    }
}

export const DISCOUNT_CODE_REMOVE_STAGE = {
    SELECT_SHOP: "SELECT_SHOP",
    SELECT_DISCOUNT_CODE: "SELECT_DISCOUNT_CODE",
} as const;

export type DiscountCodeRemoveStage = keyof typeof DISCOUNT_CODE_REMOVE_STAGE;

export class DiscountCodeRemoveFlow extends UserFlow {
    public override get id(): string { 
        return "discount-code-remove" 
    }

    private stage: DiscountCodeRemoveStage = DISCOUNT_CODE_REMOVE_STAGE.SELECT_SHOP
    private componentsByStage: Map<DiscountCodeRemoveStage, Map<string, ExtendedComponent>> = new Map()

    private selectedShop: Shop & Identifiable<NanoId> | null = null
    private selectedDiscountCode: string | null = null

    private response: InteractionCallbackResponse | null = null

    

    public override async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.response = response
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage() {
        switch (this.stage) {
            case DISCOUNT_CODE_REMOVE_STAGE.SELECT_SHOP:
                return t(`userFlows.discountCodeRemove.messages.shopSelectStage`, {
                    shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop"))
                })
            case DISCOUNT_CODE_REMOVE_STAGE.SELECT_DISCOUNT_CODE:
                if (this.selectedShop == null) throw new Error("Unexpected null selectedShop in DISCOUNT_CODE_REMOVE_STAGE.SELECT_DISCOUNT_CODE stage")

                return t(`userFlows.discountCodeRemove.messages.codeSelectStage`, {
                    shop: bold(this.selectedShop?.name),
                    code: bold(this.selectedDiscountCode || t(`userFlows.discountCodeRemove.components.discountCodeSelect`))
                })
            default:
                assertNeverReached(this.stage)
        }
    }

    protected override initComponents() {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000,
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                time: 120_000,
                label: t("defaultComponents.submitShopButton"),
                emoji: {name: "✅"},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => {
                const shopDiscountCodes = this.selectedShop?.discountCodes

                if (!shopDiscountCodes || Object.keys(shopDiscountCodes).length == 0) return updateAsErrorMessage(interaction, "The selected shop has no discount codes")

                this.changeStage(DISCOUNT_CODE_REMOVE_STAGE.SELECT_DISCOUNT_CODE)
                return this.updateInteraction(interaction)
            }
        )

        this.componentsByStage.set(DISCOUNT_CODE_REMOVE_STAGE.SELECT_SHOP, new Map())
        this.componentsByStage.get(DISCOUNT_CODE_REMOVE_STAGE.SELECT_SHOP)?.set(shopSelectMenu.customId, shopSelectMenu)
        this.componentsByStage.get(DISCOUNT_CODE_REMOVE_STAGE.SELECT_SHOP)?.set(submitButton.customId, submitButton)

        const initialComponents = [createComponent(shopSelectMenu), createComponent(submitButton, () => submitButton.toggle(this.selectedShop != null))]

        const discountCodeSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-discount-code`,
                placeholder: t(`userFlows.discountCodeRemove.components.discountCodeSelect`),
                time: 120_000,
            },
            new Map(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: string) => {
                this.selectedDiscountCode = selected
                this.updateInteraction(interaction)
            }
        )

        const submitRemoveButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+remove-discount-code`,
                time: 120_000,
                label: t(`userFlows.discountCodeRemove.components.submitButton`),
                emoji: {name: "⛔"},
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
                emoji: {name: "📝"},
                style: ButtonStyle.Secondary
            },
            (interaction: ButtonInteraction) => {
                this.selectedShop = null
                this.selectedDiscountCode = null

                this.changeStage(DISCOUNT_CODE_REMOVE_STAGE.SELECT_SHOP)
                this.updateInteraction(interaction)
            },
        )

        this.componentsByStage.set(DISCOUNT_CODE_REMOVE_STAGE.SELECT_DISCOUNT_CODE, new Map())
        this.componentsByStage.get(DISCOUNT_CODE_REMOVE_STAGE.SELECT_DISCOUNT_CODE)?.set(discountCodeSelectMenu.customId, discountCodeSelectMenu)
        this.componentsByStage.get(DISCOUNT_CODE_REMOVE_STAGE.SELECT_DISCOUNT_CODE)?.set(submitRemoveButton.customId, submitRemoveButton)
        this.componentsByStage.get(DISCOUNT_CODE_REMOVE_STAGE.SELECT_DISCOUNT_CODE)?.set(changeShopButton.customId, changeShopButton)

        return initialComponents
    }

    protected override onUpdateComponents() {
        // if (this.stage == DISCOUNT_CODE_REMOVE_STAGE.SELECT_SHOP) {
        //     const submitButton = this.components.get(`${this.id}+submit`)
        //     if (!(submitButton instanceof ExtendedButtonComponent)) return

        //     submitButton.toggle(this.selectedShop != null)
        // } 
        
        if (this.stage == DISCOUNT_CODE_REMOVE_STAGE.SELECT_DISCOUNT_CODE) {
            const submitRemoveButton = this.components.get(`${this.id}+remove-discount-code`)
            if (
                submitRemoveButton &&
                !(submitRemoveButton instanceof ComponentSeparator) &&
                submitRemoveButton.comp instanceof ExtendedButtonComponent
            ) {
                submitRemoveButton.comp.toggle(this.selectedDiscountCode != null)
            }

            const selectDiscountCodeMenu = this.components.get(`${this.id}+select-discount-code`)
            if (
                selectDiscountCodeMenu &&
                !(selectDiscountCodeMenu instanceof ComponentSeparator) &&
                selectDiscountCodeMenu.comp instanceof ExtendedStringSelectMenuComponent
            ) {
                selectDiscountCodeMenu.comp.updateMap(new Map(Object.keys(this.selectedShop?.discountCodes || {}).map(code => [code, {id: code, name: code}])))
            }
        }
    }

    private changeStage(newStage: DiscountCodeRemoveStage) {
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

        const message = t(`userFlows.discountCodeRemove.messages.success`, { 
            shop: bold(this.selectedShop.name), 
            code: bold(this.selectedDiscountCode) 
        })

        return await updateAsSuccessMessage(interaction, message)

    }
}



////                                             


export const DiscountCodeCreateParamsSchema = z.object({
    code: z.string().overwrite((code) => code.replaceSpaces("").toUpperCase()),
    amount: z.number()
})

export class DiscountCodeCreateFlow2 extends UserFlow2<z.infer<typeof DiscountCodeCreateParamsSchema>> {
    public override get id(): string { 
        return "discount-code-create" 
    }
    
    private selectedShop: Shop & Identifiable<NanoId> | null = null

    protected override async prestart(_interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return err(t("errorMessages.noShops"))
        
        return ok(true)
    }

    protected override getMessage() {
        const message = t(`userFlows.discountCodeCreate.messages.default`, {
            shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
            code: bold(this.parameters.code),
            amount: bold(`${this.parameters.amount}`)
        })

        return message
    }

    protected override initComponents() {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000,
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`userFlows.discountCodeCreate.components.submitButton`),
                emoji: {name: "✅"},
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        return [
            createComponent(shopSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedShop != null)),
        ]
    }


    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await createDiscountCode(this.selectedShop.id, this.parameters.code, this.parameters.amount)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.discountCodeCreate.messages.success`, { 
            shop: bold(this.selectedShop.name), 
            code: bold(this.parameters.code), 
            amount: bold(`${this.parameters.amount}`)
        })

        return await updateAsSuccessMessage(interaction, message)

    }
}
