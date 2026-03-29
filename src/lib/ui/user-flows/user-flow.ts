import { UserInterfaceInteraction } from "../types/ui.js"
import { UserInterface } from "../user-interfaces/user-interfaces.js"
import { ChatInputCommandInteraction } from "discord.js"


export abstract class UserFlow extends UserInterface {
    public abstract start(interaction: ChatInputCommandInteraction): Promise<unknown> 
    protected abstract success(interaction: UserInterfaceInteraction): Promise<unknown>
}

// TODO : rework UserFlows to get more generic
// * should have a constructor that takes the interaction
//    * the constructor is responsible for validating that the interaction has all the correct parameters and makes them available to the flow


// export abstract class UserFlow2 extends UserInterface {
//     constructor(interaction: ChatInputCommandInteraction) 
//     public abstract start(interaction: ChatInputCommandInteraction): Promise<unknown> 
//     protected abstract success(interaction: UserInterfaceInteraction): Promise<unknown>
// }