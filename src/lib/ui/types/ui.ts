import { StringSelectMenuInteraction, UserSelectMenuInteraction, RoleSelectMenuInteraction, MentionableSelectMenuInteraction, ChannelSelectMenuInteraction, ButtonInteraction, ButtonBuilder, StringSelectMenuBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, UserSelectMenuBuilder, ChatInputCommandInteraction, MessageComponentInteraction, ModalSubmitInteraction, ComponentType } from "discord.js"

export type UserInterfaceComponentInteraction = StringSelectMenuInteraction | UserSelectMenuInteraction | RoleSelectMenuInteraction | MentionableSelectMenuInteraction | ChannelSelectMenuInteraction | ButtonInteraction
export type UserInterfaceComponentBuilder = ButtonBuilder | StringSelectMenuBuilder | RoleSelectMenuBuilder | ChannelSelectMenuBuilder | UserSelectMenuBuilder

export type UserInterfaceInteraction = ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction

export const selectMenuComponents = [ComponentType.MentionableSelect, ComponentType.StringSelect, ComponentType.RoleSelect, ComponentType.UserSelect, ComponentType.ChannelSelect]
