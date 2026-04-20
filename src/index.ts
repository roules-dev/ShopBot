import "./global-settings.js"
import "@/utils/strings.js"
import "@/core/i18n/i18n.js"
import "@/core/database/init-databases.js"

import { startClient } from "./app/client/client.js"
import { PrettyLog } from "./lib/pretty-log.js"

function isTsx() {
    return process.argv.includes('--use-ts')
}

if (process.env["NODE_ENV"] === "development") {
	PrettyLog.warn("Development mode enabled")
	PrettyLog.warn("Unhandled errors won't be caught by the error handler")
}
else {
	process.on("unhandledRejection", (reason: unknown) => PrettyLog.error(`${reason}`))
	process.on("uncaughtException", (reason: unknown) => PrettyLog.error(`${reason}`))
	process.on("uncaughtExceptionMonitor", (reason: unknown) => PrettyLog.error(`${reason}`))
}

// Start the bot
startClient(isTsx())

