import { t } from "@/core/i18n/i18n.js"
import { createDiscountCode, getShops, removeDiscountCode } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction } from "discord.js"
import z from "zod"
import { Shop } from "../database/shops.types.js"


export const DiscountCodeCreateParamsSchema = z.object({
    code: z.string().overwrite((code) => code.replaceSpaces("").toUpperCase()),
    amount: z.number()
})

export class DiscountCodeCreateFlow extends UserFlow<z.infer<typeof DiscountCodeCreateParamsSchema>> {
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
            shop: bold(formattedEmojiableName(this.selectedShop) || t("defaultComponents.selectShop")),
            code: bold(this.params.code),
            amount: bold(`${this.params.amount}`)
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

        const [error] = await createDiscountCode(this.selectedShop.id, this.params.code, this.params.amount)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.discountCodeCreate.messages.success`, { 
            shop: bold(this.selectedShop.name), 
            code: bold(this.params.code), 
            amount: bold(`${this.params.amount}`)
        })

        return await updateAsSuccessMessage(interaction, message)

    }
}


export class DiscountCodeRemoveFlow extends UserFlow {
    public override get id(): string { 
        return "discount-code-remove" 
    }


    private selectedShop: Shop & Identifiable<NanoId> | null = null
    private selectedDiscountCode: string | null = null


    public override async prestart(_interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return err(t("errorMessages.noShops"))

        return ok(true)
    }

    protected override getMessage() { // TODO: handle the case of a shop with no discount codes
        if (this.selectedShop == null) {
            return t(`userFlows.discountCodeRemove.messages.shopSelectStage`, {
                shop: bold(t("defaultComponents.selectShop"))
            })
        }

        return t(`userFlows.discountCodeRemove.messages.codeSelectStage`, {
            shop: bold(formattedEmojiableName(this.selectedShop)),
            code: bold(this.selectedDiscountCode || t(`userFlows.discountCodeRemove.components.discountCodeSelect`))
        })
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
                // check if shop has no discount codes give error message
                this.selectedShop = selected
                this.selectedDiscountCode = null
                this.updateInteraction(interaction)
            }
        )

        const discountCodeSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-discount-code`,
                placeholder: t(`userFlows.discountCodeRemove.components.discountCodeSelect`),
                time: 120_000,
            },
            new Map<string, { name: string }>(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedDiscountCode = selected.id
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

        return [
            createComponent(shopSelectMenu),
            createComponent(discountCodeSelectMenu, () => {
                discountCodeSelectMenu.toggle(this.selectedShop != null)

                discountCodeSelectMenu.updateMap(new Map(
                    Object.keys(this.selectedShop?.discountCodes || {}).map(code => [code, {name: code}])
                ))
            }),
            createComponent(submitRemoveButton, () => submitRemoveButton.toggle(
                this.selectedShop != null && this.selectedDiscountCode != null
            ))
        ]
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

