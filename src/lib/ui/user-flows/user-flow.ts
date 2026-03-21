import { UserInterface, UserInterfaceInteraction } from "@/lib/ui/user-interfaces/user-interfaces.js"
import { ChatInputCommandInteraction } from "discord.js"


export abstract class UserFlow extends UserInterface {
    public abstract start(interaction: ChatInputCommandInteraction): Promise<unknown> 
    protected abstract success(interaction: UserInterfaceInteraction): Promise<unknown>
}

