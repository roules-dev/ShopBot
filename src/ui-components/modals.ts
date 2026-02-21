import { getLocale, replaceTemplates } from "@/lib/localisation.js"
import { MessageComponentInteraction, ChatInputCommandInteraction, ModalSubmitInteraction, ModalBuilder, LabelBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js"



const YES = 'yes'
const NO = 'no'

export async function showConfirmationModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction): Promise<[ModalSubmitInteraction, boolean]> {
    const strings = getLocale().extendedComponents.confirmationModal

    const modalId = 'confirmation-modal'
    const labelId = 'confirm-select-menu'

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(strings.title)

    const label = new LabelBuilder()
        .setLabel(strings.cantBeUndone)
        .setStringSelectMenuComponent(new StringSelectMenuBuilder()
            .setCustomId(labelId)
            .setPlaceholder(strings.selectYes)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(strings.yes)
                    .setValue(YES)
            )
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(strings.no)
                    .setValue(NO)
            )
        )

    modal.addLabelComponents(label)

    await interaction.showModal(modal)

    const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
    
    if (!modalSubmit.isFromMessage()) return [modalSubmit, false]
    await modalSubmit.deferUpdate()

    return [modalSubmit, modalSubmit.fields.getStringSelectValues(labelId)[0] == YES]
}

export type EditModalOptions = {
    edit: string,
    previousValue?: string,
    required?: boolean
    minLength?: number
    maxLength?: number
}

export async function showEditModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    { edit, previousValue, required, minLength, maxLength }: EditModalOptions
): Promise<[ModalSubmitInteraction, string]> {
    const strings = getLocale().extendedComponents.editModal

    const editNormalized = `${edit.toLocaleLowerCase().replaceSpaces('-')}`
    const modalId = `edit-${editNormalized}-modal`

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(replaceTemplates(strings.title, { edit }))

    
    const input = new TextInputBuilder()
        .setCustomId(`${editNormalized}-input`)
        .setPlaceholder(previousValue ?? edit)
        .setStyle(TextInputStyle.Short)
        .setRequired(required ?? true)
        .setMaxLength(maxLength ?? 120)
        .setMinLength(minLength ?? 0)

    const label = new LabelBuilder()
        .setLabel(replaceTemplates(strings.new, { edit }))
        .setTextInputComponent(input)

    modal.addLabelComponents(label)

    await interaction.showModal(modal)

    const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
    
    if (!modalSubmit.isFromMessage()) return [modalSubmit, '']
    await modalSubmit.deferUpdate()

    return [modalSubmit, modalSubmit.fields.getTextInputValue(`${editNormalized}-input`)]
}