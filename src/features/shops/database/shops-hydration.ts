// TODO Shops hydration layer :

// receives a RawShop, returns a Shop
// which includes all the fields of RawShop + its ID

// also perform the following transformations :
// - products must become a Map<NanoId, Product> (*)
// - (maybe) discountCodes can become a Map<string, number>



// (*) a ProductRaw becomes a Product :
// Product = ProductRaw & { item: Item }
// or      = ProductRaw & Item ?

// price becomes a Map<NanoId, number>
// or maybe Array<{currency: Currency, amount: number}>
// ie Array<Balance<Currency>>