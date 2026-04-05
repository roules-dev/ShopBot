import z from "zod";

const DISCORD_EMOJI_REGEX = /<a?:.+?:\d{18,}>/gu

export const EmojiSchema = z.emoji().or(z.string().regex(DISCORD_EMOJI_REGEX, "Invalid emoji")).brand("Emoji")

const SNOWFLAKE_REGEX = /^[0-9]{17,20}$/

export const SnowflakeSchema = z
    .string()
    .regex(SNOWFLAKE_REGEX, "Invalid snowflake")
    .brand("Snowflake")

export type BrandedSnowflake = z.infer<typeof SnowflakeSchema>

export const NanoIdSchema = z.nanoid().brand("NanoId")