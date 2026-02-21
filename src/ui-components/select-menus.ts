import { ComponentType, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, UserSelectMenuBuilder, RoleSelectMenuInteraction, ChannelSelectMenuInteraction, UserSelectMenuInteraction, Snowflake, ReadonlyCollection, MessageComponentInteraction, ChannelType } from "discord.js"
import { ExtendedComponent } from "./extended-components.js"
import { ExtendedSelectMenuOptions } from "./string-select-menu.js"




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