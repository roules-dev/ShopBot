//! AUTO-GENERATED FILE — DO NOT EDIT
export const locale = {
    "errorMessages": {
        "default": "An error occured while executing this command, please try again later.",
        "invalidSubcommand": "Invalid subcommand",
        "insufficientParameters": "Insufficient parameters",
        "noShops": "There isn't any shop.\n-# Use `/shops-manage create` to create a new one",
        "noCurrencies": "There isn't any currency.\n-# Use `/currencies-manage create` to create a new currency",
        "noProducts": "The selected shop has no products",
        "notOnlyEmojisInName": "The name can't contain only custom emojis",
        "shopDoesNotExist": "Shop does not exist",
        "shopAlreadyExists": "Shop already exists",
        "invalidPosition": "Invalid position",
        "currencyDoesNotExist": "Currency does not exist",
        "currencyAlreadyExists": "Currency already exists",
        "productDoesNotExist": "Product does not exist",
        "accountDoesNotExist": "Account does not exist",
        "invalidSettingType": "Provided setting type is invalid",
        "duplicateSettingName": "Provided setting name already exists"
    },
    "commands": {
        "account": {
            "name": "account",
            "description": "Display your account"
        },
        "accounts-manage": {
            "name": "accounts-manage",
            "description": "Manage user accounts",
            "options": {
                "view-account": {
                    "name": "view-account",
                    "description": "View a user's account",
                    "options": {
                        "target": {
                            "name": "target",
                            "description": "The user you want to see the account of"
                        }
                    }
                },
                "give": {
                    "name": "give",
                    "description": "Give currency to a user",
                    "options": {
                        "target": {
                            "name": "target",
                            "description": "The user you want to give currency to"
                        },
                        "amount": {
                            "name": "amount",
                            "description": "The amount of currency to give"
                        }
                    }
                },
                "bulk-give": {
                    "name": "bulk-give",
                    "description": "Give currency to all users with a specific role",
                    "options": {
                        "role": {
                            "name": "role",
                            "description": "The role of users you want to give currency to"
                        },
                        "amount": {
                            "name": "amount",
                            "description": "The amount of currency to give to each user"
                        }
                    }
                },
                "take": {
                    "name": "take",
                    "description": "Take currency from a user",
                    "options": {
                        "target": {
                            "name": "target",
                            "description": "The user you want to take currency from"
                        },
                        "amount": {
                            "name": "amount",
                            "description": "The amount of money to take. If you want to take all target's money, you'll be able to do it later"
                        }
                    }
                }
            }
        },
        "currencies-manage": {
            "name": "currencies-manage",
            "description": "Manage your currencies",
            "options": {
                "create": {
                    "name": "create",
                    "description": "Create a new currency",
                    "options": {
                        "name": {
                            "name": "name",
                            "description": "The name of the currency"
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "The emoji of the currency (optional)"
                        }
                    }
                },
                "remove": {
                    "name": "remove",
                    "description": "Remove the selected currency"
                },
                "edit": {
                    "name": "edit",
                    "description": "Edit a currency",
                    "options": {
                        "name": {
                            "name": "name",
                            "description": "Change name. You will select the currency later",
                            "options": {
                                "new-name": {
                                    "name": "new-name",
                                    "description": "The new name of the currency"
                                }
                            }
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "Change Emoji. You will select the currency later",
                            "options": {
                                "new-emoji": {
                                    "name": "new-emoji",
                                    "description": "The new emoji of the currency (if you just want to remove it write anything)"
                                }
                            }
                        }
                    }
                }
            }
        },
        "products-manage": {
            "name": "products-manage",
            "description": "Manage your products",
            "options": {
                "add": {
                    "name": "add",
                    "description": "Add a new product",
                    "options": {
                        "name": {
                            "name": "name",
                            "description": "The name of the product"
                        },
                        "price": {
                            "name": "price",
                            "description": "The price of the product"
                        },
                        "description": {
                            "name": "description",
                            "description": "The description of the product (optional)"
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "The emoji of the product (optional)"
                        },
                        "amount": {
                            "name": "amount",
                            "description": "The amount of the product (optional)"
                        },
                        "action": {
                            "name": "action",
                            "description": "The action of the product (optional)"
                        }
                    }
                },
                "remove": {
                    "name": "remove",
                    "description": "Remove a product"
                },
                "edit": {
                    "name": "edit",
                    "description": "Edit a product",
                    "options": {
                        "name": {
                            "name": "name",
                            "description": "Change name. You will select the product later",
                            "options": {
                                "new-name": {
                                    "name": "new-name",
                                    "description": "The new name of the product"
                                }
                            }
                        },
                        "description": {
                            "name": "description",
                            "description": "Change description. You will select the product later",
                            "options": {
                                "new-description": {
                                    "name": "new-description",
                                    "description": "The new description of the product"
                                }
                            }
                        },
                        "price": {
                            "name": "price",
                            "description": "Change price. You will select the product later",
                            "options": {
                                "new-price": {
                                    "name": "new-price",
                                    "description": "The new price of the product"
                                }
                            }
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "Change emoji. You will select the product later",
                            "options": {
                                "new-emoji": {
                                    "name": "new-emoji",
                                    "description": "The new emoji of the product (if you just want to remove it write anything)"
                                }
                            }
                        },
                        "amount": {
                            "name": "amount",
                            "description": "Change amount. You will select the product later",
                            "options": {
                                "new-amount": {
                                    "name": "new-amount",
                                    "description": "The new amount of the product (-1 for unlimited)"
                                }
                            }
                        }
                    }
                }
            }
        },
        "settings": {
            "name": "settings",
            "description": "See and edit your settings"
        },
        "shop": {
            "name": "shop",
            "description": "Display shops and buy products"
        },
        "shops-manage": {
            "name": "shops-manage",
            "description": "Manage your shops",
            "options": {
                "create": {
                    "name": "create",
                    "description": "Create a new shop",
                    "options": {
                        "name": {
                            "name": "name",
                            "description": "The name of the shop"
                        },
                        "description": {
                            "name": "description",
                            "description": "The description of the shop (optional)"
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "The emoji of the shop (optional)"
                        },
                        "reserved-to-role": {
                            "name": "reserved-to-role",
                            "description": "Specify if should be reserved to a role (optional)"
                        }
                    }
                },
                "remove": {
                    "name": "remove",
                    "description": "Remove the selected shop"
                },
                "reorder": {
                    "name": "reorder",
                    "description": "Reorder shops"
                },
                "create-discount-code": {
                    "name": "create-discount-code",
                    "description": "Create a discount code",
                    "options": {
                        "code": {
                            "name": "code",
                            "description": "The discount code"
                        },
                        "amount": {
                            "name": "amount",
                            "description": "The amount of the discount (in %)"
                        }
                    }
                },
                "remove-discount-code": {
                    "name": "remove-discount-code",
                    "description": "Remove a discount code"
                },
                "edit": {
                    "name": "edit",
                    "description": "Edit a shop",
                    "options": {
                        "name": {
                            "name": "name",
                            "description": "Change name. You will select the shop later",
                            "options": {
                                "new-name": {
                                    "name": "new-name",
                                    "description": "The new name of the shop"
                                }
                            }
                        },
                        "description": {
                            "name": "description",
                            "description": "Change description. You will select the shop later",
                            "options": {
                                "new-description": {
                                    "name": "new-description",
                                    "description": "The new description of the shop"
                                }
                            }
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "Change emoji. You will select the shop later",
                            "options": {
                                "new-emoji": {
                                    "name": "new-emoji",
                                    "description": "The new emoji of the shop"
                                }
                            }
                        },
                        "reserved-to-role": {
                            "name": "reserved-to-role",
                            "description": "Change the role the shop is reserved to. You will select the shop later",
                            "options": {
                                "new-role": {
                                    "name": "new-role",
                                    "description": "The new role the shop will be reserved to. Leave empty to delete"
                                }
                            }
                        },
                        "currency": {
                            "name": "currency",
                            "description": "Change currency. You will select the shop later"
                        }
                    }
                }
            }
        }
    },
    "defaultComponents": {
        "selectCurrency": "Select a currency",
        "selectShop": "Select a shop",
        "selectRole": "Select a role",
        "selectProduct": "Select a product",
        "changeShopButton": "Change shop",
        "submitShopButton": "Submit shop",
        "unset": "Unset"
    },
    "extendedComponents": {
        "confirmationModal": {
            "title": "⚠️ Are you sure?",
            "cantBeUndone": "This action can't be undone",
            "selectYes": "Select 'Yes' to confirm",
            "yes": "Yes",
            "no": "No"
        },
        "editModal": {
            "title": "Edit {edit}",
            "new": "New {edit}"
        }
    },
    "userInterfaces": {
        "settings": {
            "embeds": {
                "settings": {
                    "title": "⚙️ Settings",
                    "description": "You can edit your settings here",
                    "unsetSetting": "Not set"
                }
            },
            "components": {
                "selectSetting": "Edit a setting",
                "defaultEditor": {
                    "title": "Edit {name}"
                },
                "toggleEditor": {
                    "toggleOn": "Enable",
                    "toggleOff": "Disable"
                },
                "selector": {
                    "title": "Select {type} for {name}",
                    "types": {
                        "role": "a role",
                        "user": "a user",
                        "channel": "a channel",
                        "option": "an option"
                    }
                },
                "resetButton": "Reset {name}",
                "backButton": "Back"
            }
        },
        "account": {
            "embeds": {
                "account": {
                    "title": "💰 _{user}_'s Account"
                },
                "inventory": {
                    "title": "💼 _{user}_'s Inventory"
                }
            },
            "components": {
                "showAccountButton": "Show account",
                "showInventoryButton": "Show inventory"
            },
            "errors": {
                "accountEmpty": "❌ Account is empty",
                "inventoryEmpty": "❌ Inventory is empty"
            }
        },
        "shop": {
            "embeds": {
                "shop": {
                    "products": "Products:",
                    "reservedTo": "{role} only",
                    "noProduct": "There is no product available here",
                    "xProductsLeft": "{x} left",
                    "outOfStock": "Out of stock",
                    "price": "Price:"
                }
            },
            "components": {
                "buyButton": "Buy a product",
                "showAccountButton": "My account"
            }
        },
        "buy": {
            "messages": {
                "default": "Buy {product} from {shop}",
                "discountCode": "Discount code:",
                "price": "for {price}",
                "success": "You successfully bought {product} in {shop} for {price}"
            },
            "errorMessages": {
                "cantBuyHere": "You can't buy products from this shop",
                "notEnoughMoney": "You don't have enough {currency} to buy this product.",
                "productNoLongerAvailable": "This product is no longer available."
            },
            "components": {
                "buyButton": "Buy",
                "discountCodeButton": "I have a discount code",
                "setDiscountCodeModal": {
                    "title": "Set discount code",
                    "input": "Discount Code"
                }
            },
            "actionProducts": {
                "giveRole": {
                    "message": "You were granted the role {role}"
                },
                "giveCurrency": {
                    "message": "You were given **{amount} {currency}**"
                }
            }
        }
    },
    "userFlows": {
        "accountGive": {
            "errorMessages": {
                "cantGiveMoney": "Can't give money."
            },
            "messages": {
                "default": "Give {amount} {currency} to {user}",
                "bulkGive": "Give {amount} {currency} to all users with role {role}",
                "success": "You successfully gave {amount} {currency} to {user}",
                "bulkGiveSuccess": "You successfully gave {amount} {currency} to all users with role {role}"
            },
            "components": {
                "submitButton": "Submit"
            }
        },
        "accountTake": {
            "errorMessages": {
                "cantTakeMoney": "Can't take money."
            },
            "messages": {
                "default": "Take {amount} {currency} from {user}",
                "successfullyEmptied": "You successfully emptied {user} account",
                "success": "You successfully took {amount} {currency} from {user}"
            },
            "components": {
                "submitButton": "Submit",
                "takeAllButton": "Take all",
                "emptyAccountButton": "Empty account"
            }
        },
        "currencyCreate": {
            "messages": {
                "success": "You successfully created the currency {currency}. \n-# Use `/currencies-manage remove` to remove it"
            }
        },
        "currencyRemove": {
            "errorMessages": {
                "cantRemoveCurrency": "⚠️ Can't remove {currency}! The following shops are still using it : {shops}.",
                "changeShopsCurrencies": "Please consider removing them (`/shops-manage remove`) or changing their currency (`/shops-manage change-currency`) before removing the currency."
            },
            "messages": {
                "default": "Remove {currency}, ⚠️ __**it will also take it from user's accounts**__",
                "success": "You successfully removed the currency {currency}"
            },
            "components": {
                "submitButton": "Remove currency"
            }
        },
        "currencyEdit": {
            "messages": {
                "default": "Edit {currency}.\n**New** {option}: {value}",
                "success": "You successfully edited the currency {currency}. \nNew {option}: {value}"
            },
            "components": {
                "submitButton": "Edit currency"
            },
            "editOptions": {
                "name": "name",
                "emoji": "emoji"
            }
        },
        "productAdd": {
            "messages": {
                "default": "Add Product: {product} for {price} {currency} in {shop}{description}",
                "description": "Description:",
                "success": "You successfully added the product {product} to the shop {shop}",
                "withAction": "with the action {action}",
                "action": "Action:",
                "actions": {
                    "giveRole": "give {role} role",
                    "giveCurrency": "give {amount} {currency}"
                }
            },
            "components": {
                "submitButton": "Add product",
                "setAmountButton": "Set amount",
                "editAmountModalTitle": "Amount"
            }
        },
        "productRemove": {
            "messages": {
                "shopSelectStage": "Remove a product from: {shop}",
                "productSelectStage": "Remove product: {product} from {shop}",
                "success": "You successfully removed the product {product} from the shop {shop}"
            },
            "components": {
                "submitButton": "Remove Product"
            }
        },
        "productEdit": {
            "errorMessages": {
                "noShopsWithProducts": "There isn't any shop with products./n-# Use `/shops-manage create` to create a new shop, and `/products-manage add` to add products"
            },
            "messages": {
                "shopSelectStage": "Edit a product from {shop}.\nNew {option}: {value}",
                "productSelectStage": "Edit product: {product} from {shop}. \nNew {option}: {value}",
                "success": "You successfully updated the product {product} from the shop {shop}. \nNew {option}: {value}",
                "unlimited": "unlimited"
            },
            "components": {
                "submitButton": "Edit product"
            },
            "editOptions": {
                "name": "name",
                "emoji": "emoji",
                "price": "price",
                "description": "description",
                "amount": "amount"
            }
        },
        "shopCreate": {
            "errorMessages": {
                "cantCreateShop": "Can't create a new shop."
            },
            "messages": {
                "default": "Create the shop {shop} with currency {currency}",
                "success": "You successfully created the shop {shop} with currency {currency}. \n-# Use `/shops-manage remove` to remove it"
            },
            "components": {
                "submitButton": "Create shop",
                "changeShopNameButton": "Change shop name",
                "changeShopEmojiButton": "Change shop emoji",
                "editNameModalTitle": "Shop name",
                "editEmojiModalTitle": "Shop emoji"
            }
        },
        "shopRemove": {
            "messages": {
                "default": "Remove the shop {shop}.\n⚠️ __**It will also remove all products from this shop**__",
                "success": "You successfully removed the shop {shop}"
            },
            "components": {
                "submitButton": "Remove shop"
            }
        },
        "shopReorder": {
            "messages": {
                "default": "Change position of {shop} to {position}",
                "success": "You successfully changed the position of {shop} to {position}"
            },
            "components": {
                "submitNewPositionButton": "Submit position",
                "selectPosition": "Select position"
            }
        },
        "shopEdit": {
            "messages": {
                "default": "Edit {shop}.\nNew {option}: {value}",
                "success": "You successfully edited the shop {shop}. \nNew {option}: {value}"
            },
            "components": {
                "submitButton": "Edit shop"
            },
            "editOptions": {
                "name": "name",
                "emoji": "emoji",
                "description": "description",
                "reserved-to-role": "reserved to role"
            }
        },
        "shopChangeCurrency": {
            "messages": {
                "shopSelectStage": "Change the currency of {shop}",
                "currencySelectStage": "Change the currency of {shop} to {currency}",
                "success": "You successfully updated the currency of {shop} to {currency}"
            },
            "components": {
                "submitButton": "Change currency"
            }
        },
        "discountCodeCreate": {
            "messages": {
                "default": "Create a discount code for {shop}.\n**Code**: {code}\nAmount: {amount}% off",
                "success": "You successfully created the discount code {code} for {shop} with {amount}% off"
            },
            "components": {
                "submitButton": "Create discount code"
            }
        },
        "discountCodeRemove": {
            "messages": {
                "shopSelectStage": "Remove a discount code from {shop}",
                "codeSelectStage": "Remove discount code {code} from {shop}",
                "success": "You successfully removed the discount code {code} from {shop}"
            },
            "components": {
                "discountCodeSelect": "Select a discount code",
                "submitButton": "Remove discount code"
            }
        }
    }
} as const
export default locale
