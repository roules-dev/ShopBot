import { startClient } from "./app/client/client.js"
import { PrettyLog } from "./lib/pretty-log.js"

import { getLocales } from "@/lib/localization/localization.js"
import "@/utils/strings.js"
import "dotenv/config"


if (process.env["NODE_ENV"] && process.env.NODE_ENV === 'development') {
	PrettyLog.warn('Development mode enabled')
	PrettyLog.warn('Errors won\'t be caught by the error handler')
}
else {
	process.on('unhandledRejection', (reason: unknown) => PrettyLog.error(`${reason}`))
	process.on('uncaughtException', (reason: unknown) => PrettyLog.error(`${reason}`))
	process.on('uncaughtExceptionMonitor', (reason: unknown) => PrettyLog.error(`${reason}`))
}


// Start the bot
startClient()

// load locales
getLocales()