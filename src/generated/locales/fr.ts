//! AUTO-GENERATED FILE — DO NOT EDIT
export const locale = {
    "errorMessages": {
        "default": "Une erreure est survenue pendant l'exécution de la commande. Veuillez réessayer plus tard.",
        "invalidSubcommand": "Sous-commande invalide",
        "insufficientParameters": "Paramètres insuffisants",
        "noShops": "Il n'y a pas de boutique.\n-# Utilisez `/shops-manage create` pour en créer une nouvelle",
        "noCurrencies": "Il n'y a pas de devise.\n-# Utilisez `/currencies-manage create` pour créer une nouvelle devise",
        "noProducts": "La boutique sélectionnée n'a pas de produits",
        "notOnlyEmojisInName": "Le nom ne peut pas contenir que des emojis personnalisés",
        "shopDoesNotExist": "La boutique n'existe pas",
        "shopAlreadyExists": "La boutique existe déjà",
        "invalidPosition": "Position invalide",
        "currencyDoesNotExist": "La devise n'existe pas",
        "currencyAlreadyExists": "La devise existe déjà",
        "productDoesNotExist": "Le produit n'existe pas",
        "accountDoesNotExist": "Le compte n'existe pas",
        "invalidSettingType": "Le type de paramètre fourni est invalide",
        "duplicateSettingName": "Le nom de paramètre fourni existe déjà"
    },
    "commands": {
        "account": {
            "name": "compte",
            "description": "Afficher votre compte"
        },
        "accounts-manage": {
            "name": "gerer-comptes",
            "description": "Gérer les comptes utilisateurs",
            "options": {
                "view-account": {
                    "name": "voir-compte",
                    "description": "Voir le compte d'un utilisateur",
                    "options": {
                        "target": {
                            "name": "cible",
                            "description": "L'utilisateur dont vous voulez voir le compte"
                        }
                    }
                },
                "give": {
                    "name": "donner",
                    "description": "Donner de la monnaie à un utilisateur",
                    "options": {
                        "target": {
                            "name": "cible",
                            "description": "L'utilisateur à qui vous voulez donner de la monnaie"
                        },
                        "amount": {
                            "name": "montant",
                            "description": "Le montant de monnaie à donner"
                        }
                    }
                },
                "bulk-give": {
                    "name": "donner-groupe",
                    "description": "Donner de la monnaie à tous les utilisateurs avec un rôle spécifique",
                    "options": {
                        "role": {
                            "name": "role",
                            "description": "Le rôle des utilisateurs à qui vous voulez donner de la monnaie"
                        },
                        "amount": {
                            "name": "montant",
                            "description": "Le montant de monnaie à donner à chaque utilisateur"
                        }
                    }
                },
                "take": {
                    "name": "prendre",
                    "description": "Prendre de la monnaie à un utilisateur",
                    "options": {
                        "target": {
                            "name": "cible",
                            "description": "L'utilisateur dont vous voulez prendre de la monnaie"
                        },
                        "amount": {
                            "name": "montant",
                            "description": "Le montant de monnaie à prendre. Si vous voulez tout prendre, vous pourrez le faire plus tard."
                        }
                    }
                }
            }
        },
        "currencies-manage": {
            "name": "gerer-devises",
            "description": "Gérer vos devises",
            "options": {
                "create": {
                    "name": "creer",
                    "description": "Créer une nouvelle devise",
                    "options": {
                        "name": {
                            "name": "nom",
                            "description": "Le nom de la devise"
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "L'emoji de la devise (optionnel)"
                        }
                    }
                },
                "remove": {
                    "name": "supprimer",
                    "description": "Supprimer la devise sélectionnée"
                },
                "edit": {
                    "name": "modifier",
                    "description": "Modifier une devise",
                    "options": {
                        "name": {
                            "name": "nom",
                            "description": "Changer le nom. Vous sélectionnerez la devise plus tard",
                            "options": {
                                "name": {
                                    "name": "nouveau-nom",
                                    "description": "Le nouveau nom de la devise"
                                }
                            }
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "Changer l'emoji. Vous sélectionnerez la devise plus tard",
                            "options": {
                                "emoji": {
                                    "name": "nouvel-emoji",
                                    "description": "Le nouvel emoji de la devise (laissez vide pour supprimer)"
                                }
                            }
                        }
                    }
                }
            }
        },
        "products-manage": {
            "name": "gerer-produits",
            "description": "Gérer vos produits",
            "options": {
                "add": {
                    "name": "ajouter",
                    "description": "Ajouter un nouveau produit",
                    "options": {
                        "price": {
                            "name": "prix",
                            "description": "Le prix du produit"
                        },
                        "stock": {
                            "name": "stock",
                            "description": "Le stock du produit (optionnel)"
                        },
                        "action": {
                            "name": "action",
                            "description": "L'action du produit (optionnel)"
                        }
                    }
                },
                "remove": {
                    "name": "supprimer",
                    "description": "Supprimer un produit"
                },
                "edit": {
                    "name": "modifier",
                    "description": "Modifier un produit",
                    "options": {
                        "price": {
                            "name": "prix",
                            "description": "Changer le prix. Vous sélectionnerez le produit plus tard",
                            "options": {
                                "price": {
                                    "name": "nouveau-prix",
                                    "description": "Le nouveau prix du produit"
                                }
                            }
                        },
                        "stock": {
                            "name": "stock",
                            "description": "Changer le stock. Vous sélectionnerez le produit plus tard",
                            "options": {
                                "stock": {
                                    "name": "nouveau-stock",
                                    "description": "Le nouveau stock du produit (laissez vide pour illimité)"
                                }
                            }
                        }
                    }
                }
            }
        },
        "settings": {
            "name": "parametres",
            "description": "Voir et modifier vos paramètres"
        },
        "shop": {
            "name": "boutique",
            "description": "Afficher les boutiques et acheter des produits"
        },
        "shops-manage": {
            "name": "gerer-boutiques",
            "description": "Gérer vos boutiques",
            "options": {
                "create": {
                    "name": "creer",
                    "description": "Créer une nouvelle boutique",
                    "options": {
                        "name": {
                            "name": "nom",
                            "description": "Le nom de la boutique"
                        },
                        "description": {
                            "name": "description",
                            "description": "La description de la boutique (optionnel)"
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "L'emoji de la boutique (optionnel)"
                        },
                        "reserved_to_role": {
                            "name": "reservee-au-role",
                            "description": "Spécifiez si la boutique doit être réservée à un rôle (optionnel)"
                        }
                    }
                },
                "remove": {
                    "name": "supprimer",
                    "description": "Supprimer la boutique sélectionnée"
                },
                "reorder": {
                    "name": "reordonner",
                    "description": "Réorganiser les boutiques"
                },
                "create-discount-code": {
                    "name": "creer-code-promo",
                    "description": "Créer un code de réduction",
                    "options": {
                        "code": {
                            "name": "code",
                            "description": "Le code de réduction"
                        },
                        "amount": {
                            "name": "montant",
                            "description": "Le montant de la réduction (en %)"
                        }
                    }
                },
                "remove-discount-code": {
                    "name": "supprimer-code-promo",
                    "description": "Supprimer un code de réduction"
                },
                "edit": {
                    "name": "modifier",
                    "description": "Modifier une boutique",
                    "options": {
                        "name": {
                            "name": "nom",
                            "description": "Changer le nom. Vous sélectionnerez la boutique plus tard",
                            "options": {
                                "name": {
                                    "name": "nouveau-nom",
                                    "description": "Le nouveau nom de la boutique"
                                }
                            }
                        },
                        "description": {
                            "name": "description",
                            "description": "Changer la description. Vous sélectionnerez la boutique plus tard",
                            "options": {
                                "description": {
                                    "name": "nouvelle-description",
                                    "description": "La nouvelle description de la boutique (laissez vide pour supprimer)"
                                }
                            }
                        },
                        "emoji": {
                            "name": "emoji",
                            "description": "Changer l'emoji. Vous sélectionnerez la boutique plus tard",
                            "options": {
                                "emoji": {
                                    "name": "nouvel-emoji",
                                    "description": "Le nouvel emoji de la boutique (laissez vide pour supprimer)"
                                }
                            }
                        },
                        "reserved_to_role": {
                            "name": "reservee-au-role",
                            "description": "Changer le rôle auquel la boutique est réservée. Vous sélectionnerez la boutique plus tard",
                            "options": {
                                "role": {
                                    "name": "nouveau-role",
                                    "description": "Le nouveau rôle auquel la boutique sera réservée (laissez vide pour supprimer)"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "defaultComponents": {
        "selectCurrency": "Sélectionner une devise",
        "selectShop": "Sélectionner une boutique",
        "selectRole": "Sélectionner un rôle",
        "selectProduct": "Sélectionner un produit",
        "changeShopButton": "Changer de boutique",
        "submitShopButton": "Soumettre la boutique",
        "unset": "Non défini"
    },
    "extendedComponents": {
        "confirmationModal": {
            "title": "⚠️ Êtes-vous sûr ?",
            "cantBeUndone": "Cette action est irréversible",
            "selectYes": "Selectionnez 'Oui' pour confirmer",
            "yes": "Oui",
            "no": "Non"
        },
        "editModal": {
            "title": "Modifier {edit}",
            "new": "Nouveau {edit}"
        }
    },
    "userInterfaces": {
        "settings": {
            "embeds": {
                "settings": {
                    "title": "⚙️ Paramètres",
                    "description": "Vous pouvez modifier vos paramètres ici",
                    "unsetSetting": "Non défini"
                }
            },
            "components": {
                "selectSetting": "Modifier un paramètre",
                "defaultEditor": {
                    "title": "Modifier {name}"
                },
                "toggleEditor": {
                    "toggleOn": "Activer",
                    "toggleOff": "Désactiver"
                },
                "selector": {
                    "title": "Sélectionner {kind} pour {name}",
                    "kinds": {
                        "role": "un rôle",
                        "user": "un utilisateur",
                        "channel": "un salon",
                        "option": "une option"
                    }
                },
                "resetButton": "Réinitialiser {name}",
                "backButton": "Retour"
            }
        },
        "account": {
            "embeds": {
                "account": {
                    "title": "💰 Compte de _{user}_"
                },
                "inventory": {
                    "title": "💼 Inventaire de _{user}_"
                }
            },
            "components": {
                "showAccountButton": "Afficher le compte",
                "showInventoryButton": "Afficher l'inventaire"
            },
            "errors": {
                "accountEmpty": "❌ Le compte est vide",
                "inventoryEmpty": "❌ L'inventaire est vide"
            }
        },
        "shop": {
            "embeds": {
                "shop": {
                    "products": "Produits :",
                    "reservedTo": "Réservé au {role}",
                    "noProduct": "Aucun produit disponible ici",
                    "xProductsLeft": "restant: {x}",
                    "outOfStock": "En rupture de stock",
                    "price": "Prix :"
                }
            },
            "components": {
                "buyButton": "Acheter un produit",
                "showAccountButton": "Mon compte"
            }
        },
        "buy": {
            "messages": {
                "default": "Acheter {quantity}{product} de {shop}",
                "discountCode": "Code de réduction :",
                "price": "pour {price}",
                "success": "Vous avez acheté {quantity}{product} avec succès dans {shop} pour {price}"
            },
            "errorMessages": {
                "cantBuyHere": "Vous ne pouvez rien acheter dans cette boutique.",
                "notEnoughMoney": "Vous n'avez pas assez de {currency} pour acheter ce produit.",
                "productNoLongerAvailable": "Ce produit n'est plus disponible."
            },
            "components": {
                "buyButton": "Acheter",
                "discountCodeButton": "J'ai un code promo",
                "setDiscountCodeModal": {
                    "title": "Définir le code de réduction",
                    "input": "Code de réduction"
                }
            },
            "actionProducts": {
                "giveRole": {
                    "message": "Vous avez reçu le rôle {role}"
                },
                "giveCurrency": {
                    "message": "Vous avez reçu {amount} {currency}"
                }
            }
        }
    },
    "userFlows": {
        "accountGive": {
            "errorMessages": {
                "cantGiveMoney": "Impossible de donner de l'argent."
            },
            "messages": {
                "default": "Donner {amount} {currency} à {user}",
                "bulkGive": "Donner {amount} {currency} à tous les utilisateurs avec le rôle {role}",
                "success": "Vous avez donné avec succès {amount} {currency} à {user}",
                "bulkGiveSuccess": "Vous avez donné avec succès {amount} {currency} à tous les utilisateurs avec le rôle {role}"
            },
            "components": {
                "submitButton": "Valider"
            }
        },
        "accountTake": {
            "errorMessages": {
                "cantTakeMoney": "Impossible de prendre de l'argent."
            },
            "messages": {
                "default": "Prendre {amount} {currency} de {user}",
                "successfullyEmptied": "Vous avez vidé avec succès le compte de {user}",
                "success": "Vous avez pris avec succès {amount} {currency} de {user}"
            },
            "components": {
                "submitButton": "Valider",
                "takeAllButton": "Tout prendre",
                "emptyAccountButton": "Vider le compte"
            }
        },
        "currencyCreate": {
            "messages": {
                "success": "Vous avez crée avec succès la devise {currency}. \n-# Utilisez `/currencies-manage remove` pour la supprimer"
            }
        },
        "currencyRemove": {
            "errorMessages": {
                "cantRemoveCurrency": "⚠️ Impossible de supprimer {currency} ! Certains produits l'utilisent encore dans leur prix ou leur action."
            },
            "messages": {
                "default": "Supprimer {currency}, ⚠️ __**cela le retirera également des comptes des utilisateurices**__",
                "success": "Vous avez supprimé avec succès la devise {currency}"
            },
            "components": {
                "submitButton": "Supprimer la devise"
            }
        },
        "currencyEdit": {
            "messages": {
                "default": "Modifier {currency}.\n**Nouveau** {option}: {value}",
                "success": "Vous avez modifié avec succès la devise {currency}. \nNouveau {option}: {value}"
            },
            "components": {
                "submitButton": "Modifier la devise"
            },
            "editOptions": {
                "name": "nom",
                "emoji": "emoji"
            }
        },
        "productAdd": {
            "messages": {
                "default": "Ajouter un produit : {product} pour {price} dans {shop}",
                "success": "Vous avez ajouté avec succès le produit {product} à la boutique {shop}",
                "withAction": "avec l'action {action}",
                "action": "Action :",
                "actions": {
                    "giveRole": "donner le rôle {role}",
                    "giveCurrency": "donner {amount} {currency}"
                }
            },
            "components": {
                "submitButton": "Ajouter le produit",
                "setAmountButton": "Définir la quantité",
                "editAmountModalTitle": "Quantité"
            }
        },
        "productRemove": {
            "messages": {
                "shopSelectStage": "Supprimer un produit de : {shop}",
                "productSelectStage": "Supprimer le produit : {product} de {shop}",
                "success": "Vous avez supprimé avec succès le produit {product} de {shop}"
            },
            "components": {
                "submitButton": "Supprimer le produit"
            }
        },
        "productEdit": {
            "errorMessages": {
                "noShopsWithProducts": "Il n'y a aucune boutique avec des produits./n-# Utilisez `/shops-manage create` pour créer une boutique, et `/products-manage add` pour ajouter des produits"
            },
            "messages": {
                "shopSelectStage": "Modifier un produit de {shop}.\nNouveau {option} : {value}",
                "productSelectStage": "Modifier le produit : {product} de {shop}. \nNouveau {option} : {value}",
                "success": "Vous avez modifié avec succès le produit {product} de {shop}. \nNouveau {option}: {value}",
                "unlimited": "illimité"
            },
            "components": {
                "submitButton": "Modifier le produit"
            },
            "editOptions": {
                "name": "nom",
                "emoji": "emoji",
                "price": "prix",
                "description": "description",
                "stock": "stock"
            }
        },
        "shopCreate": {
            "messages": {
                "success": "Vous avez crée avec succès la boutique {shop}. \n-# Utilisez `/shops-manage remove` pour la supprimer"
            }
        },
        "shopRemove": {
            "messages": {
                "default": "Supprimer la boutique {shop}.\n⚠️ __**Cela supprimera également tous les produits de la boutique**__",
                "success": "Vous avez supprimé avec succès la boutique {shop}"
            },
            "components": {
                "submitButton": "Supprimer la boutique"
            }
        },
        "shopReorder": {
            "messages": {
                "default": "Mettre la position de {shop} à {position}",
                "success": "Vous avez placé {shop} à la position {position} avec succès"
            },
            "components": {
                "submitNewPositionButton": "Valider la position",
                "selectPosition": "Selectionner la position"
            }
        },
        "shopEdit": {
            "messages": {
                "default": "Modifier {shop}.\nNouveau {option}: {value}",
                "success": "Vous avez modifié avec succès la boutique {shop}. \nNouveau {option}: {value}"
            },
            "components": {
                "submitButton": "Modifier la boutique"
            },
            "editOptions": {
                "name": "nom",
                "emoji": "emoji",
                "description": "description",
                "reserved_to_role": "reservée au role"
            }
        },
        "shopChangeCurrency": {
            "messages": {
                "shopSelectStage": "Changer la devise de {shop}",
                "currencySelectStage": "Mettre la devise de {shop} à {currency}",
                "success": "Vous avez modifié la devise de {shop} en {currency} avec succès"
            },
            "components": {
                "submitButton": "Changer la devise"
            }
        },
        "discountCodeCreate": {
            "messages": {
                "default": "Créer un code promo pour la boutique {shop}.\n**Code**: {code}\nMontant: {amount}% de réduction",
                "success": "Vous avez crée avec succès le code promo {code} pour {shop} avec {amount}% de réduction"
            },
            "components": {
                "submitButton": "Créer le code promo"
            }
        },
        "discountCodeRemove": {
            "messages": {
                "shopSelectStage": "Supprimer un code promo de {shop}",
                "codeSelectStage": "Supprimer le code promo {code} de {shop}",
                "success": "Vous avez supprimé avec succès le code promo {code} de {shop}"
            },
            "components": {
                "discountCodeSelect": "Sélectionner un code promo",
                "submitButton": "Supprimer le code promo"
            }
        }
    }
} as const
export default locale
