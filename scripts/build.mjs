import fs from "node:fs/promises"
import { zip } from 'zip-a-folder'
import { replaceTscAliasPaths } from 'tsc-alias';

const env = {
    "NODE_ENV": "production",
    "CLIENT_ID": "",
    "TOKEN": ""
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

function recordToEnv(obj) {
    return Object.entries(obj)
        .map(([key, value]) => {
            const strValue = String(value)
            const quotedValue = /[^\w./\-]/.test(strValue) 
                ? `"${strValue}"` 
                : strValue

            return `${key.toUpperCase()}=${quotedValue}`
        })
        .join('\n')
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

        console.log("Creating .env...")
        await fs.writeFile("./build/.env", recordToEnv(env))

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