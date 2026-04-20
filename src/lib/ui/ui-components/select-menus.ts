import { validate } from "@/lib/validation/validation.js"
import { BrandedSnowflake, SnowflakeSchema } from "@/schemas/utils.js"
import { ChannelSelectMenuBuilder, ChannelSelectMenuInteraction, ChannelType, ComponentType, MessageComponentInteraction, ReadonlyCollection, RoleSelectMenuBuilder, RoleSelectMenuInteraction, UserSelectMenuBuilder, UserSelectMenuInteraction } from "discord.js"
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

    callback: (interaction: SelectMenuInteractions<T>, selected: BrandedSnowflake) => void
    time: number

    constructor(options: ExtendedSelectMenuOptions, 
        callback: (interaction: SelectMenuInteractions<T>, selected: BrandedSnowflake) => void,
        componentBuilder: SelectMenuBuilders<T>
    ) {
        super()
        this.customId = options.customId
        this.component = componentBuilder

        this.component
            .setCustomId(options.customId)
            .setPlaceholder(options.placeholder) 
        
        this.callback = callback
        this.time = options.time

    }

    onCollect(interaction: SelectMenuInteractions<T>) {
        const selected = interaction.values[0]
        if (selected == undefined) return

        const [error, selectedId] = validate(SnowflakeSchema, selected)
        if (error) return

        this.callback(interaction, selectedId)    
    }

    onEnd(_collected: ReadonlyCollection<string, MessageComponentInteraction>) {}

}

interface ExtendedChannelSelectOptions extends ExtendedSelectMenuOptions {
    channelTypes?: ChannelType[]
}


export class ExtendedChannelSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.ChannelSelect> {
    override componentType = ComponentType.ChannelSelect as const
    
    constructor({ customId, placeholder, time, channelTypes }: ExtendedChannelSelectOptions, 
        callback: (interaction: ChannelSelectMenuInteraction, selectedChannelId: BrandedSnowflake) => void
    ) {
        super({ customId, time, placeholder}, callback, new ChannelSelectMenuBuilder())

        if (channelTypes) this.component.setChannelTypes(channelTypes)
    }
}

export class ExtendedRoleSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.RoleSelect> {
    override componentType = ComponentType.RoleSelect as const
    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions, 
        callback: (interaction: RoleSelectMenuInteraction, selectedRoleId: BrandedSnowflake) => void
    ) {
        super({ customId, time, placeholder }, callback, new RoleSelectMenuBuilder())
    }
}


export class ExtendedUserSelectMenuComponent extends ExtendedSelectMenuComponent<ComponentType.UserSelect> {
    override componentType = ComponentType.UserSelect as const
    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions, 
        callback: (interaction: UserSelectMenuInteraction, selectedUserId: BrandedSnowflake) => void
    ) {
        super({ customId, time, placeholder }, callback, new UserSelectMenuBuilder())
    }
}