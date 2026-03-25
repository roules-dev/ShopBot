import { t } from "@/core/i18n/i18n.js"
import { ChatInputCommandInteraction, LabelBuilder, MessageComponentInteraction, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import z from "zod"

const YES = "yes"
const NO = "no"

export async function showConfirmationModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction): Promise<[ModalSubmitInteraction, boolean]> {
    const modalLocale = "extendedComponents.confirmationModal"

    const modalId = "confirmation-modal"
    const labelId = "confirm-select-menu"

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(t(`${modalLocale}.title`))

    const label = new LabelBuilder()
        .setLabel(t(`${modalLocale}.cantBeUndone`))
        .setStringSelectMenuComponent(new StringSelectMenuBuilder()
            .setCustomId(labelId)
            .setPlaceholder(t(`${modalLocale}.selectYes`))
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(t(`${modalLocale}.yes`))
                    .setValue(YES)
            )
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(t(`${modalLocale}.no`))
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


type ModalOptions = { 
    id: string, 
    title: string, 
    inputLabel: string,
    placeholder: string, 
    required: boolean, 
    minLength?: number, 
    maxLength?: number 
}



// TODO : add the possibility to pass a Zod schema as a parameter to validate the input
export async function showSingleInputModal(
    interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    { id, title, inputLabel, placeholder, required, minLength, maxLength }: ModalOptions,
    schema?: z.ZodType
): Promise<[ModalSubmitInteraction, string]> {
    const modal = new ModalBuilder()
        .setCustomId(id)
        .setTitle(title)

    const input = new TextInputBuilder()
        .setCustomId(`${id}-input`)
        .setPlaceholder(placeholder)
        .setStyle(TextInputStyle.Short)
        .setRequired(required)
    
    if (minLength) input.setMinLength(minLength)
    if (maxLength) input.setMaxLength(maxLength)

    
    const label = new LabelBuilder()
        .setLabel(inputLabel)
        .setTextInputComponent(input)

    modal.addLabelComponents(label)

    // try 
    await interaction.showModal(modal)

    const filter = (interaction: ModalSubmitInteraction) => interaction.customId === id
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })

    await modalSubmit.deferUpdate()
    // catch
    
    if (!modalSubmit.isFromMessage()) return [modalSubmit, ""] // returns err()

    const inputValue = modalSubmit.fields.getTextInputValue(`${id}-input`)

    // add schema validation
    
    return [modalSubmit, inputValue] // change to result pattern; here return ok()
}


type EditModalOptions = {
    edit: string,
    previousValue?: string,
    required?: boolean
    minLength?: number
    maxLength?: number
}

export async function showEditModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    { edit, previousValue, required, minLength, maxLength }: EditModalOptions
): Promise<[ModalSubmitInteraction, string]> {
    const modalLocale = "extendedComponents.editModal"

    const editNormalized = `${edit.toLocaleLowerCase().replaceSpaces("-")}`
    const modalId = `edit-${editNormalized}-modal`

    return showSingleInputModal(interaction, {
        id: modalId,
        title: t(`${modalLocale}.title`, { edit }),
        inputLabel: t(`${modalLocale}.new`, { edit }),
        placeholder: previousValue ?? edit,
        required: required ?? true,
        minLength: minLength ?? 0,
        maxLength: maxLength ?? 120
    })
}

