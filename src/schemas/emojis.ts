import z from "zod";

const DISCORD_EMOJI_REGEX = /<a?:.+?:\d{18,}>/gu

export const EmojiSchema = z.emoji().or(z.string().regex(DISCORD_EMOJI_REGEX)).brand("Emoji")