# Refactoring plans

## Planned features - this branch

- [x] improve error handling (implement result pattern)
- [x] improve data access, add abstraction to avoid errors and repeated code
- [ ] branded IDs ? -> will be made once Zod validation is implemented
- [x] improve [folder structure](#folder-structure)

### folder structure

feature based folder structure

```
data
locales
src
├── app
│   ├── commands
│   │   ├── ...
│   │   └── ...
│   ├── events
│   │   ├── ...
│   │   └── ...
│   ├── deploy-commands.ts
│   └── start.ts
├── database
├── utils
├── tools
├── user-flows         
├── user-interfaces    
├── features
│   ├── currencies
│   ├── accounts
│   ├── shops
│   ├── products
│   └── settings
└── index.ts
```

inside the features folders:

```
features
└─── feature
    ├── database
    ├── utils
    ├── user-flows
    └── user-interfaces
```

-> use this to segment a little more the code
-> TODO : add eslint config to enforce this and prevent cross feature implementation
