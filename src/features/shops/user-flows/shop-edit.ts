import { t } from "@/core/i18n/i18n.js"
import { getShops, updateShop, updateShopPosition } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { optionalOrNull } from "@/schemas/optional-to-null.js"
import { emojiSchema, snowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName, getDisplayOptionValue } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction } from "discord.js"
import z from "zod"
import { Shop } from "../database/shops.types.js"

export const editShopParamsSchema = z.discriminatedUnion("kind", [
    z.object({ 
        kind: z.literal("name"), 
        name: z.string() 
    }),
    z.object({ 
        kind: z.literal("emoji"),
        emoji: optionalOrNull(emojiSchema).catch(null) 
    }),
    z.object({
        kind: z.literal("description"),
        description: optionalOrNull(z.string())
    }),
    z.object({
        kind: z.literal("reserved_to_role"),
        role: optionalOrNull(snowflakeSchema)
    }).transform(({role}) => {
        return { kind: "reservedTo" as const, reservedTo: role }
    })
])

export class EditShopFlow extends UserFlow<z.infer<typeof editShopParamsSchema>> {
    public override get id(): string { 
        return "edit-shop" 
    }  

    private selectedShop: Shop & Identifiable<NanoId> | null = null

    protected override async prestart(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return err(t("errorMessages.noShops"))

        if (interaction.guildId == null) return err("Unexpected: Guild ID is null")

        if (this.params.kind == "reservedTo" && this.params.reservedTo == interaction.guildId) {
            // Role ID = Guild ID means the role is @everyone, thus the shop is not reserved
            this.params.reservedTo = null
        }

        return ok(true)
    }

    protected override getMessage() {
        const message = t(`userFlows.shopEdit.messages.default`, { 
            shop: bold(formattedEmojiableName(this.selectedShop) || t("defaultComponents.selectShop")),
            option: bold(this.params.kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })

        return message
    }

    protected override initComponents() {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent({
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000,
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            },
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                time: 120_000,
                label: t(`userFlows.shopEdit.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => this.success(interaction),
        )

        return [
            createComponent(shopSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedShop != null)),
        ]
    }

    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const oldName = formattedEmojiableName(this.selectedShop)

        const [error] = await updateShop(this.selectedShop.id, this.params)

        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.shopEdit.messages.success`, {
            shop: bold(oldName),
            option: bold(this.params.kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}

export class ShopReorderFlow extends UserFlow {
    public override get id(): string { 
        return "shop-reorder" 
    }

    private selectedShop: Shop & Identifiable<NanoId> | null = null
    private selectedPosition: number | null = null

    public override async prestart(_interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        const firstShopEntry = shops.entries().next().value
        if (!firstShopEntry) return err(t("errorMessages.noShops"))


        this.selectedShop = { ...firstShopEntry[1], id: firstShopEntry[0] }
        this.selectedPosition = 0 + 1

        return ok(true)
    }

    protected override getMessage() {
        const message = t(`userFlows.shopReorder.messages.default`, { 
            shop: bold(formattedEmojiableName(this.selectedShop) || t("defaultComponents.selectShop")),
            position: bold(`${this.selectedPosition}` || t(`userFlows.shopReorder.components.selectPosition`))
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
                label: t(`userFlows.shopReorder.components.submitNewPositionButton`),
                emoji: {name: ""},
                style: ButtonStyle.Success,
                disabled: true,
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        return [
            createComponent(shopSelectMenu),

            createComponent(upButton, () => upButton.toggle(this.selectedPosition != null && this.selectedPosition > 1)),

            createComponent(downButton, () => downButton.toggle(this.selectedPosition != null && this.selectedPosition < getShops().size)),

            createComponent(submitNewPositionButton, () => submitNewPositionButton.toggle(this.selectedShop != null && this.selectedPosition != null)),
        ]
    }


    protected override async success(interaction: ButtonInteraction) {
        if (!this.selectedShop || !this.selectedPosition) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await updateShopPosition(this.selectedShop.id, this.selectedPosition - 1)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.shopReorder.messages.success`, {
            shop: bold(formattedEmojiableName(this.selectedShop)),
            position: bold(`${this.selectedPosition}`)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}

