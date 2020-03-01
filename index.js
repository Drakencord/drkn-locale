const i18n = require('./i18n')

const Localizer = new i18n()

Localizer.configure({
    autoReload: true,
    defaultLocale: 'en',
    syncFiles: true,
    updateFiles: true,
    locales: ['en', 'ru']
})

console.log(Localizer.translate('ru', 'file', 'ns'))