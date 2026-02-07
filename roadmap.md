# RoadMap and planned features

## Roadmap
1. ~~products with a set stock~~
2. ability to buy a certain amount of a product
3. removing items for inventories - and bulk removing of an item.
4. separate channel logging
5. item/currency limit option
4. api

## Planned features

### Features
- [ ] API to automate actions like: filling accounts; managing currencies, shops and products 
- [x] Shops reserved for specific roles
- [x] New settings system
- [x] Products with a set stock
- [ ] ability to buy a set amount
- [x] multi language support 
- [ ] permanently displayed shops
- [ ] allowing users to display inventory publicly
- [ ] separate logging channel for admin actions
- [ ] multi-currency items (and thus no more shop-wide currency / leave it optional ?)
- [ ] item/currency limit option


### Code refactoring
- [x] Add pagination at the level of user interface class
- [ ] Improve UI Implementation (no more "start" function - check feasibility first)
- [x] switching from uuid to nanoid, for performance improvement 
- [ ] docker container
- [ ] improve internationalisation (add fallback for missing translations ...)
- [ ] more verbose logging for debugging purposes
- [ ] improve error handling (implement result pattern)
- [ ] improve data access, add abstraction to avoid errors and repeated code
- [ ] branded IDs ? 
- [ ] improve folder structure (implement feature base folder structure)

