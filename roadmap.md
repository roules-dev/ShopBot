# RoadMap and planned features

## Roadmap

1. ~~products with a set stock~~
1. ability to buy a certain amount of a product ([#17](https://github.com/roules-dev/ShopBot/issues/17))
1. removing items for inventories - and bulk removing of an item. ([#14](https://github.com/roules-dev/ShopBot/issues/14))
1. admin actions logging ([#18](https://github.com/roules-dev/ShopBot/issues/18))
1. item/currency limit option ([#28](https://github.com/roules-dev/ShopBot/issues/28))
1. api

## Planned features

### Features

- [ ] API to automate actions like: filling accounts; managing currencies, shops and products
- [x] Shops reserved for specific roles
- [x] New settings system
- [x] Products with a set stock
- [ ] ability to buy a set amount ([#17](https://github.com/roules-dev/ShopBot/issues/17))
- [x] multi language support
- [ ] permanently displayed shops ([#13](https://github.com/roules-dev/ShopBot/issues/13))
- [ ] allowing users to display inventory publicly ([#13](https://github.com/roules-dev/ShopBot/issues/13))
- [ ] log admin actions to the log channel ([#18](https://github.com/roules-dev/ShopBot/issues/18))
- [ ] multi-currency items (and thus no more shop-wide currency / leave it optional ?) ([#13](https://github.com/roules-dev/ShopBot/issues/13))
- [ ] item/currency limit option ([#28](https://github.com/roules-dev/ShopBot/issues/28))

### Code refactoring

- [x] Add pagination at the level of user interface class
- [ ] Improve UI Implementation (no more "start" function - check feasibility first)
- [x] switching from uuid to nanoid, for performance improvement
- [ ] docker container
- [ ] improve internationalisation (reimplement in a more modular way,add fallback for missing translations)
- [x] improve error handling (implement result pattern)
- [x] improve data access, add abstraction to avoid errors and repeated code
- [ ] branded IDs ? -> will be made once Zod validation is implemented
- [x] improve folder structure (implement feature base folder structure)
