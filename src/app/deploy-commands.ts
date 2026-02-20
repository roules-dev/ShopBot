import { PrettyLog, drawProgressBar } from '@//lib/pretty-log.js'
import { addLocalisationToCommand } from '@/lib/localisation.js'
import { REST } from '@discordjs/rest'
import { RESTPostAPIChatInputApplicationCommandsJSONBody, Routes, SlashCommandBuilder, Snowflake } from 'discord.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const configFilePath = path.join(__dirname, '../config/config.json')
let config: { clientId: string, token: string } | undefined

let rest: REST | undefined

const commands: { cache: RESTPostAPIChatInputApplicationCommandsJSONBody[], expired: boolean } = { cache: [], expired: true }


// TODO: To be refactored, should not mix functionnalities and printing
async function getCommands() {
    if (!commands.expired) {
        return commands.cache
    }

    PrettyLog.info('Loading commands for deployment...', false)

    const commandsList: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
    const commandsPath = path.join(__dirname, 'commands')
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

    const commandsCount = commandFiles.length

    if (commandsCount === 0) {
        PrettyLog.error('No command files found.', false)
        process.exit(1)
    }

    PrettyLog.info(`Found ${commandsCount} command files.`, false)

    PrettyLog.info('Processing command files...', false)

    for (const [index, file] of commandFiles.entries()) {
        const filePath = path.join(commandsPath, file)
        const command = await import(pathToFileURL(filePath).href)
        
        if (!(command.data instanceof SlashCommandBuilder)) {
            PrettyLog.warn(`The command at ${filePath} is not a valid SlashCommandBuilder instance.`, false)
            continue
        }

        commandsList.push(await addLocalisationToCommand(command.data))
            
        drawProgressBar(((index + 1) / commandsCount) * 100)
    }
    drawProgressBar(100)
    console.log('')

    PrettyLog.info('All command files processed.', false)

    commands.cache = commandsList
    commands.expired = false
    return commandsList
}

export async function appDeployCommands() { 
    try {
        await getRest().put(Routes.applicationCommands(getClientId()), { body: await getCommands() })
        PrettyLog.success('Successfully registered application commands.', false)
        return true
    } catch {
        return false
    }
}


export async function appDeleteCommands() {
    try {    
        await getRest().put(Routes.applicationCommands(getClientId()), { body: [] })
        
        PrettyLog.success('Successfully deleted application commands.', false)
        return true
    }
    catch {
        return false
    }   
}

export async function guildDeployCommands(guildId: Snowflake) {
    try {
        await getRest().put(Routes.applicationGuildCommands(getClientId(), guildId), { body: await getCommands() })

        PrettyLog.success('Successfully registered all guild commands.', false)
        return true       
    }
    catch {
        return false
    }
}

export async function guildDeleteCommands(guildId: Snowflake) {
    try {    
        await getRest().put(Routes.applicationGuildCommands(getClientId(), guildId), { body: [] })
        
        PrettyLog.success('Successfully deleted all guild commands.', false)
        return true
    }
    catch {
        return false
    }
}


function main() {
    const flag = process.argv[2]
    const guildId = process.argv[3]

    switch (flag) {
        case '/a':
            appDeployCommands()
            break

        case '/ad':
            appDeleteCommands()
            break

        case '/g':
            if (!guildId) {
                PrettyLog.error('Please specify a guild id', false)
                break
            }
            guildDeployCommands(guildId)
            break 
            
        case '/gd':
            if (!guildId) {
                PrettyLog.error('Please specify a guild id', false)
                break
            }
            guildDeleteCommands(guildId)
            break 

        default:
            PrettyLog.error('Please specify one of these flags: \n\n    /a  : Deploy App Commands\n    /ad : Delete App Commands\n    /g  : Deploy Guild Commands\n    /gd : Delete Guild Commands\n', false)
    }
}


if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main()
}



function getRest() {
    if (rest !== undefined) return rest

    const token = getToken()

    if (!getClientId() || !token) {
        PrettyLog.error('Missing clientId or token in config.json', false)
        process.exit(1)
    }

    rest = new REST({ version: '10' }).setToken(token)
    
    return rest
}

function getConfig() {
    if (config !== undefined 
        && config.token !== undefined && config.token !== ''
        && config.clientId !== undefined && config.clientId !== '') {
        return config
    }

    const _config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'))

    config = _config
    return _config
}


function getClientId() {
    const config = getConfig()

    if (!config) {
        PrettyLog.error('Missing config.json')
        process.exit(1)
    }

    if (!config.clientId) {
        PrettyLog.error('Missing clientId in config.json')
        process.exit(1)
    }

    return getConfig().clientId
}

function getToken() {
    const config = getConfig()

    if (!config) {
        PrettyLog.error('Missing config.json')
        process.exit(1)
    }

    if (!config.token) {
        PrettyLog.error('Missing token in config.json')
        process.exit(1)
    }

    return getConfig().token
}