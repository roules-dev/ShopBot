import { t } from "@/core/i18n/i18n.js"
import { err, ErrorLike, ok, Result } from "@/lib/error-handling.js"
import { validate } from "@/lib/validation/validation.js"
import { ChatInputCommandInteraction, DiscordjsError, DiscordjsErrorCodes, LabelBuilder, MessageComponentInteraction, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import z from "zod"

const YES = "yes"
const NO = "no"

//TODO  No error handling here ?
export async function showConfirmationModal(
    interaction: MessageComponentInteraction | ChatInputCommandInteraction
): Promise<[ModalSubmitInteraction, boolean]> {
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


export async function showSingleInputModal(
    interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    { id, title, inputLabel, placeholder, required, minLength, maxLength }: ModalOptions
): Promise<[
    ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, 
    Result<string, ErrorLike<"Error"> | ErrorLike<"ModalTimeout">>
]> {
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

    try {
        await interaction.showModal(modal)

        const filter = (interaction: ModalSubmitInteraction) => interaction.customId === datedId
        const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 30_000 }) // TODO change back to 120_000

        await modalSubmit.deferUpdate()
        if (!modalSubmit.isFromMessage()) return [modalSubmit, err("Modal is not from message")] 

        const inputValue = modalSubmit.fields.getTextInputValue(INPUT_ID)
        
        return [modalSubmit, ok(inputValue)]
    }
    catch (e) {
        if (e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError) {
            return [interaction, err({ name: "ModalTimeout", message: "Modal timed out" })]
        }
        return [interaction, err(`Unknown error while showing modal ${datedId}: ${e}`)]
    }
}

export async function showValidatedSingleInputModal<T>(    
    interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    options: ModalOptions,
    schema: z.ZodType<T>
): Promise<[
    ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, 
    Result<T, z.ZodError | ErrorLike<"Error"> | ErrorLike<"ModalTimeout">>
]> {
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
): Promise<[
    ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, 
    Result<string, ErrorLike<"Error"> | ErrorLike<"ModalTimeout">>
]> {
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
): Promise<[
    ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, 
    Result<z.output<T>, z.ZodError | ErrorLike<"Error"> | ErrorLike<"ModalTimeout">>
]>  {
    const [modalSubmit, [error, inputValue]] = await showEditModal(interaction, options)
    if (error) return [modalSubmit, err(error)]

    return [modalSubmit, validate(schema, inputValue)]
}