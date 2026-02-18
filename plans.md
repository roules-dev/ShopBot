# Refactoring plans

## Planned features - this branch

- [ ] more verbose logging for debugging purposes
- [x] improve error handling (implement result pattern)
- [ ] improve data access, add abstraction to avoid errors and repeated code
- [ ] branded IDs ?
- [x] improve [folder structure](#folder-structure)
- [ ] Improve UI Implementation (no more "start" function - check feasibility first)

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
