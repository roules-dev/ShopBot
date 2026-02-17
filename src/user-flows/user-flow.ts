import { ChatInputCommandInteraction } from "discord.js"
import { UserInterface, UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"


export abstract class UserFlow extends UserInterface {
    public abstract start(interaction: ChatInputCommandInteraction): Promise<unknown> 
    protected abstract success(interaction: UserInterfaceInteraction): Promise<unknown>
}

