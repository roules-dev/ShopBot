import { AbstractConstructor } from "@/lib/types/abstraction.js"
import { APIEmbedField, ButtonInteraction, ButtonStyle, InteractionCallbackResponse } from "discord.js"
import { UserInterfaceInteraction } from "../types/ui.js"
import { ExtendedButtonComponent } from "../components/button.js"
import { EmbedUserInterface } from "./user-interfaces.js"

export function Paginated<TBase extends AbstractConstructor<EmbedUserInterface>>(Base: TBase) {
    abstract class Paginated extends Base {
        protected MAX_FIELDS_PER_PAGE = 9

        protected abstract page: number

        protected abstract response: InteractionCallbackResponse | null


        protected override setup(interaction: UserInterfaceInteraction): void {
            super.setup(interaction)
            this.paginationUpdate()
        }

        protected override reset(): void {
            super.reset()
            this.page = 0
        }

        public override async display(interaction: UserInterfaceInteraction) {
            const response = await super.display(interaction)
            this.response = response
            return response
        }

        protected override async updateInteraction(interaction: UserInterfaceInteraction) {
            this.paginationUpdate()
            super.updateInteraction(interaction)
        }

        protected getPaginationButtons() {
            return {
                prev: new ExtendedButtonComponent({
                    customId: `${this.id}+previous-page`,
                    time: 120_000,
                    emoji: "⬅️",
                    style: ButtonStyle.Secondary,
                }, (interaction: ButtonInteraction) => this.previousPage(interaction)),
                next: new ExtendedButtonComponent({
                    customId: `${this.id}+next-page`,
                    time: 120_000,
                    emoji: "➡️",
                    style: ButtonStyle.Secondary,
                }, (interaction: ButtonInteraction) => this.nextPage(interaction))
            }
        }

        protected getPageEmbedFields(): APIEmbedField[] {
            return this.getEmbedFields().slice(this.page * this.MAX_FIELDS_PER_PAGE, (this.page + 1) * this.MAX_FIELDS_PER_PAGE)
        }

        protected abstract getInputSize(): number

        private paginationUpdate() {
            const pageCount = this.getPageCount()

            if (this.embed) {
                if (pageCount > 1) {
                    this.embed.setFooter({ text: `Page ${this.page + 1}/${pageCount}` })
                } else {
                    this.embed.setFooter(null)
                }

                this.embed.setFields(this.getPageEmbedFields())
            }

            const paginationButtons = this.getPaginationButtons()

            if (pageCount > 1) {
                if (this.response) {
                    this.destroyComponentsCollectors()
                }
                
                paginationButtons.prev.toggle(this.page > 0)
                paginationButtons.next.toggle(this.page < pageCount - 1)

                this.components.set(paginationButtons.prev.customId, { comp: paginationButtons.prev })
                this.components.set(paginationButtons.next.customId, { comp: paginationButtons.next })

                if (this.response) {
                    this.createComponentsCollectors(this.response)
                }
            }
            else {
                if (this.response) {
                    this.destroyComponentsCollectors()
                }
                
                this.components.delete(paginationButtons.prev.customId)
                this.components.delete(paginationButtons.next.customId)

                if (this.response) {
                    this.createComponentsCollectors(this.response)
                }
            }
        }

        private previousPage(interaction: ButtonInteraction) {
            if (this.page == 0) return this.updateInteraction(interaction)

            this.page -= 1
            return this.updateInteraction(interaction)   
        }

        private nextPage(interaction: ButtonInteraction) {
            const pageCount = this.getPageCount()

            if (this.page == pageCount - 1) return this.updateInteraction(interaction)

            this.page += 1
            return this.updateInteraction(interaction)
        }

        getPageCount(): number {
            return Math.max(Math.ceil(this.getInputSize() / this.MAX_FIELDS_PER_PAGE), 1)
        }
    }
    return Paginated
}
