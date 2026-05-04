import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { ErrorLike, ok, Result } from "@/lib/error-handling.js"
import { ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse, MessageFlags } from "discord.js"
import { UserInterfaceInteraction } from "../types/ui.js"
import { UIComponent, UserInterface } from "../user-interfaces/user-interfaces.js"
import { ExtendedButtonComponent } from "../ui-components/button.js"

export abstract class UserFlow<T extends Record<string, unknown> | void = void> extends UserInterface<T> {
    protected params: T
    constructor(parameters: T) {
        super(parameters)
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
        this.componentsByStage = this.initStageComponents(parameters)
    }

    public override async start(interaction: ChatInputCommandInteraction) {
        const response = await super.start(interaction)
        this.response = response
        return response
    }

    protected abstract initStageComponents(config: T): Array<UIComponent[]>
    protected override initComponents(config: T): UIComponent[] {
        const components = this.initStageComponents(config)[0]
        if (!components) throw new Error("No components for stage 0")
        return components
    }

    protected changeStage(stage: number | "next" | "prev") {
        this.stage = 
            stage == "next" ? this.stage + 1 : 
            stage == "prev" ? this.stage - 1 : 
            stage

        this.destroyComponentsCollectors()

        const components = this.componentsByStage[this.stage]
        if (!components) throw new Error("No components for stage " + this.stage)
        this.components = this.getComponentsMap(components)

        if (!this.response) throw new Error("No response to update") 
        this.createComponentsCollectors(this.response)

        this.updateComponents()
    }

    protected getStageSwitchButtons(onClick?: (interaction: ButtonInteraction) => void) {
        return {
            prev: new ExtendedButtonComponent({
                customId: `${this.id}+previous-page`,
                time: 120_000,
                emoji: "⬅️",
                style: ButtonStyle.Secondary,
            }, (interaction: ButtonInteraction) => {
                if (onClick) onClick(interaction)
                this.changeStage("prev")
                this.updateInteraction(interaction)
            }),
            next: new ExtendedButtonComponent({
                customId: `${this.id}+next-page`,
                time: 120_000,
                emoji: "➡️",
                style: ButtonStyle.Secondary,
            }, (interaction: ButtonInteraction) => {
                if (onClick) onClick(interaction)
                this.changeStage("next")
                this.updateInteraction(interaction)
            })
        }
    }
}