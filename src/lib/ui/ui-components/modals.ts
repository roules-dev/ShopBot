import { t } from "@/core/i18n/i18n.js"
import { err, ErrorLike, ok, Result } from "@/lib/error-handling.js"
import { validate } from "@/lib/validation/validation.js"
import { ChatInputCommandInteraction, CheckboxGroupBuilder, CheckboxGroupOptionBuilder, DiscordjsError, DiscordjsErrorCodes, LabelBuilder, MessageComponentInteraction, ModalBuilder, ModalSubmitFields, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js"
import z from "zod"

type ModalResponse<T, E extends Error = never> = Promise<[
    ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, 
    Result<T, ErrorLike<"Error"> | ErrorLike<"ModalTimeout"> | E>
]>

export async function showModal(
    interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    modal: ModalBuilder
): ModalResponse<ModalSubmitFields> {
    const modalId = modal.toJSON().custom_id
    try {
        await interaction.showModal(modal)

        const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
        const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })

        await modalSubmit.deferUpdate()

        return [modalSubmit, ok(modalSubmit.fields)]
    }
    catch (e) {
        if (e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError) {
            return [interaction, err({ name: "ModalTimeout", message: "Modal timed out" })]
        }
        return [interaction, err(`Unknown error while showing modal ${modalId}: ${e}`)]
    }
}


export async function showConfirmationModal(
    interaction: MessageComponentInteraction | ChatInputCommandInteraction
): Promise<[ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, boolean]> {
    const modalLocale = "extendedComponents.confirmationModal"

    const modalId = "confirmation-modal"
    const checkboxGrpId = "confirm-checkbox-grp"
    
    const CONFIRMED = "_confirmed"

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(t(`${modalLocale}.title`))

    const checkboxLabel = new LabelBuilder()
        .setLabel(t(`${modalLocale}.cantBeUndone`))
        .setCheckboxGroupComponent(
            new CheckboxGroupBuilder()
                .setCustomId(checkboxGrpId)
                .addOptions(
                    new CheckboxGroupOptionBuilder()
                        .setLabel("I confirm") // TODO : translation
                        .setValue(CONFIRMED)
                )
        )

    

    modal.addLabelComponents(checkboxLabel)

    const [modalSubmit, [error, fields]] = await showModal(interaction, modal)
    if (error) return [modalSubmit, false]
    
    const field = fields.getField(checkboxGrpId)
    if (!("values" in field)) return [modalSubmit, false]

    return [modalSubmit, field.values[0] === CONFIRMED]
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


export async function showSingleInputModal(
    interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    { id, title, inputLabel, placeholder, required, minLength, maxLength }: ModalOptions
): ModalResponse<string> {
    const datedId = `id.${Date.now().toString()}`
    const modal = new ModalBuilder()
        .setCustomId(datedId)
        .setTitle(title)

    const INPUT_ID = `${id}-input`

    const input = new TextInputBuilder()
        .setCustomId(INPUT_ID)
        .setPlaceholder(placeholder)
        .setStyle(TextInputStyle.Short)
        .setRequired(required)
    
    if (minLength) input.setMinLength(minLength)
    if (maxLength) input.setMaxLength(maxLength)

    
    const label = new LabelBuilder()
        .setLabel(inputLabel)
        .setTextInputComponent(input)

    modal.addLabelComponents(label)

    const [modalSubmit, [error, fields]] = await showModal(interaction, modal)
    if (error) return [modalSubmit, err(error)]

    const inputValue = fields.getTextInputValue(INPUT_ID)
        
    return [modalSubmit, ok(inputValue)]
}

export async function showValidatedSingleInputModal<T>(    
    interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    options: ModalOptions,
    schema: z.ZodType<T>
): ModalResponse<T, z.ZodError> {
    const [modalSubmit, [error, inputValue]] = await showSingleInputModal(interaction, options)
    if (error) return [modalSubmit, err(error)]

    return [modalSubmit, validate(schema, inputValue)]
}


type EditModalOptions = {
    edit: string,
    previousValue?: string | undefined | null,
    required?: boolean | undefined | null
    minLength?: number
    maxLength?: number
}

export async function showEditModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    { edit, previousValue, required, minLength, maxLength }: EditModalOptions
): ModalResponse<string> {
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

export async function showValidatedEditModal<T extends z.ZodType>(    
    interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    options: EditModalOptions,
    schema: T
): ModalResponse<z.output<T>, z.ZodError> {
    const [modalSubmit, [error, inputValue]] = await showEditModal(interaction, options)
    if (error) return [modalSubmit, err(error)]

    return [modalSubmit, validate(schema, inputValue)]
}