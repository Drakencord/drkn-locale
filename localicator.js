const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')
const YAML = require('node-yaml')
const JSONPath = require('advanced-json-path')

module.exports = class Localizer {
    constructor() {
        this.autoReload = false
        this.directory = path.join(__dirname, 'locales')
        this.defaultLocale = 'en'
        this.locales = {}
        this.updateFiles = false
        this.syncFiles = false
    }

    configure(options) {
        this.locales = {}

        this.directory = (typeof options.directory === 'string') ? options.directory : path.join(__dirname, 'locales')
        this.updateFiles = (typeof options.updateFiles === 'boolean') ? options.updateFiles : true
        this.syncFiles = (typeof options.syncFiles === 'boolean') ? options.syncFiles : false
        this.defaultLocale = (typeof options.defaultLocale === 'string') ? options.defaultLocale : 'en'
        this.autoReload = (typeof options.autoReload === 'boolean') ? options.autoReload : false
        options.locales = options.locales || ['en']

        // Считываем существующие языки
        if (Array.isArray(options.locales)) {
            // Считываем каждую папку языка
            options.locales.forEach((locale) => {
                this.readFolder(locale)
                // Автоматически обновляем новые данные при изименении без перезагрузки
                if (this.autoReload) {
                    fs.watch(`${this.directory}/${locale}`, (event, filename) => {
                        let extensionRegex = new RegExp('.yaml' + '$', 'g')
                        let localeFile = filename.replace(extensionRegex, '')
                        if (localeFile && this.locales[locale].hasOwnProperty(localeFile)) this.readFile(locale, localeFile)
                    })
                }
            })
        }
    }

    // Перевод
    translate(locale, localeFile, string, skip) {
        // Проверяем синхронизацию файлов
        if (this.syncFiles) {
            this.syncAllFiles(localeFile, string)
        }

        // Если язык не указан
        if (locale === 'undefined') {
            locale = this.defaultLocale
        }

        // Если указанный язык не найден
        if (!this.locales[locale]) {
            this.readFolder(locale)
        }

        if (!this.locales[locale]) {
            locale = this.defaultLocale
            this.readFolder(locale)
        }

        // Если указанный файл не найден
        if (!localeFile) {
            return new Error('locale file not found')
        }

        if (!this.locales[locale][localeFile]) {
            this.readFile(locale, localeFile)
        }

        if (!string) {
            return new Error('locale value not found')
        }


        return this.getString(locale, localeFile, string)
    }

    // Инициализация/сихронизация перевода в файлах
    syncAllFiles(filename, string) {
        // Перебираем все папки
        let cache = {}

        for (let locale in this.locales) {
            // Путь к файлам
            let filePath = path.normalize(path.join(this.directory, locale, `${filename}.yaml`))

            // Пытаемся прочитать файлы с подходящим одинаковым именем у всех локализаций
            try {
                // Когда нашли файл - нужно проверить его содержимое
                let data = this.getString(locale, filename, string)
                
                if (!data) { 
                    console.log(locale, filename, string)
                    this.writeFile(locale, filename, string) 
                }
            } catch (e) {
                // Если не нашли файл - создаем
                fs.openSync(filePath, 'w')
            }
        }
    }

    getString(locale, filename, string) {
        let obj = this.locales[locale][filename]
        if (!obj) return false
        obj = JSONPath(obj, `$${string}`)

        if (!obj) return false
        return obj
    }

    setDefaultJson(string, object) {
        let data
        if (!object) data = {}
        else data = object
        string = string.replace(/[\[]/gm, '.').replace(/[\]]/gm, '')
        var keys = string.split('.'),
            last = keys.pop();

        keys.reduce(function (o, k) { return o[k] = o[k] || {}; }, data)[last] = 'locale not found'
        return data
    }

    getStringJson(locale, filename, string) {
        let obj = this.locales[locale][filename]
        if (!obj) return false
        string = string.split('.')[0]
        let Keys = Object.entries(obj).filter((key, value) => key[0] === string)[0]
        
        if (!Keys) return false
        return Keys
    }
    // Локализации
    setLocale(object, locale) {
        // Когда передается Object как Array => каждому передаем язык
        if (Array.isArray(object) && typeof locale === 'string') {
            for (let i = object.length - 1; i >= 0; i--) {
                this.setLocale(object[i], locale, true)
            }
            return this.getLocale(object[0])
        }

        // Задаем стандартные значения 
        let targetObject = object
        let targetLocale = locale
        // Если указан только язык - применяем на себя локализатор, а не объект
        if (locale === undefined && typeof object === 'string') {
            targetObject = this
            targetLocale = object
        }

        if (!object && !locale) {
            return new Error(`Not found 'object' or 'locale'`)
        }
        // Если указанного языка нет => ставим стандартный
        if (!this.locales[targetLocale]) {
            targetLocale = this.defaultLocale
        }

        // Передаем язык в объект
        targetObject.locale = this.locales[targetLocale] ? targetLocale : this.defaultLocale
        return this.getLocale(targetObject)
    }

    getLocale(object) {
        // Если указан обхъект
        if (object && object.locale) {
            return object.locale
        }
        // Если не указано ничего
        return this.locale || this.defaultLocale
    }

    getLocales() {
        return Object.keys(this.locales)
    }

    // Папки
    readFolder(locale) {
        if (!this.locales[locale]) {
            this.locales[locale] = {}
        }
        
        let LocaleFolder
        // Получаем руть к папке
        let FolderPath = path.normalize(path.join(this.directory, locale))
        
        try {
            // Считываем содержимое папки
            LocaleFolder = fs.readdirSync(FolderPath)
            // Обрабатываем каждый файл в папке
            LocaleFolder.forEach(f => {
                let extensionRegex = new RegExp('.yaml' + '$', 'g')
                let localeFile = f.replace(extensionRegex, '')
                this.readFile(locale, localeFile)
            })
        } catch (e) {
            // Если папки нет (но она отображается - переименовываем)
            if (fs.existsSync(FolderPath)) fs.renameSync(FolderPath, `${FolderPath}.invalid`)
            // И создаем новую
            this.writeFolder(locale)
        }
    }

    writeFolder(locale) {
        try { fs.lstatSync(path.join(this.directory, locale)) }
        catch (e) { fs.mkdirSync(path.join(this.directory, locale) )}
    }

    // Файлы
    readFile(locale, filename) {
        let LocaleFile
        // Получаем путь к файлу
        let FilePath = path.normalize(path.join(this.directory, locale, `${filename}.yaml`))

        try {
            // Считываем данные файла
            LocaleFile = YAML.readSync(FilePath, { encoding: 'utf8'})
            try {
                // Кидаем ярлык на данные
                this.locales[locale][filename] = LocaleFile
            } catch (e) {
                // Если вдруг не удалось
                console.log(`Failed create link to this.locales.${locale} from ${filename}`)
            }
        } catch (e) {
            // Если не удалось считать данные с файла проверяем на его наличие
            if (fs.existsSync(FilePath)) {
                // Если файл есть то переименовываем и сообщаем об этом
                console.log(`Invalid locale data from file '${locale}/${file}'`)
                fs.renameSync(FilePath, `${FilePath}.invalid`)
            }

            // Но если файла нет, то создаем его
            this.writeFile(locale, filename)
        }
    }

    writeFile(locale, filename, string) {
        let stats, FilePath
        // Если обновление файлов выключено (возращаем)
        if (!this.updateFiles) {
            return
        }
        // Проверяем на наличие папки языка
        try { stats = fs.lstatSync(path.join(this.directory, locale)) } 
        // Если ее нет - создаем
        catch (e) { fs.mkdirSync(path.join(this.directory, locale)) }
        
        // Если ярлыка в переменной нет на файл - создаем
        if (!this.locales[locale][filename]) {
            this.locales[locale][filename] = {}
        }

        // Записываем в файл данные
        try {
            // Получаем путь к файлу
            FilePath = path.normalize(path.join(this.directory, locale, `${filename}.yaml`))
            // Создаем временный файл и записываем в него
            let data
            if (string) data = this.setDefaultJson(string, this.locales[locale][filename])
            else data = this.locales[locale][filename]

            YAML.writeSync(`${FilePath}.tmp`, data, { encoding: 'utf8' })
            // Проверяем есть ли временный файл
            
            stats = fs.statSync(`${FilePath}.tmp`)
            // Если временный файл - это файл, тогда переименовываем его в стандартый тип
            if (stats.isFile()) { fs.renameSync(`${FilePath}.tmp`, FilePath) } 
            // Или выпускаем сообщени о неудаче
            else { console.log(`Can't write locales data to file '${locale}/${filename}'`) }
        } catch (e) {
            // При ошибке создания/записи оповещаем об этом
            console.log(`Writing error file '${locale}/${filename}'`, e)
        }
    }
}

