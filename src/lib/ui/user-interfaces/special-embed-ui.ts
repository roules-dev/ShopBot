import { Multiple } from "./multiple-ember-ui.js"
import { Paginated } from "./paginated-embed-ui.js"
import { EmbedUserInterface } from "./user-interfaces.js"

export const PaginatedEmbedUserInterface = Paginated(EmbedUserInterface)

export const MultipleEmbedUserInterface = Multiple(EmbedUserInterface)

export const MultiplePaginatedEmbedUserInterface = Multiple(PaginatedEmbedUserInterface)