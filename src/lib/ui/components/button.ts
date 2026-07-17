import { ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentEmojiResolvable, ComponentType, MessageComponentInteraction, ReadonlyCollection } from "discord.js"
import { ExtendedComponent } from "./extended-components.js"



type ExtendButtonOptions = {
    customId: string
    time: number
    style: ButtonStyle
    disabled?: boolean
} & ({
    label: string
    emoji?: ComponentEmojiResolvable
} | {
    label?: string
    emoji: ComponentEmojiResolvable
})


export class ExtendedButtonComponent extends ExtendedComponent {
    componentType = ComponentType.Button as const
    customId: string
    component: ButtonBuilder
    callback: (interaction: ButtonInteraction) => void
    time: number

    constructor({ customId, time, label, emoji, style, disabled }: ExtendButtonOptions, callback: (interaction: ButtonInteraction) => void) {
        super()
        this.customId = customId
        this.component = new ButtonBuilder()
            .setStyle(style)
            .setDisabled(disabled ?? false)
            .setCustomId(customId)

        if (label) this.component.setLabel(label)
        if (emoji) this.component.setEmoji(emoji)

        this.callback = callback
        this.time = time
    }   

    onCollect(interaction: ButtonInteraction) {
        this.callback(interaction)
    }

    onEnd(_collected: ReadonlyCollection<string, MessageComponentInteraction>) {}
}