import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { ErrorLike, ok, Result } from "@/lib/error-handling.js"
import { ChatInputCommandInteraction, MessageFlags } from "discord.js"
import { UserInterfaceInteraction } from "../types/ui.js"
import { UserInterface } from "../user-interfaces/user-interfaces.js"


export abstract class UserFlow extends UserInterface {
    public abstract start(interaction: ChatInputCommandInteraction): Promise<unknown> 
    protected abstract success(interaction: UserInterfaceInteraction): Promise<unknown>
}

// TODO : rework UserFlows to get more generic
// * should have a constructor that takes the interaction
//    * the constructor is responsible for validating that the interaction has all the correct parameters and makes them available to the flow
// * should hide some of the work that is done in the start method of current flows (call init and update components, create collectors, etc) (same way as for message UI)

export abstract class UserFlow2<T extends Record<string, unknown>> extends UserInterface {
    protected parameters: T
    constructor(parameters: T) {
        super()
        this.parameters = parameters
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