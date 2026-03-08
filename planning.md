# ShopBot v3 Planning

## Planned Features
1. ~~ability to buy a certain amount of a product ([#17](https://github.com/roules-dev/ShopBot/issues/17))~~
1. emoving items for inventories - and bulk removing of an item. ([#14](https://github.com/roules-dev/ShopBot/issues/14))
1. ~~admin actions logging ([#18](https://github.com/roules-dev/ShopBot/issues/18))~~
1. complete rework of the product system (new ITEMS database independant of shops, items can be used in multiple shops, with shop specific stock and price)
1. multi-currency prices ([#13](https://github.com/roules-dev/ShopBot/issues/13))

## Code Refactoring
1. complete DAL rework : Zod schema validation for raw data, on demand hydratation of data, partial cache (redis ?)
1. better separation of concerns : DAL (which will more regorously implement CRUD operations) and services for non-DAL operations (this will make the code more maintainable, and ready for future API implementation)
1. write tests