import { AbstractConstructor } from "@/lib/types/abstraction.js";
import { ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, InteractionCallbackResponse } from "discord.js";
import { ExtendedButtonComponent } from "../components/button.js";
import { UIComponent, UserInterface } from "./user-interfaces.js";

export function Staged<T extends Record<string, unknown>, TBase extends AbstractConstructor<UserInterface<T>>>(Base: TBase) {
    abstract class StagedUI extends Base {
        protected abstract stage: number
        protected componentsByStage: Array<UIComponent[]> = this.initStageComponents(this.params)
    
        private response: InteractionCallbackResponse | null = null
    
        public override async display(interaction: ChatInputCommandInteraction) {
            const response = await super.display(interaction)
            this.response = response
            return response
        }
    
        protected abstract initStageComponents(config: T): Array<UIComponent[]>
        protected override initComponents(config: T): UIComponent[] {
            const components = this.initStageComponents(config)[0]
            if (!components) throw new Error("No components for stage 0")
            return components
        }
    
        protected changeStage(stage: number | "next" | "prev") {
            this.stage = 
                stage == "next" ? this.stage + 1 : 
                stage == "prev" ? this.stage - 1 : 
                stage
    
            this.destroyComponentsCollectors()
    
            const components = this.componentsByStage[this.stage]
            if (!components) throw new Error("No components for stage " + this.stage)
            this.components = this.getComponentsMap(components)
    
            if (!this.response) throw new Error("No response to update") 
            this.createComponentsCollectors(this.response)
    
            this.updateComponents()
        }
    
        protected getStageSwitchButtons(onClick?: (interaction: ButtonInteraction) => void) {
            return {
                prev: new ExtendedButtonComponent({
                    customId: `${this.id}+previous-page`,
                    time: 120_000,
                    emoji: "⬅️",
                    style: ButtonStyle.Secondary,
                }, (interaction: ButtonInteraction) => {
                    if (onClick) onClick(interaction)
                    this.changeStage("prev")
                    this.updateInteraction(interaction)
                }),
                next: new ExtendedButtonComponent({
                    customId: `${this.id}+next-page`,
                    time: 120_000,
                    emoji: "➡️",
                    style: ButtonStyle.Secondary,
                }, (interaction: ButtonInteraction) => {
                    if (onClick) onClick(interaction)
                    this.changeStage("next")
                    this.updateInteraction(interaction)
                })
            }
        }
    }

    return StagedUI
}