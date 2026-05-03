import { HydratedProduct } from "@/core/database/hydrator.js";
import { HYDRATOR } from "@/core/database/init-databases.js";
import { t } from "@/core/i18n/i18n.js";
import { updateProduct } from "@/core/services/shops/products.services.js";
import { getShops } from "@/core/services/shops/shops.services.js";
import { NanoId } from "@/database/database.types.js";
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js";
import { err, ok } from "@/lib/error-handling.js";
import { Identifiable } from "@/lib/types/core.js";
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js";
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js";
import { createComponent } from "@/lib/ui/ui-components/extended-components.js";
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js";
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js";
import { optionalOrNull } from "@/schemas/optional-to-null.js";
import { formattedEmojiableName, getDisplayOptionValue } from "@/utils/formatting.js";
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction } from "discord.js";
import z from "zod";
import { Shop } from "../database/shops.types.js";


export const editProductParamsSchema = z.discriminatedUnion("kind", [
    z.object({ 
        kind: z.literal("stock"), 
        stock: optionalOrNull(z.int().min(0))
    })
])


export class EditProductFlow extends UserFlow<z.infer<typeof editProductParamsSchema>> {
    public override get id(): string { 
        return "product-edit" 
    }

    private selectedShop: Shop & Identifiable<NanoId> | null = null
    private selectedProduct: HydratedProduct | null = null

    protected override async prestart(_interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (shops.size == 0) return err(t("errorMessages.noShops"))

        return ok(true)
    }

    protected getMessage(): string {
        if (this.selectedShop == null) {
            return t(`userFlows.productEdit.messages.shopSelectStage`, {
                shop: bold(t("defaultComponents.selectShop")),
                option: bold(this.params.kind),
                value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
            })
        }

        return t(`userFlows.productEdit.messages.productSelectStage`, {
            product: bold(formattedEmojiableName(this.selectedProduct?.item) || t("defaultComponents.selectProduct")),
            shop: bold(formattedEmojiableName(this.selectedShop)),
            option: bold(this.params.kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })
    }

    protected override initComponents() {
                const shopSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                // TODO : check if shop has no products update interaction with error message
                this.selectedShop = selected
                this.selectedProduct = null
                this.updateInteraction(interaction)
            }
        )

        const productSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-product`,
                placeholder: t("defaultComponents.selectProduct"),
                time: 120_000
            }, 
            new Map<NanoId, HydratedProduct>(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedProduct = selected

                this.updateInteraction(interaction)
            }
        )

        const submitEditButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+edit-product`,
                time: 120_000,
                label: t(`userFlows.productEdit.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        return [
            createComponent(shopSelectMenu),

            createComponent(productSelectMenu, () => {
                productSelectMenu.toggle(this.selectedShop != null)

                if (!this.selectedShop) return productSelectMenu.updateMap(new Map())

                const [error, shop] = HYDRATOR.fullyHydrateShop(this.selectedShop.id)
                if (error) throw error
                productSelectMenu.updateMap(shop.products)
            }),

            createComponent(submitEditButton, () => submitEditButton.toggle(
                this.selectedShop != null && this.selectedProduct != null
            )),
        ]
    }

    protected override async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        if (!this.selectedShop || !this.selectedProduct) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const oldName = formattedEmojiableName(this.selectedProduct.item)
        const { kind, ...option } = this.params

        const [error] = await updateProduct(this.selectedShop.id, this.selectedProduct.id, option)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productEdit.messages.success`, {
            product: bold(oldName),
            shop: bold(formattedEmojiableName(this.selectedShop)),
            option: bold(this.params.kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}
