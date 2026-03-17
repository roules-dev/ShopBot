// TODO Shops hydration layer :

// receives a RawShop, returns a Shop
// which includes all the fields of RawShop + its ID

// also perform the following transformations :
// - products must become a Map<NanoId, Product> (*)



// (*) a ProductRaw becomes a Product :
// Product = ProductRaw & { item: Item }

// price becomes Array<Balance<Currency>>