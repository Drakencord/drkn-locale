## Drkn-locale
Simple localization package
Files for locales: **.yaml**

## Usage
If you want to use this library, you can simply install
  - **npm**: `npm install drkn-locale`
  - **yarn**: `yarn add drkn-locale`

### Configure
```js
const drknLocale = require('./localization')
const path = require('path')

const locale = new drknLocale()
locale.configure({
   autoReload: false, // Auto reload changed files
   directory: path.join(__dirname, 'locales'), // Path to locales folder
   defaultLocale: 'en', // Default language
   locales: ['en', 'ru'], // List of languages for you app
   localeFiles: ['main'], // Set filenames for languages
   updateFiles: true, // Update files
   syncFiles: true // Auto sync files for all languages
 })
```

### Set language
```js
locale.setLocale('you locale') 
```

### Examples

#### Locale files
Example locale file 'locales/en/filename.yaml'
```yaml
user:
  username: 'Mark'
  id: '1'
  description: Default user description
```

Example locale file 'locales/ru/filename.yaml'
```yaml
user:
  username: 'Марк'
  id: '1'
  description: Обычное опиасние пользователя
 ```

#### Code
```js
// Used default language
locale.filename('user.username)
// Response: Mark

// Use specify language
// English
locale.setLocale('en')
locale.filename('user.username')
// Response: Mark

// Russian
locale.setLocale('ru')
locale.filename('user.username')
// Response: Марк
```
- If you no not specify the locale in the configuration, was be used default language
