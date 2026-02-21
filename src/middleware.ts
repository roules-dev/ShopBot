import { Setting } from "./features/settings/database/settings-types.js"
import { EventBus } from "./lib/events.js"

export const EVENTS = new EventBus<{
    settingUpdated: [settingId: string, setting: Setting],
}>()