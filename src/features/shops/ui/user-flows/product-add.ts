import { HYDRATOR } from "@/core/database/init-databases.js";
import { t } from "@/core/i18n/i18n.js";
import { getItems } from "@/core/services/items/items.services.js";
import { addProduct } from "@/core/services/shops/products.services.js";
import { getShops } from "@/core/services/shops/shops.services.js";
import { NanoId } from "@/database/database.types.js";
import { Item } from "@/features/items/database/items.types.js";
import { errorFormat, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js";
import { err, ok } from "@/lib/error-handling.js";
import { Identifiable } from "@/lib/types/core.js";
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js";
import { ExtendedButtonComponent } from "@/lib/ui/components/button.js";
import { ComponentSeparator, createComponent } from "@/lib/ui/components/extended-components.js";
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/components/string-select-menu.js";
import { StagedUserFlow } from "@/lib/ui/user-flows/user-flow.js";
import { UIComponent } from "@/lib/ui/user-interfaces/user-interfaces.js";
import { optionalOrNull } from "@/schemas/optional-to-null.js";
import { formattedEmojiableName } from "@/utils/formatting.js";
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction } from "discord.js";
import z from "zod";
import { getAction, productActions } from "../../data/product-actions/index.js";
import { Shop } from "../../database/shops.types.js";
import { productActionSchema, productActionSchemaKinds } from "../../schemas/products.schemas.js";
import { formatPrice, MAX_PRICE_LENGTH } from "../../services/price.js";
import { getPriceElementComponents } from "../components/price-element-components.js";


export const addProductParamsSchema = z.object({
    stock: optionalOrNull(z.number().min(0)),
})

export class AddProductFlow<S extends z.infer<typeof addProductParamsSchema>> extends StagedUserFlow<S> {
    protected override stage: number = 0
    public override get id(): string { 
        return "add-product" 
    }

    protected selectedItem: Item & Identifiable<NanoId> | null = null
    protected price: Record<NanoId, number> | null = null
    protected selectedShop: Shop & Identifiable<NanoId> | null = null

    protected override async prepare(_interaction: ChatInputCommandInteraction) {
        const items = getItems()
        if (!items.size) return err(t("errorMessages.noItems"))

        const shops = getShops()
        if (!shops.size) return err(t("errorMessages.noShops"))

        return ok(true)
    }

