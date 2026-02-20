import { getLocale, replaceTemplates } from "@/lib/localisation.js"
import { UserInterfaceComponentBuilder } from "@/user-interfaces/user-interfaces.js"
import { ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelSelectMenuBuilder, ChannelSelectMenuInteraction, ChannelType, ChatInputCommandInteraction, ComponentEmojiResolvable, ComponentType, InteractionCallbackResponse, InteractionCollector, LabelBuilder, MessageComponentInteraction, MessageComponentType, ModalBuilder, ModalSubmitInteraction, ReadonlyCollection, RoleSelectMenuBuilder, RoleSelectMenuInteraction, Snowflake, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder, UserSelectMenuInteraction } from "discord.js"
import { subMap } from "../utils/maps.js"

type Identifiable = {
    id: string // will be branded when Zod validation is implemented
}

type Labelled = {
    name: string
}

type Emojiable = {
    emoji?: string // will be branded when Zod validation is implemented
}

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

        collector.on('collect', (interaction) => this.onCollect(interaction))
        collector.on('end', (collected) => this.onEnd(collected))
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
    componentType = ComponentType.Button
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

    onCollect(interaction: ButtonInteraction): void {
        this.callback(interaction)
    }

    onEnd(_collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}
}

const API_MAX_SELECT_MENU_OPTIONS = 25
const MAX_OPTIONS_PER_PAGE = API_MAX_SELECT_MENU_OPTIONS - 2

const SELECT_PAGE_OPTIONS = {
    previous: 'previous',
    next: 'next'
}

interface ExtendedSelectMenuOptions {
    customId: string
    placeholder: string
    time: number
}

export class ExtendedStringSelectMenuComponent<T extends Identifiable & Labelled & Emojiable> extends ExtendedComponent {
    componentType = ComponentType.StringSelect
    customId: string
    component: StringSelectMenuBuilder
    map: Map<string, T>
    placeholder: string

    update: (interaction: StringSelectMenuInteraction) => void
    callback: (interaction: StringSelectMenuInteraction, selected: T) => void
    time: number

    selectPage: number = 0
    pageCount: number = 1

    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions,
        map: Map<string, T>, update: (interaction: StringSelectMenuInteraction) => void, callback: (interaction: StringSelectMenuInteraction, selected: T) => void
    ) {
        super()
        this.customId = customId
        this.map = map
        this.placeholder = placeholder

        this.update = update
        this.callback = callback
        this.time = time

        if (map.size > API_MAX_SELECT_MENU_OPTIONS) {
            this.pageCount = Math.ceil(map.size / (MAX_OPTIONS_PER_PAGE - 2))
        }

        this.component = this.createSelectMenu(customId, placeholder, map)
    }

    onCollect(interaction: StringSelectMenuInteraction): void {
        if (!interaction.isStringSelectMenu()) return

        const selectedValue = interaction.values[0]

        if (this.pageCount > 1 && selectedValue in SELECT_PAGE_OPTIONS) {
            switch (selectedValue) {
                case SELECT_PAGE_OPTIONS.next:
                    this.selectPage = Math.min(this.selectPage + 1, this.pageCount - 1)
                    break
                case SELECT_PAGE_OPTIONS.previous:
                    this.selectPage = Math.max(this.selectPage - 1, 0)
                    break
            }

            this.component = this.createSelectMenu(this.customId, this.placeholder, this.map)
            return this.update(interaction)
        }


        const selected = this.map.get(selectedValue)
        if (selected == undefined) return

        this.callback(interaction, selected)    

    }

    onEnd(_collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}

    private createSelectMenu(id: string, placeholder: string, map: Map<string, T>): StringSelectMenuBuilder {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder(placeholder)
            .addOptions(this.getStringSelectOptions(map))
    
        return selectMenu
    }

    private getStringSelectOptions(map: Map<string, T>): StringSelectMenuOptionBuilder[] { 
        
        const pageSwitchOptions = []

        if (this.pageCount > 1) {
            
            const start = this.selectPage * MAX_OPTIONS_PER_PAGE
            map = subMap(map, start, MAX_OPTIONS_PER_PAGE)

            if (this.selectPage > 0) {
                pageSwitchOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`Previous page (${this.selectPage}/${this.pageCount})`)
                        .setValue(SELECT_PAGE_OPTIONS.previous)
                        .setEmoji("⬅️")
                )
            }
            if (this.selectPage < this.pageCount - 1) {                
                pageSwitchOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`Next page (${this.selectPage+2}/${this.pageCount})`)
                        .setValue(SELECT_PAGE_OPTIONS.next)
                        .setEmoji("➡️")
                )
            }
        }

        const options: StringSelectMenuOptionBuilder[] = []
        map.forEach((value, key) => {
            const label = value.name.removeCustomEmojis().ellipsis(100)

            const option = new StringSelectMenuOptionBuilder()
                .setLabel(label)
                .setValue(key)

            if (value.emoji != undefined && value.emoji.length > 0) {
                option.setEmoji(value.emoji)
            }

            options.push(option)
        })

        options.push(...pageSwitchOptions)
        
        return options
    }

    public updateMap(map: Map<string, T>) {
        this.map = map
        this.component.setOptions(this.getStringSelectOptions(map))
    }
}



