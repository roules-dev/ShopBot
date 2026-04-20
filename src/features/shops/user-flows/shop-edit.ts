import { t } from "@/core/i18n/i18n.js"
import { getShops, updateShopPosition } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction } from "discord.js"
import { Shop } from "../database/shops.types.js"

//! --------------------------------
// TODO this needs to be refactored
//! --------------------------------


export const EDIT_SHOP_OPTIONS = {
    Name: "name",
    Description: "description",
    Emoji: "emoji",
    ReservedTo: "reserved-to-role"
} as const

// type EditShopOption = typeof EDIT_SHOP_OPTIONS[keyof typeof EDIT_SHOP_OPTIONS]

// function isShopOption(subcommand: string): subcommand is EditShopOption { return Object.values(EDIT_SHOP_OPTIONS).includes(subcommand as EditShopOption) }

// function getShopOptionName(option: EditShopOption) { 
//     switch (option) {
//         case EDIT_SHOP_OPTIONS.Name:
//         case EDIT_SHOP_OPTIONS.Description:
//         case EDIT_SHOP_OPTIONS.Emoji:
//             return option
//         case EDIT_SHOP_OPTIONS.ReservedTo:
//             return "reservedTo"
//         default:
//             assertNeverReached(option)
//     }
// }

// export class EditShopFlow extends UserFlow {
//     public override get id(): string { 
//         return "edit-shop" 
//     }

//     private selectedShop: Shop & Identifiable<NanoId> | null = null

//     private updateOption: EditShopOption | null = null
//     private updateOptionValue: string | null = null
//     private updateOptionValueDisplay: string | null = null

    

//     public override async start(interaction: ChatInputCommandInteraction) {
//         const shops = getShops()
//         if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

//         const subcommand = interaction.options.getSubcommand()
//         if (!subcommand || !isShopOption(subcommand)) return replyErrorMessage(interaction, t("errorMessages.invalidSubcommand"))
//         this.updateOption = subcommand as EditShopOption
        
//         const [error, updateValue] = this.getUpdateValue(interaction, subcommand)

//         if (error) return replyErrorMessage(interaction, error.message)
//         this.updateOptionValue = updateValue

//         this.updateOptionValueDisplay = this.getUpdateValueDisplay(interaction, subcommand) || this.updateOptionValue

        
//         this.updateComponents()

//         const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
//         this.createComponentsCollectors(response)
//         return
//     }

//     protected override getMessage() {
//         const message = t(`userFlows.shopEdit.messages.default`, { 
//             shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
//             option: bold(this.getUpdateOptionName(this.updateOption!)),
//             value: bold(`${this.updateOptionValueDisplay}`)
//         })

//         return message
//     }

//     protected override initComponents() {
//         const shopSelectMenu = new ExtendedStringSelectMenuComponent({
//                 customId: `${this.id}+select-shop`,
//                 placeholder: t("defaultComponents.selectShop"),
//                 time: 120_000,
//             },
//             getShops(),
//             (interaction) => this.updateInteraction(interaction),
//             (interaction, selected) => {
//                 this.selectedShop = selected
//                 this.updateInteraction(interaction)
//             },
//         )

//         const submitButton = new ExtendedButtonComponent(
//             {
//                 customId: `${this.id}+submit`,
//                 time: 120_000,
//                 label: t(`userFlows.shopEdit.components.submitButton`),
//                 emoji: {name: "✅"},
//                 style: ButtonStyle.Success,
//                 disabled: true,
//             },
//             (interaction: ButtonInteraction) => this.success(interaction),
//         )

//         return [
//             createComponent(shopSelectMenu),
//             createComponent(submitButton, () => submitButton.toggle(this.selectedShop != null)),
//         ]
//     }


//     protected override async success(interaction: ButtonInteraction) {
//         this.disableComponents()

//         if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
//         if (!this.updateOption || !this.updateOptionValue || !this.updateOptionValueDisplay) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
//         const oldName = this.selectedShop?.name || ""

//         // TODO needs refactoring
//         const [error] = await updateShop(this.selectedShop.id, { [getShopOptionName(this.updateOption)]: this.updateOptionValue })

//         if (error) return await updateAsErrorMessage(interaction, error.message)

//         const message = t(`userFlows.shopEdit.messages.success`, {
//             shop: bold(oldName),
//             option: bold(this.getUpdateOptionName(this.updateOption)),
//             value: bold(`${this.updateOptionValueDisplay}`)
//         })

//         return await updateAsSuccessMessage(interaction, message)
//     }


//     private getUpdateValue(interaction: ChatInputCommandInteraction, subcommand: EditShopOption){
//         let updateValue: string | undefined

//         switch (subcommand) {
//             case EDIT_SHOP_OPTIONS.Name:
//                 updateValue = interaction.options.getString("new-name")?.replaceSpaces() ?? t("defaultComponents.unset")
//                 break
//             case EDIT_SHOP_OPTIONS.Description:
//                 updateValue = interaction.options.getString("new-description")?.replaceSpaces() ?? t("defaultComponents.unset")
//                 break
//             case EDIT_SHOP_OPTIONS.Emoji: {
//                 const emojiOption = interaction.options.getString("new-emoji")
//                 const [error, emoji] = validate(EmojiSchema, emojiOption)
//                 updateValue = error ? t("defaultComponents.unset") : emoji
//                 break
//             }
//             case EDIT_SHOP_OPTIONS.ReservedTo:
//                 updateValue = interaction.options.getRole("new-role")?.id ?? t("defaultComponents.unset")
//                 break
//             default:
//                 assertNeverReached(subcommand)
//         }

//         if (!updateValue) return err(t("errorMessages.insufficientParameters"))

//         return ok(updateValue)
//     }

//     private getUpdateOptionName(option: EditShopOption) { 
//         return t(`userFlows.shopEdit.editOptions.${option}`)
//     }

//     private getUpdateValueDisplay(interaction: ChatInputCommandInteraction, subcommand: EditShopOption) {
//         switch (subcommand) {
//             case EDIT_SHOP_OPTIONS.ReservedTo: {
//                 const role = interaction.options.getRole("new-role")
//                 if (!role) return t("defaultComponents.unset")
//                 return roleMention(role.id)
//             }
//             default:
//                 return null
//         }
//     }
// }


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
            shop: bold(this.selectedShop?.name || t("defaultComponents.selectShop")),
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
            shop: bold(this.selectedShop.name),
            position: bold(`${this.selectedPosition}`)
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}