    protected override getMessage() {
        const nameString = bold(formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem"))

        let priceString = t("userFlows.productAdd.components.addPriceButton")
        if (this.price !== null) {
            const [error, price] = HYDRATOR.getHydratedPrice(this.price)
            if (!error) {
                priceString = formatPrice(price)
            }
            else {
                priceString = errorFormat(t("errorMessages.hydration.priceDisplayFailed"))
            } 
        }
        

        const message = t(`userFlows.productAdd.messages.default`, {
            product: nameString,
            price: bold(priceString),
            shop: bold(formattedEmojiableName(this.selectedShop) || t("defaultComponents.selectShop"))
        })

        return message
    }

    protected override initStageComponents(_params: S): Array<UIComponent[]> {
        const itemSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-item`,
                placeholder: t("defaultComponents.selectItem"),
                time: 120_000
            },
            getItems(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selectedItem) => {
                this.selectedItem = selectedItem
                this.updateInteraction(interaction)
            }
        )
        const submitItem = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-item`,
                label: t(`userFlows.productAdd.components.submitItemButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => {
                this.changeStage("next")
                this.updateInteraction(interaction)
            }
        )

        const { addPriceWithCurrencySelect, removePriceElementButton } = getPriceElementComponents(
            this.id, 
            this.price, 
            (price) => this.price = price, 
            (interaction) => this.updateInteraction(interaction)
        )

        const submitPriceButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-price`,
                label: t(`userFlows.productAdd.components.submitPriceButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: false,
                time: 120_000
            },
            (interaction) => {
                this.price = this.price ?? {}
                this.changeStage("next")
                this.updateInteraction(interaction)
            }
        )

        const shopSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000
            },
            getShops(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitShopButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit-shop`,
                label: t(`userFlows.productAdd.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        return [
            [
                createComponent(itemSelectMenu),
                createComponent(submitItem, () => submitItem.toggle(this.selectedItem != null)),
            ],
            [
                createComponent(addPriceWithCurrencySelect, () => addPriceWithCurrencySelect.toggle(this.price == null || Object.keys(this.price).length < MAX_PRICE_LENGTH)),
                createComponent(removePriceElementButton, () => removePriceElementButton.toggle(this.price != null && Object.values(this.price).length > 0)),
                createComponent(submitPriceButton),
                new ComponentSeparator("sep_price"),
                createComponent(this.getStageSwitchButtons().prev),
            ],
            [
                createComponent(shopSelectMenu, () => shopSelectMenu.toggle(this.selectedItem != null && this.price != null)), 
                createComponent(submitShopButton, () => submitShopButton.toggle(this.selectedShop != null && this.selectedItem != null && this.price != null)),
                new ComponentSeparator("sep_shop"),
                createComponent(this.getStageSwitchButtons().prev),
            ]
        ]
    }


    protected override async success(interaction: UserInterfaceInteraction) {
        if (!(this.selectedShop && this.selectedItem && (this.price !== null))) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const optionals = {
            ...(this.params.stock ? {stock: this.params.stock} : {}),
        }
        
        const [error, _] = await addProduct(this.selectedShop.id, {
            itemId: this.selectedItem.id,
            price: this.price,
            ...optionals
        })
        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productAdd.messages.success`, {
            product: bold(formattedEmojiableName(this.selectedItem)),
            shop: bold(formattedEmojiableName(this.selectedShop))
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}





export const addActionProductParamsSchema = z.object({
    stock: optionalOrNull(z.number().min(0)),
    action: productActionSchemaKinds
})

type AddActionProductParams = z.infer<typeof addActionProductParamsSchema>

export class AddActionProductFlow extends AddProductFlow<AddActionProductParams> {
    public override get id(): string { 
        return "add-action-product" 
    }

    private selectedAction: z.infer<typeof productActionSchema> | null = null

    protected override getMessage() {
        const addProductMessage = super.getMessage()
        if (this.stage < 2) return addProductMessage
        
        const actionMessage = getAction(this.params.action).getMessage(this.selectedAction?.options, HYDRATOR)

        return `${addProductMessage}\n${t(`userFlows.productAdd.messages.action`)} ${actionMessage}`
    }
    
    protected override initStageComponents(params: AddActionProductParams) {
        const [selectItem, buildPrice, submit] = super.initStageComponents(params)
        if (!selectItem || !buildPrice || !submit) throw new Error("Unxpected Error loading AddActionProductFlow components")


        const createActionComponents = productActions[params.action].getEditComponents(
            this.id, 
            (interaction, action) => {
                this.selectedAction = action
                this.updateInteraction(interaction)
            }, 
            i => this.updateInteraction(i)
        )

        const submitActionButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`userFlows.productAdd.components.submitActionButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => {
                this.changeStage("next")
                this.updateInteraction(interaction)
            }
        )

        const actionComponents = [
            ...createActionComponents,
            createComponent(submitActionButton, () => submitActionButton.toggle(this.selectedAction != null)),
            new ComponentSeparator("sep_action"),
            createComponent(this.getStageSwitchButtons().prev),
        ]


        return [
            selectItem,
            buildPrice,
            actionComponents,
            submit
        ] 
    }

    protected override async success(interaction: UserInterfaceInteraction) {
        if (!(this.selectedShop && this.selectedItem && (this.price !== null))) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const optionals = {
            ...(this.params.stock ? {stock: this.params.stock} : {}),
        }
        
        const [error, _] = await addProduct(this.selectedShop.id, {
            itemId: this.selectedItem.id,
            price: this.price,
            action: this.selectedAction,
            ...optionals
        })
        if (error) return await updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.productAdd.messages.success`, {
            product: bold(formattedEmojiableName(this.selectedItem)),
            shop: bold(formattedEmojiableName(this.selectedShop))
        })

        const withActionMessage = t(`userFlows.productAdd.messages.withAction`, { action: bold(`${getAction(this.params.action).name}`) })
        const actionMessage = getAction(this.params.action).getMessage(this.selectedAction?.options, HYDRATOR)

        return await updateAsSuccessMessage(interaction, `${message} ${withActionMessage}\n${t(`userFlows.productAdd.messages.action`)} ${actionMessage}`)
    }

}
