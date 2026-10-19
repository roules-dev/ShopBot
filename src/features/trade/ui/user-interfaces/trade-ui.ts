import { t } from "@/core/i18n/i18n.js";
import { getCurrencies } from "@/core/services/currencies/currencies.services.js";
import { getItems } from "@/core/services/items/items.services.js";
import { createTrade } from "@/core/services/trades/trades.services.js";
import { MAX_PRICE_LENGTH } from "@/features/currencies/services/price.js";
import { canDM, sendDM } from "@/lib/discord/dm.js";
import { err, ok } from "@/lib/error-handling.js";
import { ExtendedButtonComponent } from "@/lib/ui/components/button.js";
import { createComponent } from "@/lib/ui/components/extended-components.js";
import { getSelectionBuilder } from "@/lib/ui/components/selection-builder.js";
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js";
import { Staged } from "@/lib/ui/user-interfaces/staged-ui.js";
import { UIComponent, UserInterface, WithEmbeds } from "@/lib/ui/user-interfaces/user-interfaces.js";
import { ActionRowBuilder, APIEmbedField, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, GuildMember, MessageComponentInteraction } from "discord.js";
import { tradePayloadSchema } from "../../schemas/trade.schema.js";
import { Trade } from "../../types/trade.types.js";
import { getTradeEmbed, getTradeEmbedFields } from "../embeds/trade.embed.js";

type TradeUserInterfaceConfig = {
    tradePartnerMember: GuildMember
}

// TODO Locales missing

export class TradeUserInterface<Config extends TradeUserInterfaceConfig> extends WithEmbeds(Staged(UserInterface)) {
    public override get id(): string { 
        return "trade-ui" 
    }
    protected stage: number = 0

    protected override embed: EmbedBuilder | null = null

    private member: GuildMember | null = null
    private tradePartnerMember : GuildMember

    private trade: Trade = {
        traderItems: {},
        traderCurrencies: {},
        tradePartnerItems: {},
        tradePartnerCurrencies: {}
    }

    constructor(config: Config) {
        super(config)
        this.tradePartnerMember = config.tradePartnerMember
    }

    protected override async prepare(interaction: UserInterfaceInteraction) {
        const member = interaction.member
        if (!(member instanceof GuildMember)) return err("Unexpected error: Invalid member")

        if (member.id === this.tradePartnerMember.id) return err("You cannot trade with yourself")
        this.member = member
    
        if (!await canDM(member)) return err("You cannot trade, you have DMs disabled")
        if (!await canDM(this.tradePartnerMember)) return err("You cannot trade with this user, they have DMs disabled")

        return ok(true)
    }

    protected override getMessage(): string { return "" }

