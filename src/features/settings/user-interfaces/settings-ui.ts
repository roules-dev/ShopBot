import { t } from "@/core/i18n/i18n.js"
import { replyErrorMessage } from "@/lib/discord.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent, ExtendedComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showEditModal, showValidatedEditModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedChannelSelectMenuComponent, ExtendedRoleSelectMenuComponent, ExtendedUserSelectMenuComponent } from "@/lib/ui/ui-components/select-menus.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { PaginatedEmbedUserInterface } from "@/lib/ui/user-interfaces/user-interfaces.js"
import { BrandedSnowflake } from "@/schemas/utils.js"
import { toStringOrUndefined } from "@/utils/strings.js"
import { APIEmbedField, ButtonStyle, channelMention, ChannelSelectMenuInteraction, ChannelType, Colors, EmbedBuilder, InteractionCallbackResponse, MessageComponentInteraction, roleMention, RoleSelectMenuInteraction, StringSelectMenuInteraction, userMention, UserSelectMenuInteraction } from "discord.js"
import z from "zod"
import { getSettings, setSetting } from "../database/settings.database.js"
import { Setting } from "../database/settings.types.js"


export class SettingsInterface extends PaginatedEmbedUserInterface {
    public override get id(): string { 
        return "settings-ui" 
    }
    protected override embed: EmbedBuilder | null = null

    protected response: InteractionCallbackResponse | null = null

    private selectedSetting: Setting | null = null

    protected override page = 0

    protected override readonly MAX_FIELDS_PER_PAGE = 12

    

    protected override getMessage() {
        return ""
    }

    protected override getInputSize() {
        return getSettings().size
    }

