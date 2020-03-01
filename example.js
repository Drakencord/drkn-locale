const Locale = require('./localization')
const path = require('path')

let i18n = new Locale()

// Configure
i18n.configure({
	// Auto reloads when files changed
	autoReload: true,
	// Locale folder
    directory: path.join(__dirname, 'locales'),
    // Default locale
    defaultLocale: 'en',
    // Locale languages
    locales: ['en', 'ru'],
    // Files for locales
    localeFiles: ['example'],
    // Update Files
    updateFiles: true,
    // Sync files when you use function
    syncFiles: true
})

let LocaleFileExample = {
	name: "Frank",
	country: "My county {{country}}"
}
// Change language
i18n.setLocale('en')

// Use locale from command
i18n.example('name') // result: Frank
// Use locale with vars from command
i18n.example('name', { country: 'China' }) // My county China