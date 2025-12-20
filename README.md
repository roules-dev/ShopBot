# ShopBot 2

### Contents
- [👋 Introduction](#introduction)
- [🌟 Features](#-features)
- [🚀 How to use](#-how-to-use)
- [📝 Documentation](#-documentation)
- [📸 Screenshots](#-screenshots)
- [❓ Q&A](#-qa)
- [⚖️ Legal Stuff](#%EF%B8%8F-legal-information)


## Introduction

### Hi 👋 <br>
I created a cool bot for you !
Let me introduce you **ShopBot**, a bot aiming at helping you create your own shops and currencies to fit the needs of your community, your RP server, or anything you need.  
<sub><sup>(See [screenshots](#-screenshots))</sup></sub>
<br>


<div style="display:inline-flex; align-items:center; gap:0.7rem;">
  <span style="height:30px">If you love the bot, feel free to support me on ko-fi : </span>
  <a href="https://ko-fi.com/roules_" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/kofi1.png?v=6" height="34" alt="Buy Me a Coffee at ko-fi.com" style="border:0; height:34px;">
  </a>
</div>

And don't forget to leave a **⭐Star**

<br>

## 🌟 Features

You can check [screenshots](#-screenshots) of the bot's commands to see how cool it is :D

#### ✅ Easy to use
This bot uses the power of ***Slash Commands*** to let you interact with it with the **best UI** as possible (Embeds, Buttons, Select Menu). So you will **not have to worry** about remembering complex commands, the **bot does everything** for you, and prevents you from accidentally making errors.

Thanks to **Discord**'s features, you can customize the permissions for each command in the settings of your server.


#### ✅ Fully customizable shops, currencies, products. 
You can **create** **currencies**, then use them in **shops** you created, in which you can add **products**, with a name, an emoji, a description and a price.

Of course, you can **manage** these currencies, shops and products. You can **delete** and **edit** them, if you want to change their name, description.. or get rid of them !

#### ✅ Shop features
You can **create** **discount codes** for your shops.

You can set a product to be in **limited stock** or **unlimited stock**

You can have products that **trigger an action** when bought (such as: give money to a user, give a role to a user, *[any other ideas?](https://github.com/roules-dev/ShopBot/issues)*)

You can create shops **reserved for specific roles**


#### ✅ Inventory system (for items and currencies)
Users can **see** their own account and inventory, and **buy** in shops.

Admins can **give** and **take** money to users and even **empty** an account, they can also **see** the account and inventory of anyone.


#### ✅ Logs
You can setup a **log channel** to see logs about purchases, gives and takes.

#### ✅ Multi language support
The bot supports **English** and **French**. You can help the development of the bot by [translating it](https://github.com/roules-dev/ShopBot/blob/main/locales/CONTRIBUTING.md)

<br>

### To be added
- ❓ API to automate actions like: filling accounts; managing currencies, shops and products 
- Create a release, a precompiled version of the bot, with an easier way of installing it. 

See the detailed roadmap [here](https://github.com/roules-dev/ShopBot/blob/main/roadmap.md).
<br>

If you have a feature idea you think will fit this bot, feel free to suggest it [here](https://github.com/roules-dev/ShopBot/issues).

<br>

## 🚀 How to use
This repo is the bot's source code, not a bot itself. <br>
To use it, you must host it yourself. There are several methods to do this, some are free, some are paid (Be careful that your hosting solution allows file editing, sometimes called local database, otherwise all the bot's data will be lost if the server restarts). <br>
Once you found the hoster for your bot, here are the steps to follow: <br>
### 🔧 Installing the bot
#### 🤖 Creating the bot
1. Go on [Discord Developer Portal](https://discord.com/developers/applications) and login
2. Click **New Application**, give your bot a name, accept the ToS and developer policy
3. Copy the **Application ID** from the **General Information** tab, save it for later.
4. In the **Installation** tab, untick **User Install**, and in **Install Link** select **None**, then save changes.
5. Select tab **Bot**, click **Reset Token**, copy the token, save it for later.
6. Cutomize the bot as you want (Profile picture, banner, name...). Below **Authorization Flow**, untick **Public Bot**, tick **Presence Intent** and **Server Members Intent** 
7. Save changes.
8. In the **OAuth2** tab, in **Scopes**, select **bot** and **application.commands**, then tick the following permissions:
   * Read Messages/View Channels
   * Send Messages
   * Use Slash Commands
9. Select **Guild Install** and copy the generated URL
10. Follow this URL and add the bot to the server you want, accept everything, the bot should be added to your server !

#### 📡 Uploading the bot
Now, we'll link the code to the bot, and upload it on the server.
1. You need to have [Node.js](https://nodejs.org/en) installed on the machine where you want to host the bot.
2. Download the code from the [latest release](https://github.com/roules-dev/ShopBot/releases) and extract it from the ZIP file, open the folder where it's located, and open a terminal from here.
3. Execute the following command
```
npm run setup
```
4. Follow the instructions in the terminal (it will ask for your bot's token and Application ID)
5. When it asks : _reset data ?_, answer yes (y) if you don't want the placeholder shops, currencies and products that I used to test the bot
6. You can now run your bot by executing the following command
```
npm run serve
```
> Depending on your hosting solution, you may need to use a tool like `screen` (Linux) to keep the bot running in the background 

> You can also create a routine such that this command is executed from the bot's folder each time the server is restarted



All done ! You did it, your bot should be working perfectly ! 
If you have any problem with it, feel free to message me on Discord, or open an [issue on Github](https://github.com/roules-dev/ShopBot/issues)

<br>

## 📝 Documentation

### Main features and commands (Admin only)
As mentionned earlier, this bot enables you to create and manage shops, currencies and products. <br>

#### Managing Shops
The shops have a name, an optionnal description and emoji.
They also have an assigned currency. Shops can be reserved for a certain role.
All of these can be edited after the Shop has been created.

You can also create discount codes for the shops.

##### Commands :
```
  /shops-manage
    | create <name> <description> <emoji> <reserved-to-role?>
    | edit <name/description/emoji/reserved-to-role> <new-value>
    | reorder
    | remove

    | create-discount-code <code> <amount>
    | remove-discount-code
```

#### Managing Currencies
The currencies have a name and an emoji.
All of these can be edited after the Currency has been created.

##### Commands :
```
  /currencies-manage
    | create <name> <emoji>
    | edit <name/emoji> <new-value>
    | remove
```

#### Managing Products
The products have a name, a price, an optionnal description and emoji.
All of these can be edited after the Product has been created.
A product is assigned to a specific shop.

You can create 'Action Products', these are products that will trigger an action when bought.
It can be used to give money to a user, give the user a role. (That's all for now but I'm willing to add more in the future, feel free to give your suggestions in the [Issues](https://github.com/roules-dev/ShopBot/issues))

##### Commands :
```
  /products-manage
    | add <name> <price> <description> <emoji> <action?>
    | edit <name/price/description/emoji> <new-value>
    | remove
```

#### Managing Users
The users have an account and an inventory, initially empty. In addition to being able to view their account and inventory, you can give or take money to users, and empty their account.

##### Commands :
```
  /accounts-manage
    | view-account <target>
    | give <target> <amount>
    | bulk-give <role> <amount>
    | take <target> <amount>
```

#### Edit settings:
```
  /settings
```

#### How to use admin commands ?
Commands that require selecting a specific Shop or Currency will prompt you to do so with a drop-down list after you executed the command.
For example, when creating a shop (`/shops-manage create <name>`) you select the currency after sending the command, and then the shop is created.
When you give some amount of any currency to a user, you first specify the amount and then select the currency. 
When deleting any shop or currency, you also do select it after sending the command.

This for you not to have to remember the name of each currency and shop to manage them.

The use of those command is made as intuitive as possible using Discord's slash-commands and message components.
If you encounter any issue with a command, you can open an [issue](https://github.com/roules-dev/ShopBot/issues).


### Commands for everyone:

- Show user's account: `/account` 
 
- Display the shops: `/shop` 

<br><br>


## 📸 Screenshots 
### What members of the discord server can see
#### Shop 
<img src="./readme/assets/shop.png"/> 

#### Buy | Account | Inventory
<img src="./readme/assets/buy.png"/> 
<img src="./readme/assets/account.png"/> <img src="./readme/assets/inventory.png"/>


### Examples of what you, as an administrator, can see
#### Create | Delete a currency
<img src="./readme/assets/create-currency.png"/> <img src="./readme/assets/remove-currency.png"/> 

#### Create | Delete a shop
<img src="./readme/assets/create-shop.png"/> <img src="./readme/assets/remove-shop.png"/> 

And you can do [many more things](#-documentation)... Create discount codes, add products, give currency to users, use the bot to discover the interfaces ! 

#### Configuring bot's commands permissions
<img src="./readme/assets/bot-perms1.png" width="500px"/>

<sub><sup>The screenshots are coming from the tests I'm doing for the bot. (last screenshots update: 06 April 2025)</sup></sub>

<br>

## ❓ Q&A
### Multi language support ?
Implemented ! It is community driven, the currently available languages are : English, French. <br>
If your language is not mentionned here, you can help the development of the bot by [translating it](https://github.com/roules-dev/ShopBot/blob/main/locales/CONTRIBUTING.md)

### New features ?
If you have any suggestions for new features, [open an issue](https://github.com/roules-dev/ShopBot/issues) <br>
I'm working on this project when I have time for it, but I'm also happy to accept pull requests for new features.

### Report a bug ?
If you find a bug, [open an issue](https://github.com/roules-dev/ShopBot/issues)


<br>

> Any other question ? ask it [here](https://github.com/roules-dev/ShopBot/issues)

## ⚖️ Legal Information

### License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

### Legal Disclaimer

This software is provided **"as is"**, without warranty of any kind, express or implied. The authors and contributors of this project **assume no responsibility or liability** for any misuse of this bot, including but not limited to, using it to conduct or facilitate **illegal activities or transactions**.

By using this software, you agree that:
- You are solely responsible for complying with all applicable laws and regulations in your jurisdiction.
- The authors are **not liable** for any direct, indirect, or consequential damages arising from the use of this software.
- This project is intended **solely for lawful and ethical use**.

If you do not agree with these terms, **do not use this software**.

### Contributing

By submitting a pull request, you agree that your contributions will be licensed under the same GPL-3.0 License as the rest of the project.

### Notice

This project is **not affiliated with, endorsed by, or associated with Discord Inc.** All trademarks and copyrights related to Discord are owned by Discord Inc.

## ⭐ Star History

<a href="https://www.star-history.com/#roules-dev/ShopBot&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=roules-dev/ShopBot&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=roules-dev/ShopBot&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=roules-dev/ShopBot&type=Date" />
 </picture>
</a>

Don't forget to leave a **🌟Star**, it helps a lot !

---

If something is missing in this document, please open an [issue](https://github.com/roules-dev/ShopBot/issues).

