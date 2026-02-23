import fs from "node:fs/promises"
import { zip } from 'zip-a-folder'
import { replaceTscAliasPaths } from 'tsc-alias';


const scriptsToKeep = [
    "setup",
    "migrate-db-to-nanoid",
    "deploy",
    "serve"
]

const scriptsParamsToRemove = {
    "serve": "--enable-source-maps",
    "setup": "--omit=dev"
}

async function main() {
    const packageJson = JSON.parse(await fs.readFile("./package.json"))
    
    if (!packageJson.scripts || !packageJson.version) return

    if (packageJson.devDependencies) {
        delete packageJson.devDependencies
    }

    for (const script of Object.keys(packageJson.scripts)) {
        if (!scriptsToKeep.includes(script)) {
            delete packageJson.scripts[script]
        }
        else if (scriptsParamsToRemove[script]) {
            packageJson.scripts[script] = packageJson.scripts[script].replace(`${scriptsParamsToRemove[script]} `, "")
        }
    }

    try {
        await fs.writeFile("./build/package.json", JSON.stringify(packageJson, null, 4))

        await fs.copyFile("./LICENSE", "./build/LICENSE")

        for (const file of await fs.readdir("./build/data")) {
            await fs.rm(`./build/data/${file}`)
        }

        for (const file of await fs.readdir("./data")) {
            await fs.copyFile(`./data/${file}`, `./build/data/${file}`)
        }
    } 
    catch (error) {
        console.log(error)
    }

    await replaceTscAliasPaths({
        configFile: "./tsconfig.build.json"
    })

    await zip("./build", `./Shopbot-v${packageJson.version}-release.zip`)
}

main()