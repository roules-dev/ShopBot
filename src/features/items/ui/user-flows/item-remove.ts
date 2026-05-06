import { t } from "@/core/i18n/i18n.js"
import { err, ok } from "@/lib/error-handling.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showConfirmationModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonStyle, ChatInputCommandInteraction } from "discord.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { NanoId } from "@/database/database.types.js"
import { Identifiable } from "@/lib/types/core.js"
import { getItems } from "@/core/services/items/items.services.js"
import { deleteItem } from "@/core/services/items/items.services.js"
import { Item } from "../../database/items.types.js"
import { takeItemFromAccounts } from "@/features/accounts/services/accounts.services.js"


export class ItemRemoveFlow extends UserFlow {
    public override get id(): string {
        return "item-remove"
    }
    private selectedItem: Item & Identifiable<NanoId> | null = null

    public override async prestart(_interaction: ChatInputCommandInteraction) {
        const items = getItems()
        if (items.size == 0) return err(t("errorMessages.noItems"))

        return ok(true)
    }

    protected override initComponents() {
        const itemSelect = new ExtendedStringSelectMenuComponent(
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
        })

        const submitButton = new ExtendedButtonComponent({
                customId: `${this.id}+submit`,
                label: t(`userFlows.itemRemove.components.submitButton`),
                emoji: "⛔",
                style: ButtonStyle.Danger,
                disabled: this.selectedItem == null,
                time: 120_000,
            },
            async (interaction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)
                
                if (confirmed) return this.success(modalSubmitInteraction)
                
                return this.updateInteraction(modalSubmitInteraction)
            }
        )

        return [
            createComponent(itemSelect),
            createComponent(submitButton, () => {
                submitButton.toggle((this.selectedItem != null) && (this.selectedItem.refCount == 0)) 
            })
        ]
    }
    
    getMessage() {  
        if (this.selectedItem) {
            if (this.selectedItem.refCount > 0) {
                return t(`userFlows.itemRemove.errorMessages.cantRemoveItem`, {
                    item: bold(formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem"))
                })
            }
        }

        const message = t(`userFlows.itemRemove.messages.default`, {
            item: bold(formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem"))
        })

        return message
    }

    protected async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        if (this.selectedItem == null) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        if (this.selectedItem.refCount > 0) {
            return updateAsErrorMessage(interaction, t("userFlows.itemRemove.errorMessages.cantRemoveItem", {
                item: bold(formattedEmojiableName(this.selectedItem))
            }))
        }

        const [error] = await takeItemFromAccounts(this.selectedItem.id)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const [error2] = await deleteItem(this.selectedItem.id)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        return await updateAsSuccessMessage(interaction, t(`userFlows.itemRemove.messages.success`, {item: bold(formattedEmojiableName(this.selectedItem))}))
    }
}
