# Refactoring plans

## Planned features - this branch
- [ ] more verbose logging for debugging purposes
- [ ] improve error handling (implement result pattern)
- [ ] improve data access, add abstraction to avoid errors and repeated code
- [ ] branded IDs ? 
- [ ] improve [folder structure](#folder-structure)
- [ ] Improve UI Implementation (no more "start" function - check feasibility first)


### folder structure
feature based folder structure
```
src
├── app
│   ├── commands
│   │   ├── ...
│   │   └── ...
│   ├── events
│   │   ├── ...
│   │   └── ...
│   └── deploy-commands.ts
├── database
├── utils
├── tools
├── components
├── user-flows         (not sure)
├── user-interfaces    (not sure)
├── features
│   ├── currencies
│   ├── accounts
│   ├── shops
│   ├── products
│   └── settings
├── locales
└── index.ts
```

inside the features folders:

```
features
└─── feature
    ├── database
    ├── components
    ├── utils
    ├── user-flows
    └── user-interfaces
```
-> use this to segment a little more the code
-> TODO : add eslint config to enforce this and prevent cross feature implementation