    protected override initComponents() {
        const settingSelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: "settings-select-menu", placeholder: t(`userInterfaces.settings.components.selectSetting`), time: 120_000 }, 
            getSettings(), 
            (interaction) => this.updateInteraction(interaction),
            (interaction, selected) => {
                this.selectedSetting = selected
                this.updateInteraction(interaction)
            }
        )
        
        return [
            createComponent(settingSelectMenu)
        ]
    }

    protected override onUpdateComponents() {
        this.destroyComponentsCollectors()
        this.clearEditComponents()

        if (!this.selectedSetting) {
            if (this.response) this.createComponentsCollectors(this.response)
            return
        }

        const settingEditorComponents = this.getSettingEditorComponents(this.selectedSetting)

        for (const component of settingEditorComponents) {
            this.components.set(component.customId, createComponent(component))
        }

        if (!this.response) return
        this.createComponentsCollectors(this.response)

        return
    }

    protected override initEmbeds(_interaction: UserInterfaceInteraction) {
        const settingsEmbed = new EmbedBuilder()
            .setTitle(t(`userInterfaces.settings.embeds.settings.title`))
            .setDescription(t(`userInterfaces.settings.embeds.settings.description`))
            .setColor(Colors.DarkButNotBlack)

        settingsEmbed.addFields(this.getPageEmbedFields())

        this.embed = settingsEmbed
    }

    protected override updateEmbeds() {
        if (!this.embed) return

        this.embed.setFields(this.getPageEmbedFields())
    }

    protected getEmbedFields() {
        const settings = getSettings()

        const fields: APIEmbedField[] = []

        settings.forEach(setting => {
            const { name, type, value } = setting

            if (value === null || value === "") {
                fields.push({ name, value: t(`userInterfaces.settings.embeds.settings.unsetSetting`), inline: true })
                return
            }

            const displayValue = 
                type === "string" ? value : 
                type === "bool" ? (value ? "✅" : "❌") :
                type === "number" ? `${value}` :
                type === "enum" ? this.enumOptionDisplay(setting) :
                type === "channelId" ? channelMention(value) :
                type === "roleId" ? roleMention(value) :
                type === "userId" ? userMention(value) :
                assertNeverReached(type)

            fields.push({ name, value: displayValue, inline: true })
        })

        return fields
    }

    private enumOptionDisplay(setting: Setting & { type: "enum" }) {
        const displayValue = setting.options.find(option => option.value === setting.value)?.label

        return displayValue ?? setting.value ?? t(`userInterfaces.settings.embeds.settings.unsetSetting`)
    }

    private getSettingEditorComponents(setting: Setting) {
        const components: ExtendedComponent[] = []

        switch (setting.type) {
            case "string": 
                components.push(this.getStringEditorComponent(setting))
                break
            case "bool": 
                components.push(this.getBoolEditorComponent(setting))
                break
            case "number": 
                components.push(this.getNumberEditorComponent(setting))
                break
            case "channelId": 
                components.push(this.getChannelEditorComponent(setting))
                break
            case "roleId": 
                components.push(this.getRoleEditorComponent(setting))
                break
            case "userId": 
                components.push(this.getUserEditorComponent(setting))
                break
            case "enum": 
                components.push(this.getEnumEditorComponent(setting))
                break
            default:
                assertNeverReached(setting)
        }
        
        const resetSettingButton = new ExtendedButtonComponent(
            {
                customId: "edit-setting+reset-button",
                label: t(`userInterfaces.settings.components.resetButton`, { name: setting.name }),
                emoji: "🗑️",
                style: ButtonStyle.Danger,
                time: 120_000
            },
            async (interaction: MessageComponentInteraction) => {
                const [error, updatedSetting] = await setSetting(setting.id, null)
                if (error) return replyErrorMessage(interaction, error.message)
                    
                this.selectedSetting = updatedSetting
                this.updateInteraction(interaction)
            }
        )

        const backButton = new ExtendedButtonComponent(
            {
                customId: "edit-setting+back-button",
                label: t(`userInterfaces.settings.components.backButton`),
                emoji: "⬅️",
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

    private clearEditComponents() {
        const editSettingsComponentsIds = [...this.components.keys()].filter(id => id.startsWith("edit-setting"))
        if (editSettingsComponentsIds.length === 0) return
        for (const id of editSettingsComponentsIds) {
            this.components.delete(id)
        }
    }


    private getStringEditorComponent(setting: Setting & { type: "string"}) {
        return new ExtendedButtonComponent(
            {
                customId: "edit-setting+string",
                label: t(`userInterfaces.settings.components.defaultEditor.title`, { name: setting.name }),
                emoji: "📝",
                style: ButtonStyle.Primary,
                time: 120000
            },
            async (interaction: MessageComponentInteraction) => {
                const [modalSubmit, [error1, newValue]] = await showEditModal(interaction, { edit: setting.name, previousValue: setting.value })
                if (error1) return replyErrorMessage(modalSubmit, error1.message)

                const [error2, updatedSetting] = await setSetting(setting.id, newValue)
                if (error2) return replyErrorMessage(modalSubmit, error2.message)

                this.selectedSetting = updatedSetting
                this.updateInteraction(modalSubmit)
            }
        )
    }

    private getBoolEditorComponent(setting: Setting & { type: "bool"}) {
        const [toggleOn, toggleOff] = [t(`userInterfaces.settings.components.toggleEditor.toggleOn`), t(`userInterfaces.settings.components.toggleEditor.toggleOff`)]

        return new ExtendedButtonComponent(
            {
                customId: "edit-setting+bool",
                label: `${setting.value ? toggleOff : toggleOn} ${setting.name}`,
                emoji: setting.value ? "✖️" : "✅",
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
    }

    private getNumberEditorComponent(setting: Setting & { type: "number"}) {
        return new ExtendedButtonComponent(
            {
                customId: "edit-setting+number",
                label: t(`userInterfaces.settings.components.defaultEditor.title`, { name: setting.name }),
                emoji: "📝",
                style: ButtonStyle.Primary,
                time: 120_000
            }, 
            async (interaction: MessageComponentInteraction) => {
                const [modalSubmit, [error1, newValue]] = await showValidatedEditModal(
                    interaction, 
                    { edit: setting.name, previousValue: toStringOrUndefined(setting.value) },
                    z.coerce.number()
                )
                
                if (error1) return replyErrorMessage(modalSubmit, error1.message)
                
                const [error2, updatedSetting] = await setSetting(setting.id, newValue)
                if (error2) return replyErrorMessage(modalSubmit, error2.message)
                
                this.selectedSetting = updatedSetting
                this.updateInteraction(modalSubmit)
            }
        )
    }

    private getChannelEditorComponent(setting: Setting & { type: "channelId"}) {
        return new ExtendedChannelSelectMenuComponent(
            { 
                customId: "edit-setting+channel", 
                placeholder: t(`userInterfaces.settings.components.selector.title`, { 
                    name: setting.name, 
                    type: t(`userInterfaces.settings.components.selector.types.channel`)
                }),
                time: 120_000,
                channelTypes: [ChannelType.GuildText]
            }, async (interaction: ChannelSelectMenuInteraction, selectedChannelId: BrandedSnowflake) => {
                const [error, updatedSetting] = await setSetting(setting.id, selectedChannelId)
                if (error) return replyErrorMessage(interaction, error.message)
                
                this.selectedSetting = updatedSetting
                this.updateInteraction(interaction)
            }
        )
}

    private getRoleEditorComponent(setting: Setting & { type: "roleId"}) {
        return new ExtendedRoleSelectMenuComponent(
            { 
                customId: "edit-setting+role", 
                placeholder: t(`userInterfaces.settings.components.selector.title`, { 
                    name: setting.name, 
                    type: t(`userInterfaces.settings.components.selector.types.role`)
                }), 
                time: 120_000 
            }, async (interaction: RoleSelectMenuInteraction, selectedRoleId: BrandedSnowflake) => {
                const [error, updatedSetting] = await setSetting(setting.id, selectedRoleId)
                if (error) return replyErrorMessage(interaction, error.message)
                
                this.selectedSetting = updatedSetting
                this.updateInteraction(interaction)
            }
        )
    }

    private getUserEditorComponent(setting: Setting & { type: "userId"}) {
        return new ExtendedUserSelectMenuComponent(
            { 
                customId: "edit-setting+user", 
                placeholder: t(`userInterfaces.settings.components.selector.title`, { 
                    name: setting.name, 
                    type: t(`userInterfaces.settings.components.selector.types.user`)
                }), 
                time: 120_000 
            }, async (interaction: UserSelectMenuInteraction, selectedUserId: BrandedSnowflake) => {
                const [error, updatedSetting] = await setSetting(setting.id, selectedUserId)
                if (error) return replyErrorMessage(interaction, error.message)

                this.selectedSetting = updatedSetting
                this.updateInteraction(interaction)
            }
        )
    }

    private getEnumEditorComponent(setting: Setting & { type: "enum"}) {
        const optionsMap = new Map((setting.options).map(
            option => [
                option.value, {
                    id: option.value, 
                    name: option.label
                }
            ])
        )

        const optionSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: "edit-setting+enum",
                placeholder: t(`userInterfaces.settings.components.selector.title`, { 
                    name: setting.name, 
                    type:t(`userInterfaces.settings.components.selector.types.option`)
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

        return optionSelectMenu
    }

}