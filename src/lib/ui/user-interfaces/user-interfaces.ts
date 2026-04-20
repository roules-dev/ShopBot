import { replyErrorMessage, updateAsErrorMessage } from "@/lib/discord/answer-interactions.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { ActionRowBuilder, APIEmbedField, ComponentType, EmbedBuilder, InteractionCallbackResponse, InteractionEditReplyOptions, MessageFlags } from "discord.js"
import { selectMenuComponents, UserInterfaceComponentBuilder, UserInterfaceInteraction } from "../types/ui.js"
import { ComponentSeparator, UpdateableComponent } from "../ui-components/extended-components.js"

export type UIComponent = UpdateableComponent | ComponentSeparator

export abstract class UserInterface {
    public abstract id: string
    protected components: Map<string, UIComponent>

    constructor() {
        const componentsEntries: [string, UIComponent][] = this.initComponents().map((component) => {
            if (component instanceof ComponentSeparator) return [component.customId, component];
            return [component.comp.customId, component]
        })
        
        this.components = new Map(componentsEntries)
    }

    protected abstract getMessage(): string 
    protected abstract initComponents(): UIComponent[]
    
    protected updateComponents(): void {
        this.components.forEach((component) => {
            if (component instanceof ComponentSeparator) return
            component.update?.()
        })

        this.onUpdateComponents()
    }

    protected onUpdateComponents(): void {}

    protected getComponentRows(): ActionRowBuilder<UserInterfaceComponentBuilder>[] {
        const rows: ActionRowBuilder<UserInterfaceComponentBuilder>[] = []
        const paginationRow = new ActionRowBuilder<UserInterfaceComponentBuilder>()

        this.components.forEach((component) => {
            if (component instanceof ComponentSeparator) {
                rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>())
                return
            }

            if (component.comp.customId.endsWith("page")) {
                paginationRow.addComponents(component.comp.getComponent())
            }
            else if (component.comp.componentType == ComponentType.Button) {
                if (rows.length == 0) {
                    rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.comp.getComponent()))
                }
                else {
                    const lastRow = rows[rows.length - 1]
                    if (lastRow === undefined) return 
                    const lastRowFirstComponentType = lastRow.components[0]?.data.type
        
                    if (lastRowFirstComponentType && selectMenuComponents.includes(lastRowFirstComponentType)) {
                        rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.comp.getComponent()))
                    } else {
                        lastRow.addComponents(component.comp.getComponent())
                    }
                }
            }
            else if (selectMenuComponents.includes(component.comp.componentType)) {
                rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.comp.getComponent()))
            }
        })

        if (paginationRow.components.length > 0) {
            rows.push(paginationRow)
        }

        return rows
    }

    protected getInteractionUpdateOptions(): InteractionEditReplyOptions {
        return { content: this.getMessage(), components: this.getComponentRows() }
    }

    protected async updateInteraction(interaction: UserInterfaceInteraction) {
        this.updateComponents()

        if (interaction.deferred) {
            await interaction.editReply(this.getInteractionUpdateOptions())
            return
        }

        try {
            if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) {
                interaction.update(this.getInteractionUpdateOptions())
                return
            }
            interaction.editReply(this.getInteractionUpdateOptions())
        } catch (error) {
            if (interaction.replied) {
                updateAsErrorMessage(interaction)
            }
            else {
                replyErrorMessage(interaction)
            }
            PrettyLog.error(`${error}`)
        }
    }

    protected createComponentsCollectors(response: InteractionCallbackResponse): void {
        this.components.forEach((component) => {
            if (component instanceof ComponentSeparator) return
            component.comp.createCollector(response)
        })
    }

    protected destroyComponentsCollectors(): void {
        this.components.forEach((component) => {
            if (component instanceof ComponentSeparator) return
            component.comp.destroyCollector()
        })
    }

    protected disableComponents(): void {
        this.components.forEach((component) => {
            if (component instanceof ComponentSeparator) return
            component.comp.toggle(false)
        })
    }
}

export abstract class MessageUserInterface extends UserInterface {
    protected async predisplay(_interaction: UserInterfaceInteraction): Promise<boolean> {
        return true
    }

    protected setup(_interaction: UserInterfaceInteraction): void {
        this.updateComponents()
    }

    public async display(interaction: UserInterfaceInteraction) {
        const success = await this.predisplay(interaction)
        if (!success) return await replyErrorMessage(interaction)

        this.setup(interaction)

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        return response
    }
}

//* do the same thing as for components but for embeds where they get intialized in the constructor ?
export abstract class EmbedUserInterface extends MessageUserInterface {
    protected abstract embed: EmbedBuilder | null

    protected override setup(interaction: UserInterfaceInteraction): void {
        this.initEmbeds(interaction)

        this.updateComponents()
        this.updateEmbeds()
    }

    protected reset() {}

    public override async display(interaction: UserInterfaceInteraction) {
        await this.predisplay(interaction)

        this.setup(interaction)

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), embeds: this.getEmbeds(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)

        return response
    }

    protected override getInteractionUpdateOptions(): InteractionEditReplyOptions {
        return { content: this.getMessage(), components: this.getComponentRows(), embeds: this.getEmbeds() }
    }

    protected override async updateInteraction(interaction: UserInterfaceInteraction) {
        this.updateEmbeds()
        super.updateInteraction(interaction)
    }

    protected getEmbeds(): EmbedBuilder[] {
        return this.embed ? [this.embed] : []
    }

    protected abstract getEmbedFields(): APIEmbedField[] 

    protected abstract initEmbeds(interaction: UserInterfaceInteraction): void
    protected abstract updateEmbeds(): void
}


