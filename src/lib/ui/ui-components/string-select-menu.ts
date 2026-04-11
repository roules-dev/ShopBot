import { Emojiable, Identifiable, Labelled, MutableOrReadonlyMap } from "@/lib/types/index.js"
import { subMap } from "@/utils/maps.js"
import { ComponentType, MessageComponentInteraction, ReadonlyCollection, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder } from "discord.js"
import { ExtendedComponent } from "./extended-components.js"


const API_MAX_SELECT_MENU_OPTIONS = 25
const MAX_OPTIONS_PER_PAGE = API_MAX_SELECT_MENU_OPTIONS - 2

const SELECT_PAGE_OPTIONS = {
    previous: "previous",
    next: "next"
}

export interface ExtendedSelectMenuOptions {
    customId: string
    placeholder: string
    time: number
}

export class ExtendedStringSelectMenuComponent<Id extends string, T extends Labelled & Emojiable> extends ExtendedComponent {
    componentType = ComponentType.StringSelect as const
    customId: string
    component: StringSelectMenuBuilder
    map: MutableOrReadonlyMap<Id, T>
    placeholder: string

    update: (interaction: StringSelectMenuInteraction) => void
    callback: (interaction: StringSelectMenuInteraction, selected: T & Identifiable<Id>) => void
    time: number

    selectPage: number = 0
    pageCount: number = 1

    constructor({ customId, placeholder, time }: ExtendedSelectMenuOptions,
        map: MutableOrReadonlyMap<Id, T>, update: (interaction: StringSelectMenuInteraction) => void, callback: (interaction: StringSelectMenuInteraction, selected: T & Identifiable<Id>) => void
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

        this.component = this.createSelectMenu(placeholder, map)
    }

    onCollect(interaction: StringSelectMenuInteraction): void {
        if (!interaction.isStringSelectMenu()) return this.update(interaction)

        const selectedValue = interaction.values[0] as Id
        if (selectedValue === undefined) return

        if (this.pageCount > 1 && selectedValue in SELECT_PAGE_OPTIONS) {
            switch (selectedValue) {
                case SELECT_PAGE_OPTIONS.next:
                    this.selectPage = Math.min(this.selectPage + 1, this.pageCount - 1)
                    break
                case SELECT_PAGE_OPTIONS.previous:
                    this.selectPage = Math.max(this.selectPage - 1, 0)
                    break
            }

            this.component = this.createSelectMenu(this.placeholder, this.map)
            return this.update(interaction)
        }


        const selected = this.map.get(selectedValue)
        if (selected == undefined) return this.update(interaction)

        this.callback(interaction, {...selected, id: selectedValue})    

    }

    onEnd(_collected: ReadonlyCollection<string, MessageComponentInteraction>): void {}

    private createSelectMenu(placeholder: string, map: MutableOrReadonlyMap<string, T>): StringSelectMenuBuilder {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(this.customId)
            .setPlaceholder(placeholder)
            .addOptions(this.getStringSelectOptions(map))
    
        return selectMenu
    }

    private getStringSelectOptions(map: MutableOrReadonlyMap<string, T>): StringSelectMenuOptionBuilder[] { 
        
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

    public updateMap(map: MutableOrReadonlyMap<Id, T>) {
        this.map = map
        this.component.setOptions(this.getStringSelectOptions(map))
    }
}
