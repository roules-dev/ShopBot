import { startClient } from "./app/client/client.js"
import { PrettyLog } from "./lib/pretty-log.js"
import "@/utils/strings.js"
import "dotenv/config"
import { initI18n } from "./lib/localization/translate.js"

import en_US_locale from "@/generated/locales/en-US.js"
import es_ES_locale from "@/generated/locales/es-ES.js"
import fr_locale from "@/generated/locales/fr.js"


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

declare module "./lib/localization/translations.js" {
	interface Register {
		translations: typeof en_US_locale
	}
}

export const { t } = initI18n({
	locale: 'en-US',
	fallbackLocale: 'en-US',
	translations: {
		'en-US': en_US_locale,
		'es-ES': es_ES_locale,
		'fr': fr_locale
	}
})
