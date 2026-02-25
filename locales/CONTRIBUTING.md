# 📝 Contributing to Translations

First off — thank you for helping make this bot accessible to everyone around the world! 🌍
Your contributions make a huge difference. This guide explains how to add or improve translations for your language.

## 🚀 Getting Started

1. **Fork** this repository to your own GitHub account.
2. **Clone** your fork locally:

   ```bash
   git clone https://github.com/roules-dev/ShopBot.git
   cd ShopBot
   ```

3. **Create a new branch** for your translation:

   ```bash
   git checkout -b add-language-<language-code>
   ```

   Example: `add-language-fr` for French.

## 🌐 Where Translations Live

All translation files are stored in:

```
/locales/
```

Each language has its own JSON file
For example:

```
/locales/
├── en-US.json
├── fr.json
├── es-ES.json
└── ...
```

If your language doesn’t exist yet, create a new file named after the [Discord locales codes](https://discord.com/developers/docs/reference#locales)

> Example: `de.json` for German, `ja.json` for Japanese, etc.

## 🧩 Translation Format

Translations are stored as simple key–value pairs, like this:

```json
{
  "greeting": "Hello!",
  "farewell": "Goodbye!",
  "errorGeneric": "Something went wrong, please try again."
}
```

To add your translation, **keep the same keys** and replace the English text with your translation:

```json
{
  "greeting": "Bonjour !",
  "farewell": "Au revoir !",
  "errorGeneric": "Une erreur s'est produite, veuillez réessayer."
}
```

✅ **Important Notes:**

- **Do not change keys** — only translate the values.
- **Preserve case (uppercase/lowercase)** as in the original English text.
- **Don't remove markdown formatting** such as `**`, `__`, `~~`, `#`, etc
- **Don't remove special characters** such as `\n`
- **Keep placeholders intact.** For example:

  ```json
  "welcomeUser": "Welcome, {username}!"
  ```

  should stay as:

  ```json
  "welcomeUser": "Bienvenue, {username} !"
  ```

- Use **UTF-8** encoding.
- **When translating commands and options** make sure to follow the [naming conventions](https://discord.com/developers/docs/interactions/application-commands#command-name-naming-conventions).

## 🧪 Testing Your Translation

### 🔎 Translation completeness check 
Firstly, you should make sure your not missing any translations.
For this, you can use the utility command 

```bash
npm run verify-translation "<language-code>"
```

It will print any missing key, make sure to add them, otherwise the message will fall back to english.

### 👀 Verify translations in context

Then you should run the bot locally to make sure everything looks correct.
It'll also make sure that the name and descriptions of the commands follow discord's [naming conventions](https://discord.com/developers/docs/interactions/application-commands#command-name-naming-conventions).

Firstly, you must deploy the commands:
```bash
npm run build
```
> it will also generate the locales files

Then you can use the setup helper command: (make sure to follow the [installation tutorial](https://github.com/roules-dev/ShopBot#-installing-the-bot))

```bash
npm run setup
```
> it will ask for your bot's token and Application ID, then deploy commands

Finally, to start the bot, run the following command:

```bash
npm run serve
```

Then, use your translated language setting to check that messages appear properly. (`/settings` command in the bot)


## 📥 Submitting Your Contribution

1. **Commit your changes** with a descriptive message:

   ```bash
   git add locales/<your-language>.json
   git commit -m "Add <Language> translation"
   ```

2. **Push your branch** to your fork:

   ```bash
   git push origin add-language-<language-code>
   ```

3. **Open a Pull Request** on GitHub:
   - Base repository: `OWNER/PROJECT-NAME`
   - Base branch: `main`
   - Compare: your branch
   - Add a short description of your translation and any notes about regional variations if applicable.

## 🗣️ Updating an Existing Translation

If you notice mistakes or missing phrases in an existing translation:

- Edit the relevant file (e.g., `fr.json`).
- Keep consistency with the existing style and phrasing.
- Open a pull request with your improvements.

## ❤️ Tips for Translators

- Aim for **clarity and natural language** — not literal word-for-word translations.
- Keep tone and style consistent with the bot’s personality.
- If unsure about a specific phrase, feel free to open a **GitHub issue** to discuss it first.

## 🙌 Thank You

Every contribution, big or small, helps make the bot better for everyone.
Thank you for taking the time to support multilingual users! 💬✨
