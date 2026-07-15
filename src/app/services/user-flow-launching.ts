import { t } from "@/core/i18n/i18n.js";
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js";
import { validateCommandOptions } from "@/lib/discord/command-options-validation.js";
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js";
import { ChatInputCommandInteraction } from "discord.js";
import z from "zod";

export async function validateOptionsAndStartFlow<T extends z.ZodObject>(
    interaction: ChatInputCommandInteraction,
    schema: T,
    UserFlowClassConstructor: new (options: z.infer<T>) => UserFlow<z.infer<T>>
) {
    const [error, options] = validateCommandOptions(interaction.options, schema)
    if (error) {
        replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        return
    }

    await new UserFlowClassConstructor(options).start(interaction)  
}