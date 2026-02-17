import config from '@/../config/config.json' with { type: 'json' };
import fs from 'node:fs/promises';
import readline from 'node:readline';
import { appDeployCommands } from '@/app/deploy-commands.js';
import { PrettyLog } from '@/utils/pretty-log.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});


async function setup() {
    console.log('\n\n———————————————————————————\n')
    PrettyLog.info('Dependencies installed, please enter your bot credentials', false)

    const id = await questionWithCondition(`\nBot client ID: `, id => /^\d{17,20}$/.test(id), 'Client ID not valid')
    config.clientId = id

    const token = await questionWithCondition(`\nBot token: `, token => token.length > 0, 'Please enter a token')
    config.token = token

    const resetData = await questionWithCondition('\nReset data? (y/n): ', answer => answer === 'y' || answer === 'n')
    if (resetData === 'y') {
        await fs.writeFile('./data/shops.json', JSON.stringify({}, null, 2))
        await fs.writeFile('./data/accounts.json', JSON.stringify({}, null, 2))
        await fs.writeFile('./data/currencies.json', JSON.stringify({}, null, 2))
    }

    await saveConfig()
    PrettyLog.success('Configuration saved', false)

    rl.close()
    
    console.log('\n———————————————————————————\n')
    PrettyLog.info('Deploying commands', false)
    await appDeployCommands()
    
    console.log('\n———————————————————————————\n')
    
    PrettyLog.success('Setup complete', false)
    PrettyLog.info(`You can now start the bot using ${PrettyLog.italic('npm run serve')}`, false)
}

setup()


function questionWithCondition(question: string, condition: (answer: string) => boolean, errorMessage?: string) {
    return new Promise<string>(resolve => {
        rl.question(question, answer => {
            if (condition(answer)) {
                resolve(answer)
            } else {
                PrettyLog.warn(errorMessage ?? 'Answer not valid', false)
                resolve(questionWithCondition(question, condition, errorMessage))
            }
        })
    })
}


async function saveConfig() {

    console.dir(config)

    await fs.writeFile('./config/config.json', JSON.stringify(config, null, 4))
}