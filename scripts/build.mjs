import fs from "node:fs/promises"
import { zip } from 'zip-a-folder'
import { replaceTscAliasPaths } from 'tsc-alias';

const config = {
    token: "",
    clientId: ""
}

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
    const packageJson = JSON.parse(await fs.readFile("./package.json", "utf-8"))
    
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
        console.log("Copying package.json...")
        await fs.writeFile("./build/package.json", JSON.stringify(packageJson, null, 4))

        await fs.copyFile("./LICENSE", "./build/LICENSE")

        console.log("Creating config.json...")
        await fs.mkdir("./build/config", { recursive: true })
        await fs.writeFile("./build/config/config.json", JSON.stringify(config, null, 4))

        console.log("Copying data...")
        await fs.mkdir("./build/data", { recursive: true })
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

    console.log("Replacing path aliases...")
    await replaceTscAliasPaths({
        configFile: "./tsconfig.build.json",
    })

    console.log("Zipping build...")
    await zip("./build", `./Shopbot-v${packageJson.version}-release.zip`)

    console.log("\nBuild completed")
}

main()