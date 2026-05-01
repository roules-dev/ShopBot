# ShopBot v3 Planning

## Planned Features
1. ✅ ~~ability to buy a certain amount of a product ([#17](https://github.com/roules-dev/ShopBot/issues/17))~~
1. removing items for inventories - and bulk removing of an item. ([#14](https://github.com/roules-dev/ShopBot/issues/14))
1. ✅ ~~admin actions logging ([#18](https://github.com/roules-dev/ShopBot/issues/18))~~
1. 🔄️ complete rework of the product system (new ITEMS database independant of shops, items can be used in multiple shops, with shop specific stock, price and action)
1. ✅ multi-currency prices ([#13](https://github.com/roules-dev/ShopBot/issues/13))

## Code Refactoring
<!-- need for Identity Map ?? -->
1. 🔄️ ~~complete DAL rework : Zod schema validation for raw data, readonly data, on demand hydratation of data~~, partial cache (redis ?)
1. 🔄️ better separation of concerns : DAL (which will more regorously implement CRUD operations) and services for non-DAL operations (this will make the code more maintainable, and ready for future API implementation), UI should not be responsible for verifying command data
1. 🔄️ write tests



## ✅ Complete rework of how data flows in the app
So far, data has been flowing in a quite uncontrolled manner, databases were being instanciated separately though relying on each other, UI was calling DB mutations directly, there were circular imports... This is why the dataflow has been totally rethinked, to be more scalable and maintainable.

following the general schema  
```
UI -> Core (instanciates, orchestrates and injects databases) -> features adapters and services -> DB mutations
```

how databases are used is also being refactored to be way more reliable and to make the transition to a new DB system easier if need be.
```
Raw data -> Schema validation -> Repo -> Hydrator -> App
```

the idea is to hydrate (perform dereferencing and transforming raw objects to rich data structures) only what's being actively used.
This avoids a lot of issues and potential bugs that the previous system had. 