type SelectMenuComponentTypes = ComponentType.RoleSelect | ComponentType.ChannelSelect | ComponentType.UserSelect

type SelectMenuBuilders<T extends SelectMenuComponentTypes> = 
    T extends ComponentType.RoleSelect ? RoleSelectMenuBuilder : 
    T extends ComponentType.ChannelSelect ? ChannelSelectMenuBuilder :
    T extends ComponentType.UserSelect ? UserSelectMenuBuilder : 
    never

type SelectMenuInteractions<T extends SelectMenuComponentTypes> = 
    T extends ComponentType.RoleSelect ? RoleSelectMenuInteraction : 
    T extends ComponentType.ChannelSelect ? ChannelSelectMenuInteraction :
    T extends ComponentType.UserSelect ? UserSelectMenuInteraction : 
    never

abstract class ExtendedSelectMenuComponent<T extends SelectMenuComponentTypes> extends ExtendedComponent {
    override customId: string
    override component: SelectMenuBuilders<T>

    callback: (interaction: SelectMenuInteractions<T>, selected: Snowflake) => void
    time: number

    constructor(options: ExtendedSelectMenuOptions, 
        callback: (interaction: SelectMenuInteractions<T>, selected: Snowflake) => void,
        componentBuilder: SelectMenuBuilders<T>
    ) {
        super()
        this.customId = options.customId
        this.component = componentBuilder
            .setCustomId(options.customId)
            .setPlaceholder(options.placeholder) as SelectMenuBuilders<T>
        
        this.callback = callback
        this.time = options.time

    }

    onCollect(interaction: SelectMenuInteractions<T>): void {
        const selected = interaction.values[0]
        if (selected == undefined) return

        this.callback(interaction, selected)    
    }

    onEnd(_collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}

}

interface ExtendedChannelSelectOptions extends ExtendedSelectMenuOptions {
    channelTypes?: ChannelType[]
}


export class ExtendedChannelSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.ChannelSelect> {
    override componentType = ComponentType.ChannelSelect
    
    constructor({ customId, placeholder, time, channelTypes }: ExtendedChannelSelectOptions, 
        callback: (interaction: ChannelSelectMenuInteraction, selectedChannelId: Snowflake) => void
    ) {
        super({ customId, time, placeholder}, callback, new ChannelSelectMenuBuilder())

        if (channelTypes) this.component.setChannelTypes(channelTypes)
    }
}

export class ExtendedRoleSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.RoleSelect> {
    override componentType = ComponentType.RoleSelect
    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions, 
        callback: (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake) => void
    ) {
        super({ customId, time, placeholder }, callback, new RoleSelectMenuBuilder())
    }
}


export class ExtendedUserSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.UserSelect> {
    override componentType = ComponentType.UserSelect
    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions, 
        callback: (interaction: UserSelectMenuInteraction, selectedUserId: Snowflake) => void
    ) {
        super({ customId, time, placeholder }, callback, new UserSelectMenuBuilder())
    }
}

const YES = 'yes'
const NO = 'no'

export async function showConfirmationModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction): Promise<[ModalSubmitInteraction, boolean]> {
    const strings = getLocale().extendedComponents.confirmationModal

    const modalId = 'confirmation-modal'
    const labelId = 'confirm-select-menu'

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(strings.title)

    const label = new LabelBuilder()
        .setLabel(strings.cantBeUndone)
        .setStringSelectMenuComponent(new StringSelectMenuBuilder()
            .setCustomId(labelId)
            .setPlaceholder(strings.selectYes)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(strings.yes)
                    .setValue(YES)
            )
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(strings.no)
                    .setValue(NO)
            )
        )

    modal.addLabelComponents(label)

    await interaction.showModal(modal)

    const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
    
    if (!modalSubmit.isFromMessage()) return [modalSubmit, false]
    await modalSubmit.deferUpdate()

    return [modalSubmit, modalSubmit.fields.getStringSelectValues(labelId)[0] == YES]
}

export type EditModalOptions = {
    edit: string,
    previousValue?: string,
    required?: boolean
    minLength?: number
    maxLength?: number
}

export async function showEditModal(interaction: MessageComponentInteraction | ChatInputCommandInteraction, 
    { edit, previousValue, required, minLength, maxLength }: EditModalOptions
): Promise<[ModalSubmitInteraction, string]> {
    const strings = getLocale().extendedComponents.editModal

    const editNormalized = `${edit.toLocaleLowerCase().replaceSpaces('-')}`
    const modalId = `edit-${editNormalized}-modal`

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(replaceTemplates(strings.title, { edit }))

    
    const input = new TextInputBuilder()
        .setCustomId(`${editNormalized}-input`)
        .setPlaceholder(previousValue ?? edit)
        .setStyle(TextInputStyle.Short)
        .setRequired(required ?? true)
        .setMaxLength(maxLength ?? 120)
        .setMinLength(minLength ?? 0)

    const label = new LabelBuilder()
        .setLabel(replaceTemplates(strings.new, { edit }))
        .setTextInputComponent(input)

    modal.addLabelComponents(label)

    await interaction.showModal(modal)

    const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120_000 })
    
    if (!modalSubmit.isFromMessage()) return [modalSubmit, '']
    await modalSubmit.deferUpdate()

    return [modalSubmit, modalSubmit.fields.getTextInputValue(`${editNormalized}-input`)]
}