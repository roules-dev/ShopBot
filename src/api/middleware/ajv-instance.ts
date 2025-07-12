import Ajv from "ajv"
import { EMOJI_REGEX, ID_REGEX, SNOWLAKE_REGEX } from "../../utils/constants"
const ajv = new Ajv({ allErrors: true })

ajv.addFormat('snowflake', SNOWLAKE_REGEX)
ajv.addFormat('id', ID_REGEX)
ajv.addFormat('emoji', EMOJI_REGEX)


export { ajv }