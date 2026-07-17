import { AbstractConstructor } from "@/lib/types/abstraction.js"
import { ObjectValues } from "@/lib/types/collections.js"
import { EmbedBuilder } from "discord.js"
import { UserInterfaceInteraction } from "../types/ui.js"
import { EmbedUserInterface } from "./user-interfaces.js"

export function Multiple<TBase extends AbstractConstructor<EmbedUserInterface>>(Base: TBase) {
    abstract class Multiple extends Base {
        protected abstract readonly modes: {
            [key: string]: string
        }
        
        protected abstract mode: ObjectValues<typeof this.modes>

        protected abstract embedByMode: Map<ObjectValues<typeof this.modes>, EmbedBuilder>

        protected changeDisplayMode(interaction: UserInterfaceInteraction, newMode: ObjectValues<typeof this.modes>): void {
            this.mode = newMode
            this.reset()
        
            if (!this.embedByMode.has(this.mode)) throw new Error(`No embed for mode ${this.mode}`)
            this.embed = this.embedByMode.get(this.mode)!

            this.embed.setFields(this.getEmbedFields())

            this.updateEmbeds()
            this.updateComponents()

            this.updateInteraction(interaction)
        }

        protected override setup(interaction: UserInterfaceInteraction): void {
            super.setup(interaction)
            if (!this.mode) {
                const firstModeKey = Object.keys(this.modes)[0]
                if (firstModeKey === undefined || this.modes[firstModeKey] === undefined) throw new Error("Incorrect Multiple UI class setup: no modes were specified")

                this.mode = this.modes[firstModeKey]
            }
        }

    }

    return Multiple
}
