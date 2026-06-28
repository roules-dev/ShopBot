import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { ErrorLike, ok, Result } from "@/lib/error-handling.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { ActionRowBuilder, APIEmbedField, EmbedBuilder, InteractionCallbackResponse, InteractionEditReplyOptions, MessageFlags } from "discord.js"
import { selectMenuComponents, UserInterfaceComponentBuilder, UserInterfaceInteraction } from "../types/ui.js"
import { ComponentSeparator, UpdateableComponent } from "../ui-components/extended-components.js"

export type UIComponent = UpdateableComponent | ComponentSeparator

export abstract class UserInterface<Config = void> {
    public abstract id: string
    protected components: Map<string, UIComponent>

    constructor(config: Config) {
        this.components = this.getComponentsMap(this.initComponents(config))
    }

    protected async prepare(_interaction: UserInterfaceInteraction): Promise<Result<unknown, ErrorLike>> {
        return ok(true)
    }
    
    protected abstract getMessage(): string 
    protected abstract initComponents(config: Config): UIComponent[]
    
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

            // Special cases :
            // Separators
            if (component instanceof ComponentSeparator) {
                rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>())
                return
            }

            // Pagination buttons
            if (component.comp.customId.endsWith("page")) {
                paginationRow.addComponents(component.comp.getComponent())
                return
            }
            
            const lastRow = rows.length == 0 ? undefined : rows[rows.length - 1]

            // Adding to a new row if :
            //   - there is no last row (adding first component)
            //   - last row has a select menu
            //   - last row already has 5 components
            if (
                lastRow === undefined ||
                (lastRow.components[0]?.data.type && selectMenuComponents.includes(lastRow.components[0]?.data.type)) ||
                lastRow.components.length >= 5
            ) {
                rows.push(new ActionRowBuilder<UserInterfaceComponentBuilder>().addComponents(component.comp.getComponent()))
                return
            }

            // Continue adding to last row when it's not full
            lastRow.addComponents(component.comp.getComponent())
        })

        if (paginationRow.components.length > 0) {
            rows.push(paginationRow)
        }

        const nonEmptyRows = rows.filter((row) => row.components.length > 0)

        return nonEmptyRows
    }

    protected getInteractionUpdateOptions(): InteractionEditReplyOptions {
        return { content: this.getMessage(), components: this.getComponentRows() }
    }

    protected async updateInteraction(
        interaction: UserInterfaceInteraction,
        additionalMessageContent: string | null = null,
    ) {
        this.updateComponents()

        const updateOptions = this.getInteractionUpdateOptions()
        if (additionalMessageContent) {
            updateOptions.content = `${updateOptions.content}\n\n${additionalMessageContent}`
        }

        try {
            if (interaction.deferred) {
                await interaction.editReply(updateOptions)
                return
            }

            if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) {
                await interaction.update(updateOptions)
                return
            }

            await replyErrorMessage(interaction)

        } catch (error) {
            replyErrorMessage(interaction)
            PrettyLog.error(`${error}`, true, (error instanceof Error ? error : undefined))
        }
    }

    protected getComponentsMap(components: UIComponent[]) {
        const componentsEntries: [string, UIComponent][] = components.map((component) => {
            if (component instanceof ComponentSeparator) return [component.customId, component];
            return [component.comp.customId, component]
        })
        
        return new Map(componentsEntries)
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

    protected setup(_interaction: UserInterfaceInteraction): void {
        this.updateComponents()
    }

    public async display(interaction: UserInterfaceInteraction) {
        const [error] = await this.prepare(interaction)
        if (error) {
            await replyErrorMessage(interaction, error.message)
            return null
        }

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
        await this.prepare(interaction)

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


