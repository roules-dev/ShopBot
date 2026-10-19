import { RESTJSONErrorCodes } from 'discord-api-types/v10';
import { GuildMember, MessageCreateOptions, MessagePayload, User } from 'discord.js';

export async function canDM(member: User | GuildMember) {
    try {
        const dmChannel = await member.createDM()
        await dmChannel.send("")

        return true
    } catch (error){
        if (!error || typeof error !== "object" || !("code" in error)) return false

        return error.code === RESTJSONErrorCodes.CannotSendAnEmptyMessage      
    }
}

export async function sendDM(member: User | GuildMember, options: string | MessagePayload | MessageCreateOptions) {
    try {
        const dmChannel = await member.createDM()
        await dmChannel.send(options)
        return true
    } catch (error) {
        return false
    }
}