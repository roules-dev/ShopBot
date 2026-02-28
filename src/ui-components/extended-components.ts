import { UserInterfaceComponentBuilder } from "@/user-interfaces/user-interfaces.js"
import { ButtonInteraction, ComponentType, InteractionCallbackResponse, InteractionCollector, MessageComponentInteraction, MessageComponentType, ReadonlyCollection, StringSelectMenuInteraction } from "discord.js"

export abstract class ExtendedComponent {
    abstract componentType: ComponentType
    abstract customId: string
    protected abstract component: UserInterfaceComponentBuilder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected abstract callback: (...args: any[]) => void
    abstract time: number

    protected collector: InteractionCollector<ButtonInteraction | StringSelectMenuInteraction> | null = null

    protected abstract onCollect(interaction: MessageComponentInteraction): void
    protected abstract onEnd(collected: ReadonlyCollection<string, MessageComponentInteraction>): void

    public createCollector(response: InteractionCallbackResponse) {
        const filter = (interaction: MessageComponentInteraction) => interaction.customId === this.customId
        const collector = response.resource?.message?.createMessageComponentCollector({ componentType: this.componentType as MessageComponentType, time: this.time, filter })

        this.collector = collector as InteractionCollector<ButtonInteraction | StringSelectMenuInteraction>

        if (collector == undefined) return

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