import z from "zod";

const DISCORD_EMOJI_REGEX = /<a?:.+?:\d{18,}>/gu

export const emojiSchema = z.emoji().or(z.string().regex(DISCORD_EMOJI_REGEX, "Invalid emoji")).brand("Emoji")

export type BrandedEmoji = z.infer<typeof emojiSchema>

const SNOWFLAKE_REGEX = /^[0-9]{17,20}$/

export const snowflakeSchema = z
    .string()
    .regex(SNOWFLAKE_REGEX, "Invalid snowflake")
    .brand("Snowflake")

export type BrandedSnowflake = z.infer<typeof snowflakeSchema>

export const nanoIdSchema = z.nanoid().brand("NanoId")
