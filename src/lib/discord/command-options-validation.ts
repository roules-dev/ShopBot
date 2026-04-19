import { CommandInteractionOptionResolver } from "discord.js"
import z from "zod"
import { validate } from "../validation.js"

type InteractionOptions = Omit<CommandInteractionOptionResolver, "getMessage" | "getFocused">

function getOptionsData(interactionOptions: InteractionOptions) {
    const subCommandGroup = interactionOptions.getSubcommandGroup()

    let optionsData = interactionOptions.data

    if (subCommandGroup) {
        const subCommandGroupOptions = optionsData.find((option) => option.name === subCommandGroup)?.options

        if (subCommandGroupOptions === undefined) {
            throw new Error(`Unexpected Error: SubcommandGroup ${subCommandGroup} not found`) // this should never happen
        }

        optionsData = subCommandGroupOptions
    }
    const subCommand = interactionOptions.getSubcommand(false)
    if (subCommandGroup && !subCommand) {
        throw new Error(`Unexpected Error: SubcommandGroup ${subCommandGroup} has no subcommand`)
    }

    if (subCommand) {
        const subCommandOptions = optionsData.find((option) => option.name === subCommand)?.options
        if (subCommandOptions === undefined) {
            throw new Error(`Unexpected Error: Subcommand ${subCommand} not found`) // this should never happen
        }

        optionsData = subCommandOptions
    }

    return optionsData
}

function buildOptionsObject(interactionOptions: InteractionOptions) {
    const optionsData = getOptionsData(interactionOptions)

    return Object.fromEntries(optionsData.map((option) => [option.name, option.value]))
}

export function validateCommandOptions<
    T extends z.ZodObject
>(
    interactionOptions: InteractionOptions, 
    optionsSchema: T
) {
    const options = buildOptionsObject(interactionOptions)
    return validate(optionsSchema, options)
}