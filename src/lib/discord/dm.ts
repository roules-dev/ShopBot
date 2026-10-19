import { GuildMember, MessageCreateOptions, MessagePayload } from "discord.js";
import { RESTJSONErrorCodes } from 'discord-api-types/v10';

export async function canDM(member: GuildMember) {
    try {
        const dmChannel = await member.createDM()
        await dmChannel.send("")

        return true
    } catch (error){
        if (!error || typeof error !== "object" || !("code" in error)) return false

        return error.code === RESTJSONErrorCodes.CannotSendAnEmptyMessage      
    }
}

export async function sendDM(member: GuildMember, options: string | MessagePayload | MessageCreateOptions) {
    try {
        const dmChannel = await member.createDM()
        await dmChannel.send(options)
        return true
    } catch (error) {
        return false
    }
}