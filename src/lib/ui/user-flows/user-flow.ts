import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { ErrorLike, ok, Result } from "@/lib/error-handling.js"
import { ChatInputCommandInteraction, MessageFlags } from "discord.js"
import { UserInterfaceInteraction } from "../types/ui.js"
import { UserInterface } from "../user-interfaces/user-interfaces.js"

export abstract class UserFlow<T extends Record<string, unknown> | void = void> extends UserInterface {
    protected params: T
    constructor(parameters: T) {
        super()
        this.params = parameters
    }
    protected async prestart(_interaction: ChatInputCommandInteraction): Promise<Result<boolean, ErrorLike<"Error">>> {
        return ok(true)
    }

    protected setup(_interaction: UserInterfaceInteraction) {
        this.updateComponents()
    }

    public async start(interaction: ChatInputCommandInteraction) {
        const [error] = await this.prestart(interaction)
        if (error) return await replyErrorMessage(interaction, error.message)

        this.setup(interaction)

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        return response
    }
    
    protected abstract success(interaction: UserInterfaceInteraction): Promise<unknown>
}