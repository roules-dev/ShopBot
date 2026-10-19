import { t } from "@/core/i18n/i18n.js"
import { errorFormat } from "@/lib/discord/answer-interactions.js"
import { Emojiable, Labelled } from "@/lib/types/core.js"
import { MutableOrReadonlyMap } from "@/lib/types/helpers.js"
import { showValidatedSingleInputModal } from "@/lib/ui/components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/components/string-select-menu.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import z from "zod"

export type SelectionBuilderStrings = {
    selectMenuPlaceholder: string,
    editAmountModalTitle: string,
    editAmountModalInputLabel: string,
}

export function getSelectionBuilder(
    id: string, 
    previousSelection: Record<string, number> | null, 
    strings: SelectionBuilderStrings,
    map: MutableOrReadonlyMap<string, Labelled & Emojiable>,
    onSelectionUpdate: (selection: Record<string, number>) => void, 
    update: (interaction: UserInterfaceInteraction, additionalMessage?: string) => void
) {

    let selection = previousSelection

    const selectionBuilderSelectMenu = new ExtendedStringSelectMenuComponent(
        {
            customId: `${id}+select`,
            placeholder: strings.selectMenuPlaceholder,
            time: 120_000
        },
        map,
        (interaction) => update(interaction),
        async (interaction, selected) => {
            selection = selection ?? {}
            
            const previousAmount = selection[selected.id]
            
            const [modalSubmit, [error, amount]] = await showValidatedSingleInputModal(interaction, {
                id: `${id}+amount`,
                title: strings.editAmountModalTitle,
                inputLabel: strings.editAmountModalInputLabel,
                placeholder: previousAmount?.toString() ?? strings.editAmountModalTitle,
                required: true
            }, z.coerce.number().gte(0, { message: t("errorMessages.invalidAmount") }))

            if (error) {
                if (error.name === "ModalTimeout") return
                return update(modalSubmit, errorFormat(t("errorMessages.noAnswer")))
            }

            if (amount === previousAmount) return update(modalSubmit)
            if (amount === 0) {
                delete selection[selected.id]
            }
            else {
                selection[selected.id] = amount
            }
            
            onSelectionUpdate(selection)
            
            update(modalSubmit)
        }
    )
    
    return selectionBuilderSelectMenu
}
