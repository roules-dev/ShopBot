import { InteractionCallbackResponse, InteractionCollector, MessageComponentInteraction, MessageComponentType, ReadonlyCollection } from "discord.js"
import { UserInterfaceComponentBuilder, UserInterfaceComponentInteraction } from "../types/ui.js"


export abstract class ExtendedComponent {
    abstract componentType: MessageComponentType
    abstract customId: string
    protected abstract component: UserInterfaceComponentBuilder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected abstract callback: (...args: any[]) => void
    abstract time: number

    protected collector: InteractionCollector<UserInterfaceComponentInteraction> | null = null

    protected abstract onCollect(interaction: MessageComponentInteraction): void
    protected abstract onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void

    public createCollector(response: InteractionCallbackResponse) {
        const filter = (interaction: MessageComponentInteraction) => interaction.customId === this.customId
        const collector = response.resource?.message?.createMessageComponentCollector({ componentType: this.componentType, time: this.time, filter })

        if (collector == undefined) return

        this.collector = collector 

        collector.on("collect", (interaction) => this.onCollect(interaction))
        collector.on("end", (collected) => this.onEnd(collected))
    }

    public destroyCollector() {
        if (this.collector == null) return

        this.collector.stop()
        this.collector = null
    }

    getComponent(): UserInterfaceComponentBuilder {
        return this.component
    }

    toggle(enabled?: boolean) {
        if (enabled == undefined) enabled = !this.component.data.disabled
        this.component.setDisabled(!enabled)
    }
} 

export class ComponentSeparator {}