    protected override initStageComponents(_config: TradeUserInterfaceConfig): UIComponent[][] {

        const currencySelectionStrings = {
            editAmountModalTitle: t("userFlows.productAdd.components.editAmountModalTitle"),
            editAmountModalInputLabel: t("userFlows.productAdd.components.editAmountModalInputLabel")
        }

        const addTraderCurrencyWithSelect = getSelectionBuilder(
            `${this.id}+trader-currency-select`, 
            null, 
            {...currencySelectionStrings, selectMenuPlaceholder: "➕ Give a currency",},

            getCurrencies(),

            (currencies) => this.trade.traderCurrencies = currencies, 
            (interaction) => this.updateInteraction(interaction)
        )

        const addTraderItemWithSelect = getSelectionBuilder(
            `${this.id}+trader-item-select`, 
            null, 
            {...currencySelectionStrings, selectMenuPlaceholder: "➕ Give an item",},

            getItems(),

            (items) => this.trade.traderItems = items, 
            (interaction) => this.updateInteraction(interaction)
        )

        const sendButton = new ExtendedButtonComponent({
            customId: `${this.id}+send-trade`,
            label: "Send",
            style: ButtonStyle.Success,
            emoji: "📨",
            time: 120_000,
            disabled: true
        }, (interaction: ButtonInteraction) => this.sendTrade(interaction))
        
        const addRequestsButton = new ExtendedButtonComponent({
            customId: `${this.id}+add-requests`,
            label: "Add requests",
            style: ButtonStyle.Secondary,
            emoji: "📥",
            time: 120_000
        }, (interaction: ButtonInteraction) => {
            this.changeStage("next")
            this.updateInteraction(interaction)
        })

        const addTradePartnerCurrencyWithSelect = getSelectionBuilder(
            `${this.id}+trade-partner-currency-select`, 
            null, 
            {...currencySelectionStrings, selectMenuPlaceholder: "➕ Request a currency",},

            getCurrencies(),

            (currencies) => this.trade.tradePartnerCurrencies = currencies, 
            (interaction) => this.updateInteraction(interaction)
        )

        const addTradePartnerItemWithSelect = getSelectionBuilder(
            `${this.id}+trade-partner-item-select`, 
            null, 
            {...currencySelectionStrings, selectMenuPlaceholder: "➕ Request an item",},

            getItems(),

            (items) => this.trade.tradePartnerItems = items, 
            (interaction) => this.updateInteraction(interaction)
        )

        const backButton = new ExtendedButtonComponent({
            customId: `${this.id}+back`,
            label: "Back",
            style: ButtonStyle.Secondary,
            emoji: "⬅️",
            time: 120_000
        }, (interaction: ButtonInteraction) => {
            this.changeStage("prev")
            this.updateInteraction(interaction)
        })


        const sendTradeOfferButton = new ExtendedButtonComponent({
            customId: `${this.id}+send-trade`,
            label: "Send trade offer",
            style: ButtonStyle.Success,
            emoji: "📨",
            time: 120_000,
            disabled: true
        }, (interaction: ButtonInteraction) => this.sendTrade(interaction))


        return [
            [
                createComponent(addTraderCurrencyWithSelect, 
                    () => addTraderCurrencyWithSelect.toggle(Object.keys(this.trade.traderCurrencies).length < MAX_PRICE_LENGTH)
                ),
                createComponent(addTraderItemWithSelect,
                    () => addTraderItemWithSelect.toggle(Object.keys(this.trade.traderItems).length < MAX_PRICE_LENGTH)
                ),
                createComponent(sendButton, 
                    () => sendButton.toggle(Object.keys(this.trade.traderItems).length > 0 || Object.keys(this.trade.traderCurrencies).length > 0)
                ),
                createComponent(addRequestsButton),
            ],
            [
                createComponent(addTradePartnerCurrencyWithSelect,
                    () => addTradePartnerCurrencyWithSelect.toggle(Object.keys(this.trade.tradePartnerCurrencies).length < MAX_PRICE_LENGTH)
                ),
                createComponent(addTradePartnerItemWithSelect,
                    () => addTradePartnerItemWithSelect.toggle(Object.keys(this.trade.tradePartnerItems).length < MAX_PRICE_LENGTH)
                ),
                createComponent(backButton),
                createComponent(sendTradeOfferButton, 
                    () => sendTradeOfferButton.toggle(Object.keys(this.trade.tradePartnerItems).length > 0 || Object.keys(this.trade.tradePartnerCurrencies).length > 0)
                )
            ]
        ]
    }

    protected override initEmbeds(_interaction: UserInterfaceInteraction): void {
        this.embed = getTradeEmbed(this.getTradePayload(), "trade-build")
    }

    protected override updateEmbeds(): void {
        this.embed?.setFields(this.getEmbedFields())
    }

    protected override getEmbedFields(): APIEmbedField[] {
        return getTradeEmbedFields(this.trade, "trade-build")
    }

    private async sendTrade(interaction: MessageComponentInteraction) {
        this.disableComponents()

        if (!this.member) return
        if (Object.keys(this.trade.tradePartnerCurrencies).length === 0 && Object.keys(this.trade.tradePartnerItems).length === 0) {
            // TODO send everything without request
            return
        }

        const tradePayload = this.getTradePayload()

        const [err, id] = await createTrade(tradePayload)
        if (err) return console.error(err)


        const tradeEmbed = getTradeEmbed(tradePayload, "trade-offer")
        const acceptButton = new ButtonBuilder({
            customId: `trade-accept:${id}`,
            label: "Accept",
            style: ButtonStyle.Success,
            emoji: "✅"
        })

        const denyButton = new ButtonBuilder({
            customId: `trade-deny:${id}`,
            label: "Deny",
            style: ButtonStyle.Danger,
            emoji: "✖️"
        })


        const success = await sendDM(this.tradePartnerMember, { embeds: [tradeEmbed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton, denyButton)] })

        interaction.update({ content: success ? "✅ Trade offer sent" : "❌ Failed to send trade offer", components: [], embeds: [] })
    }

    private getTradePayload() {
        return tradePayloadSchema.parse({
            traderId: this.member!.id,
            tradePartnerId: (this.tradePartnerMember.id),
            trade: this.trade
        })
    }
}

