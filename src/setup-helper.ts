import readline from 'node:readline'
import config from '../config/config.json'
import fs from 'node:fs'
import { appDeployCommands } from './deploy-commands';
import { PrettyLog } from './utils/pretty-log';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.on('close', () => {
    fs.writeFileSync('./config/config.json', JSON.stringify(config, null, 2))
});


async function setup() {
    const id = await questionWithCondition(`Bot client ID: `, id => /^\d{17,20}$/.test(id), 'Client ID not valid')
    config.clientId = id

    const token = await questionWithCondition(`Bot token: `, token => token.length > 0, 'Please enter a token')
    config.token = token

    const resetData = await questionWithCondition('Reset data? (y/n): ', answer => answer === 'y' || answer === 'n')
    if (resetData === 'y') {
        fs.writeFileSync('./data/shops.json', JSON.stringify({}, null, 2))
        fs.writeFileSync('./data/accounts.json', JSON.stringify({}, null, 2))
        fs.writeFileSync('./data/currencies.json', JSON.stringify({}, null, 2))
    }

    rl.close()
    
    await appDeployCommands()
    PrettyLog.success('Setup complete')
    PrettyLog.info(`You can now start the bot using ${PrettyLog.italic('npm run serve')}`)
}

setup()


function questionWithCondition(question: string, condition: (answer: string) => boolean, errorMessage?: string) {
    return new Promise<string>(resolve => {
        rl.question(question, answer => {
            if (condition(answer)) {
                resolve(answer)
            } else {
                console.log(errorMessage ?? 'Answer not valid')
                resolve(questionWithCondition(question, condition))
            }
        })
    })
}