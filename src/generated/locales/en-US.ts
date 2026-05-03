//! AUTO-GENERATED FILE — DO NOT EDIT
export const locale = {
    "errorMessages": {
        "default": "An error occured while executing this command, please try again later.",
        "invalidSubcommand": "Invalid subcommand",
        "insufficientParameters": "Insufficient parameters",
        "noShops": "There aren't any shops.\n-# Use `/shops-manage create` to create a new one",
        "noCurrencies": "There aren't any currencies.\n-# Use `/currencies-manage create` to create a new currency",
        "noProducts": "The selected shop has no products",
        "noItems": "There aren't any items",
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
                                "name": {
                                    "name": "new-name",
                                    "description": "The new name of the currency"
                                }
                            }
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "Change Emoji. You will select the currency later",
                            "options": {
                                "emoji": {
                                    "name": "new-emoji",
                                    "description": "The new emoji of the currency (leave empty to remove)"
                                }
                            }
                        }
                    }
                }
            }
        },
        "items-manage": {
            "name": "items-manage",
            "description": "Manage your available items",
            "options": {
                "create": {
                    "name": "create",
                    "description": "Create a new item",
                    "options": {
                        "name": {
                            "name": "name",
                            "description": "The name of the item"
                        },
                        "description": {
                            "name": "description",
                            "description": "The description of the item"
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "The emoji of the item (optional)"
                        }
                    }
                },
                "remove": {
                    "name": "remove",
                    "description": "Remove the selected item"
                },
                "edit": {
                    "name": "edit",
                    "description": "Edit an item",
                    "options": {
                        "name": {
                            "name": "name",
                            "description": "Change name. You will select the item later",
                            "options": {
                                "name": {
                                    "name": "new-name",
                                    "description": "The new name of the item"
                                }
                            }
                        },
                        "description": {
                            "name": "description",
                            "description": "Change description. You will select the item later",
                            "options": {
                                "description": {
                                    "name": "new-description",
                                    "description": "The new description of the item (leave empty to remove)"
                                }
                            }
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "Change emoji. You will select the item later",
                            "options": {
                                "emoji": {
                                    "name": "new-emoji",
                                    "description": "The new emoji of the item (leave empty to remove)"
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
                        "price": {
                            "name": "price",
                            "description": "The price of the product"
                        },
                        "stock": {
                            "name": "stock",
                            "description": "The stock of the product (optional)"
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
                        "price": {
                            "name": "price",
                            "description": "Change price. You will select the product later",
                            "options": {
                                "price": {
                                    "name": "new-price",
                                    "description": "The new price of the product"
                                }
                            }
                        },
                        "stock": {
                            "name": "stock",
                            "description": "Change stock. You will select the product later",
                            "options": {
                                "stock": {
                                    "name": "new-stock",
                                    "description": "The new stock of the product (leave empty for unlimited)"
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
                        "reserved_to_role": {
                            "name": "reserved_to_role",
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
                                "name": {
                                    "name": "new-name",
                                    "description": "The new name of the shop"
                                }
                            }
                        },
                        "description": {
                            "name": "description",
                            "description": "Change description. You will select the shop later",
                            "options": {
                                "description": {
                                    "name": "new-description",
                                    "description": "The new description of the shop (leave empty to remove)"
                                }
                            }
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "Change emoji. You will select the shop later",
                            "options": {
                                "emoji": {
                                    "name": "new-emoji",
                                    "description": "The new emoji of the shop (leave empty to remove)"
                                }
                            }
                        },
                        "reserved_to_role": {
                            "name": "reserved_to_role",
                            "description": "Change the role the shop is reserved to. You will select the shop later",
                            "options": {
                                "role": {
                                    "name": "new-role",
                                    "description": "The new role the shop will be reserved to (leave empty to remove)"
                                }
                            }
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
        "selectItem": "Select an item",
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
                    "title": "Select {kind} for {name}",
                    "kinds": {
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
                    "noProduct": "There are no products available here",
                    "xProductsLeft": "{x} left",
                    "outOfStock": "Out of stock",
                    "price": "Price:",
                    "free": "Free"
                }
            },
            "components": {
                "buyButton": "Buy a product",
                "showAccountButton": "My account"
            }
        },
        "buy": {
            "messages": {
                "default": "Buy {quantity}{product} from {shop}",
                "discountCode": "Discount code:",
                "price": "for {price}",
                "free": "free",
                "success": "You successfully bought {quantity}{product} in {shop} for {price}"
            },
            "errorMessages": {
                "cantBuyHere": "You can't buy products from this shop",
                "notEnoughMoney": "You don't have enough {currency} to buy this product.",
                "productNoLongerAvailable": "This product is no longer available."
            },
            "components": {
                "buyButton": "Buy",
                "setQuantityButton": "Set quantity",
                "editQuantityModalTitle": "Quantity",
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
                    "message": "You were given {amount} {currency}"
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
        "inventoryGive": {
            "messages": {
                "default": "Give {amount} {item} to {user}",
                "bulkGive": "Give {amount} {item} to all users with role {role}",
                "success": "You successfully gave {amount} {item} to {user}",
                "bulkGiveSuccess": "You successfully gave {amount} {item} to all users with role {role}"
            },
            "components": {
                "submitButton": "Submit"
            }
        },
        "inventoryTake": {
            "messages": {
                "default": "Take {amount} {item} from {user}",
                "successfullyEmptied": "You successfully emptied {user} inventory",
                "success": "You successfully took {amount} {item} from {user}"
            },
            "components": {
                "submitButton": "Submit",
                "takeAllButton": "Take all",
                "emptyInventoryButton": "Empty inventory"
            }
        },
        "currencyCreate": {
            "messages": {
                "success": "You successfully created the currency {currency}. \n-# Use `/currencies-manage remove` to remove it"
            }
        },
        "currencyRemove": {
            "errorMessages": {
                "cantRemoveCurrency": "⚠️ Can't remove {currency}! Some product(s) still have it in their price or action."
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
                "default": "Edit {currency}.\nNew {option}: {value}",
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
        "itemCreate": {
            "messages": {
                "success": "You successfully created the item {item}. \n-# Use `/items-manage remove` to remove it"
            }
        },
        "itemRemove": {
            "errorMessages": {
                "cantRemoveItem": "⚠️ Can't remove {item}! Some product(s) still sell it."
            },
            "messages": {
                "default": "Remove {item}, ⚠️ __**it will also take it from user's accounts**__",
                "success": "You successfully removed the item {item}"
            },
            "components": {
                "submitButton": "Remove item"
            }
        },
        "itemEdit": {
            "messages": {
                "default": "Edit {item}.\nNew {option}: {value}",
                "success": "You successfully edited the item {item}. \nNew {option}: {value}"
            },
            "components": {
                "submitButton": "Edit item"
            },
            "editOptions": {
                "name": "name",
                "emoji": "emoji",
                "description": "description"
            }
        },
        "productAdd": {
            "messages": {
                "default": "Add Product: {product} for {price} in {shop}",
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
                "noShopsWithProducts": "There aren't any shops with products./n-# Use `/shops-manage create` to create a new shop, and `/products-manage add` to add products"
            },
            "messages": {
                "shopSelectStage": "Edit a product from {shop}.\nNew {option}: {value}",
                "productSelectStage": "Edit product: {product} from {shop}. \nNew {option}: {value}",
                "success": "You successfully updated the product {product} from the shop {shop}. \nNew {option}: {value}"
            },
            "components": {
                "submitButton": "Edit product"
            },
            "editOptions": {
                "stock": "stock",
                "action": "action"
            }
        },
        "shopCreate": {
            "messages": {
                "success": "You successfully created the shop {shop}. \n-# Use `/shops-manage remove` to remove it"
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
                "reserved_to_role": "reserved to role"
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
                "default": "Create a discount code for {shop}.\nCode: {code}\nAmount: {amount}% off",
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
