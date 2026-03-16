// TODO Items hydration layer:
// receives a RawItem, returns an Item
// which includes all the fields of RawItem + its ID

// if the item has an action, it should also perform the following transformations:
// - give-role: nothing (probably not a good idea to fetch Role from API at hydration time)
// - give-currency: in the options, remove currencyId and replace with currency, fetched from the currencies