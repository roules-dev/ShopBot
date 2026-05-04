import { t } from "@/core/i18n/i18n.js"
import { getItems, updateItem } from "@/core/services/items/items.services.js"
import { NanoId } from "@/database/database.types.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { optionalOrNull } from "@/schemas/optional-to-null.js"
import { emojiSchema } from "@/schemas/utils.js"
import { formattedEmojiableName, getDisplayOptionValue } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction } from "discord.js"
import z from "zod"
import { Item } from "../../database/items.types.js"


export const editItemParamsSchema = z.discriminatedUnion("kind", [
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
    })
])


export class EditItemFlow extends UserFlow<z.infer<typeof editItemParamsSchema>> {
    public override get id(): string { 
        return "item-edit" 
    }

    private selectedItem: Item & Identifiable<NanoId> | null = null
    
    protected override async prestart(_interaction: ChatInputCommandInteraction) {
        const items = getItems()
        if (items.size == 0) return err(t("errorMessages.noItems"))

        return ok(true)
    }

    protected override getMessage() {
        const message = t(`userFlows.itemEdit.messages.default`, {
            item: bold(formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem")),
            option: bold(this.params.kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })

        return message
    }

    protected override initComponents() {
        const itemSelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-item`, placeholder: t("defaultComponents.selectItem"), time: 120_000 },
            getItems(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction , selectedItem) => {
                this.selectedItem = selectedItem
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`userFlows.itemEdit.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: this.selectedItem == null,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.success(interaction),
        )

        return [
            createComponent(itemSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedItem != null)),
        ]
    }

    protected override async success(interaction: UserInterfaceInteraction) {
        if (!this.selectedItem) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const oldName = formattedEmojiableName(this.selectedItem)
        const { kind, ...option } = this.params

        const [error] = await updateItem(this.selectedItem.id, option)

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = t(`userFlows.itemEdit.messages.success`, {
            item: bold(oldName),
            option: bold(kind),
            value: bold(getDisplayOptionValue(this.params, t("defaultComponents.unset")))
        })

        return await updateAsSuccessMessage(interaction, message)
    }
}
