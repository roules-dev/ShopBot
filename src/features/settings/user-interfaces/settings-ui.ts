import { replyErrorMessage } from "@//lib/discord.js"
import { getSettings, setSetting } from "@/features/settings/database/settings-handler.js"
import { Setting } from "@/features/settings/database/settings-types.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { getLocale, replaceTemplates } from "@/lib/localisation.js"
import { ExtendedButtonComponent, ExtendedChannelSelectMenuComponent, ExtendedComponent, ExtendedRoleSelectMenuComponent, ExtendedStringSelectMenuComponent, ExtendedUserSelectMenuComponent, showEditModal } from "@/user-interfaces/extended-components.js"
import { PaginatedEmbedUserInterface, UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { toStringOrUndefined } from "@/utils/strings.js"
import { APIEmbedField, ButtonStyle, channelMention, ChannelSelectMenuInteraction, ChannelType, Colors, EmbedBuilder, InteractionCallbackResponse, MessageComponentInteraction, roleMention, RoleSelectMenuInteraction, Snowflake, StringSelectMenuInteraction, userMention, UserSelectMenuInteraction } from "discord.js"



export class SettingsInterface extends PaginatedEmbedUserInterface {
    public override id = 'settings-ui'
    protected override components: Map<string, ExtendedComponent> = new Map()
    protected override embed: EmbedBuilder | null = null

    protected response: InteractionCallbackResponse | null = null

    private selectedSetting: Setting | null = null

    protected override page = 0

    protected override readonly MAX_FIELDS_PER_PAGE = 12

    protected locale = getLocale().userInterfaces.settings

    protected override getMessage(): string {
        return ''
    }

    protected override getInputSize(): number {
        return getSettings().size
    }

    protected override initComponents(): unknown {
        const settingSelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: 'settings-select-menu', placeholder: this.locale.components.selectSetting, time: 120_000 }, 
            getSettings(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selected: Setting) => {
                this.selectedSetting = selected
                this.updateInteraction(interaction)
            }
        )

        this.components.set('settings-select-menu', settingSelectMenu)
        return
    }

    protected override updateComponents(): unknown {
        this.destroyComponentsCollectors()
        this.clearEditComponents()

        if (!this.selectedSetting) {
            if (this.response) this.createComponentsCollectors(this.response)
            return
        }

        const settingEditorComponents = this.getSettingEditorComponents(this.selectedSetting)

        for (const component of settingEditorComponents) {
            this.components.set(component.customId, component)
        }

        if (!this.response) return
        this.createComponentsCollectors(this.response)

        return
    }

    protected override initEmbeds(_interaction: UserInterfaceInteraction) {
        const settingsEmbed = new EmbedBuilder()
            .setTitle(this.locale.embeds.settings.title)
            .setDescription(this.locale.embeds.settings.description)
            .setColor(Colors.DarkButNotBlack)

        settingsEmbed.addFields(this.getPageEmbedFields())

        this.embed = settingsEmbed
    }

    protected override updateEmbeds() {
        if (!this.embed) return

        this.embed.setFields(this.getPageEmbedFields())
    }

    protected getEmbedFields(): APIEmbedField[] {
        const settings = getSettings()

        const fields: APIEmbedField[] = []

        settings.forEach(setting => {
            const { name, type, value } = setting

            if (value === undefined || value === "") {
                fields.push({ name, value: this.locale.embeds.settings.unsetSetting, inline: true })
                return
            }

            const displayValue = 
                type === 'string' ? value : 
                type === 'bool' ? (value ? '✅' : '❌') :
                type === 'number' ? `${value}` :
                type === 'enum' ? this.enumOptionDisplay(setting) :
                type === 'channelId' ? channelMention(value) :
                type === 'roleId' ? roleMention(value) :
                type === 'userId' ? userMention(value) :
                assertNeverReached(type)

            fields.push({ name, value: displayValue, inline: true })
        })

        return fields
    }

    private enumOptionDisplay(setting: Setting & { type: 'enum' }) {
        const optionsAreObjects = setting.options[0] !== undefined && typeof setting.options[0] === 'object'
        
        const displayValue = optionsAreObjects ? 
            (setting.options as { label: string, value: string }[]).find(option => option.value === setting.value)?.label : 
            setting.value

        return displayValue ?? setting.value ?? this.locale.embeds.settings.unsetSetting
    }

    private getSettingEditorComponents(setting: Setting): ExtendedComponent[] {
        const components: ExtendedComponent[] = []

        switch (setting.type) {
            case 'string': {
                const showStringEditModalButton = new ExtendedButtonComponent(
                    {
                        customId: 'edit-setting+string',
                        label: replaceTemplates(this.locale.components.defaultEditor.title, { name: setting.name }),
                        emoji: '📝',
                        style: ButtonStyle.Primary,
                        time: 120000
                    },
                    async (interaction: MessageComponentInteraction) => {
                        const [modalSubmit, newValue] = await showEditModal(interaction, { edit: setting.name, previousValue: setting.value })

                        const [error, updatedSetting] = await setSetting(setting.id, newValue)
                        if (error) return replyErrorMessage(interaction, error.message)
                        this.selectedSetting = updatedSetting
                        this.updateInteraction(modalSubmit)
                    }
                )

                components.push(showStringEditModalButton)
                break
            }
            case 'bool': {
                const [toggleOn, toggleOff] = [this.locale.components.toggleEditor.toggleOn, this.locale.components.toggleEditor.toggleOff]

                const toggleButton = new ExtendedButtonComponent(
                    {
                        customId: 'edit-setting+bool',
                        label: `${setting.value ? toggleOff : toggleOn} ${setting.name}`,
                        emoji: setting.value ? '✖️' : '✅',
                        style: setting.value ? ButtonStyle.Danger : ButtonStyle.Success,
                        time: 120_000
                    },
                    async (interaction: MessageComponentInteraction) => {
                        const [error, updatedSetting] = await setSetting(setting.id, !setting.value)
                        if (error) return replyErrorMessage(interaction, error.message)
                        this.selectedSetting = updatedSetting
                        this.updateInteraction(interaction)
                    }
                )

                components.push(toggleButton)
                break
            }
            case 'number': {
                const showNumberEditModalButton = new ExtendedButtonComponent(
                    {
                        customId: 'edit-setting+number',
                        label: replaceTemplates(this.locale.components.defaultEditor.title, { name: setting.name }),
                        emoji: '📝',
                        style: ButtonStyle.Primary,
                        time: 120_000
                    }, 
                    async (interaction: MessageComponentInteraction) => {
                        const [modalSubmit, newValue] = await showEditModal(interaction, { edit: setting.name, previousValue: toStringOrUndefined(setting.value) })

                        if (!newValue && newValue == "") return this.updateInteraction(interaction)
                        const newValueAsNumber = Number(newValue)
                        if (isNaN(newValueAsNumber)) return this.updateInteraction(interaction)
                        
                        const [error, updatedSetting] = await setSetting(setting.id, newValueAsNumber)
                        if (error) return replyErrorMessage(interaction, error.message)
                        
                        this.selectedSetting = updatedSetting
                        this.updateInteraction(modalSubmit)
                    }
                )

                components.push(showNumberEditModalButton)
                break
            }
            case 'channelId': {
                const channelSelectMenu = new ExtendedChannelSelectMenuComponent(
                    { 
                        customId: 'edit-setting+channel', 
                        placeholder: replaceTemplates(this.locale.components.selector.title, { 
                            name: setting.name, 
                            type: this.locale.components.selector.types.channel
                        }),
                        time: 120_000,
                        channelTypes: [ChannelType.GuildText]
                    }, async (interaction: ChannelSelectMenuInteraction, selectedChannelId: Snowflake) => {
                        const [error, updatedSetting] = await setSetting(setting.id, selectedChannelId)
                        if (error) return replyErrorMessage(interaction, error.message)
                        
                        this.selectedSetting = updatedSetting
                        this.updateInteraction(interaction)
                    }
                )
            
                components.push(channelSelectMenu)
                break
            }
            case 'roleId': {
                const roleSelectMenu = new ExtendedRoleSelectMenuComponent(
                    { 
                        customId: 'edit-setting+role', 
                        placeholder: replaceTemplates(this.locale.components.selector.title, { 
                            name: setting.name, 
                            type: this.locale.components.selector.types.role
                        }), 
                        time: 120_000 
                    }, async (interaction: RoleSelectMenuInteraction, selectedRoleId: Snowflake) => {
                        const [error, updatedSetting] = await setSetting(setting.id, selectedRoleId)
                        if (error) return replyErrorMessage(interaction, error.message)
                        
                        this.selectedSetting = updatedSetting
                        this.updateInteraction(interaction)
                    }
                )
            
                components.push(roleSelectMenu)
                break
            }
            case 'userId': {
                const userSelectMenu = new ExtendedUserSelectMenuComponent(
                    { 
                        customId: 'edit-setting+user', 
                        placeholder: replaceTemplates(this.locale.components.selector.title, { 
                            name: setting.name, 
                            type: this.locale.components.selector.types.user
                        }), 
                        time: 120_000 
                    }, async (interaction: UserSelectMenuInteraction, selectedUserId: Snowflake) => {
                        const [error, updatedSetting] = await setSetting(setting.id, selectedUserId)
                        if (error) return replyErrorMessage(interaction, error.message)

                        this.selectedSetting = updatedSetting
                        this.updateInteraction(interaction)
                    }
                )
            
                components.push(userSelectMenu)
                break
            }
            case 'enum': {
                const optionsAreObjects = setting.options[0] !== undefined && typeof setting.options[0] === 'object'
                const optionsMap = optionsAreObjects
                    ? new Map((setting.options as Record<string, string>[]).map(option => [option.value, {id: option.value, name: option.label}]))
                    : new Map((setting.options as string[]).map(option => [option, {id: option, name: option}]))

                const optionSelectMenu = new ExtendedStringSelectMenuComponent(
                    {
                        customId: 'edit-setting+enum',
                        placeholder: replaceTemplates(this.locale.components.selector.title, { 
                            name: setting.name, 
                            type: this.locale.components.selector.types.option
                        }),
                        time: 120_000
                    },
                    optionsMap,
                    (interaction) => this.updateInteraction(interaction),
                    async (interaction: StringSelectMenuInteraction, selectedOption: {id: string, name: string}) => {
                        const [error, updatedSetting] = await setSetting(setting.id, selectedOption.id)
                        if (error) return replyErrorMessage(interaction, error.message)

                        this.selectedSetting = updatedSetting
                        this.updateInteraction(interaction)
                    }
                )

                components.push(optionSelectMenu)
                break
            }
                
            default:
                assertNeverReached(setting)
        }

        
        const resetSettingButton = new ExtendedButtonComponent(
            {
                customId: 'edit-setting+reset-button',
                label: replaceTemplates(this.locale.components.resetButton, { name: setting.name }),
                emoji: '🗑️',
                style: ButtonStyle.Danger,
                time: 120_000
            },
            async (interaction: MessageComponentInteraction) => {
                const [error, updatedSetting] = await setSetting(setting.id, undefined)
                if (error) return replyErrorMessage(interaction, error.message)
                    
                this.selectedSetting = updatedSetting
                this.updateInteraction(interaction)
            }
        )

        const backButton = new ExtendedButtonComponent(
            {
                customId: 'edit-setting+back-button',
                label: this.locale.components.backButton,
                emoji: '⬅️',
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: MessageComponentInteraction) => {
                this.selectedSetting = null
                this.updateInteraction(interaction)
            }
        )

        components.push(resetSettingButton)
        components.push(backButton)

        return components
    }

    private clearEditComponents(): void {
        const editSettingsComponentsIds = [...this.components.keys()].filter(id => id.startsWith('edit-setting'))
        if (editSettingsComponentsIds.length === 0) return
        for (const id of editSettingsComponentsIds) {
            this.components.delete(id)
        }
    }
}