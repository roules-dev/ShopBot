import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { assertNeverReached } from "@/lib/error-handling.js"
import { getLocale, errorMessages, replaceTemplates, defaultComponents } from "@/lib/localisation.js"
import { ExtendedButtonComponent } from "@/ui-components/button.js"
import { ExtendedComponent } from "@/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { EMOJI_REGEX } from "@/utils/constants.js"
import { ChatInputCommandInteraction, MessageFlags, bold, StringSelectMenuInteraction, ButtonStyle, ButtonInteraction } from "discord.js"
import { getCurrencies, getCurrencyName, updateCurrency } from "../database/currencies-database.js"
import { Currency } from "../database/currencies-types.js"











export enum EditCurrencyOption {
    NAME = 'name',
    EMOJI = 'emoji'
}

export class EditCurrencyFlow extends UserFlow {
    id = 'currency-edit'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedCurrency: Currency | null = null
    private updateOption: EditCurrencyOption | null = null
    private updateOptionValue: string | null = null

    protected locale = getLocale().userFlows.currencyEdit

    async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const currencies = getCurrencies()
        if (currencies.size == 0) return replyErrorMessage(interaction, errorMessages().noCurrencies)    

        const subcommand = interaction.options.getSubcommand()
        if (!subcommand || !Object.values(EditCurrencyOption).includes(subcommand as EditCurrencyOption)) return replyErrorMessage(interaction, errorMessages().invalidSubcommand)
        this.updateOption = subcommand as EditCurrencyOption

        this.updateOptionValue = this.getUpdateValue(interaction, this.updateOption)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        const message = replaceTemplates(this.locale.messages.default, {
            currency: bold(getCurrencyName(this.selectedCurrency?.id) || defaultComponents().selectCurrency),
            option: bold(this.getUpdateOptionName(this.updateOption!)),
            value: bold(this.updateOptionValue!)
        })

        return message
    }

    protected override initComponents(): void {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent<Currency>(
            { customId: `${this.id}+select-currency`, placeholder: defaultComponents().selectCurrency, time: 120_000 },
            getCurrencies(),
            (interaction) => this.updateInteraction(interaction),
            (interaction: StringSelectMenuInteraction, selectedCurrency: Currency): void => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )
    
        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: this.locale.components.submitButton,
                emoji: {name: '✅'},
                style: ButtonStyle.Success,
                disabled: this.selectedCurrency == null,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.success(interaction),
        )

        this.components.set(currencySelectMenu.customId, currencySelectMenu)
        this.components.set(submitButton.customId, submitButton)
        
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedCurrency != null)
    }

    protected override async success(interaction: UserInterfaceInteraction): Promise<unknown> {
        if (!this.selectedCurrency) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        if (!this.updateOption || this.updateOptionValue == undefined) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        
        const oldName = getCurrencyName(this.selectedCurrency.id) || ''

        const [error, _] = await updateCurrency(this.selectedCurrency.id, { [this.updateOption.toString()]: this.updateOptionValue } )

        if (error) return updateAsErrorMessage(interaction, error.message)

        const message = replaceTemplates(this.locale.messages.success, {
            currency: bold(oldName),
            option: bold(this.getUpdateOptionName(this.updateOption)),
            value: bold(this.updateOptionValue)
        })

        return await updateAsSuccessMessage(interaction, message)
    }

    private getUpdateOptionName(option: EditCurrencyOption): string {
        return this.locale.editOptions[option] ?? option
    }

    private getUpdateValue(interaction: ChatInputCommandInteraction, option: EditCurrencyOption): string {
        switch (option) {
            case EditCurrencyOption.NAME:
                return interaction.options.getString(`new-${option}`)?.replaceSpaces() || ''
            case EditCurrencyOption.EMOJI: {
                const emojiOption = interaction.options.getString(`new-${option}`)
                return emojiOption?.match(EMOJI_REGEX)?.[0] || ''
            }
            default:
                assertNeverReached(option)
        }
    }
}