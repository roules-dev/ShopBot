import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { ErrorLike, ok, Result } from "@/lib/error-handling.js"
import { ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags } from "discord.js"
import { UserInterfaceInteraction } from "../types/ui.js"
import { UIComponent, UserInterface } from "../user-interfaces/user-interfaces.js"

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
        if (error) {
            await replyErrorMessage(interaction, error.message)
            return null
        }

        this.setup(interaction)

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        return response
    }
    
    protected abstract success(interaction: UserInterfaceInteraction): Promise<unknown>
}

export abstract class StagedUserFlow<T extends Record<string, unknown> | void = void> extends UserFlow<T> {
    protected abstract stage: number
    protected componentsByStage: Array<UIComponent[]>

    private response: InteractionCallbackResponse | null = null

    constructor(parameters: T) {
        super(parameters)
        this.componentsByStage = this.initStageComponents()
    }

    public override async start(interaction: ChatInputCommandInteraction) {
        const response = await super.start(interaction)
        this.response = response
        return response
    }

    protected abstract initStageComponents(): Array<UIComponent[]>
    protected override initComponents(): UIComponent[] {
        const components = this.initStageComponents()[0]
        if (!components) throw new Error("No components for stage 0")
        return components
    }

    protected changeStage(stage: number) {
        this.stage = stage

        this.destroyComponentsCollectors()

        const components = this.componentsByStage[this.stage]
        if (!components) throw new Error("No components for stage " + this.stage)
        this.components = this.getComponentsMap(components)

        if (!this.response) throw new Error("No response to update") 
        this.createComponentsCollectors(this.response)

        this.updateComponents()
    }
}