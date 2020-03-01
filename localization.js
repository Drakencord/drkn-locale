const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')
const YAML = require('node-yaml')
const JSONPath = require('advanced-json-path')
const Mustache = require('mustache')
const Yaml = require('yaml')

module.exports = class Localizer {
    constructor() {
        this.autoReload = false
        this.directory = path.join(__dirname, 'locales')
        this.defaultLocale = 'en'
        this.locales = {}
        this.localeFiles = {}
        this.updateFiles = false
        this.syncFiles = false
    }

    configure(options) {
        this.locales = {}
        this.localeFiles = {}

        this.directory = (typeof options.directory === 'string') ? options.directory : path.join(__dirname, 'locales')
        this.updateFiles = (typeof options.updateFiles === 'boolean') ? options.updateFiles : true
        this.syncFiles = (typeof options.syncFiles === 'boolean') ? options.syncFiles : false
        this.defaultLocale = (typeof options.defaultLocale === 'string') ? options.defaultLocale : 'en'
        this.autoReload = (typeof options.autoReload === 'boolean') ? options.autoReload : false
        options.locales = options.locales || ['en']

        if (Array.isArray(options.locales)) {
            options.locales.forEach((locale) => {
                let folder = this.readFolder(locale)

                if (Array.isArray(options.localeFiles)) {
                    options.localeFiles.forEach((file) => {
                        let filePath = path.normalize(path.join(this.directory, locale, file+'.yaml'))
                        if (fs.existsSync(filePath)) return
                        fs.openSync(filePath, 'w')
                    })
                }

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

    translateFromFile(filename, string, object) {
        let locale = this.locale ? this.locale : this.defaultLocale
        let file = filename
        let result = this.translate(locale, file, string)
        if (object && typeof object === 'object') {
            if ((/{{.*}}/).test(result)) { 
                result = Mustache.render(result, object) 
            }
        }

        return result 
    }

    translate(locale, localeFile, string, skip) {
        if (this.syncFiles) {
            this.syncAllFiles(localeFile, string)
        }

        if (locale === 'undefined') {
            locale = this.defaultLocale
        }

        if (!this.locales[locale]) {
            this.readFolder(locale)
        }

        if (!this.locales[locale]) {
            locale = this.defaultLocale
            this.readFolder(locale)
        }

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

    syncAllFiles(filename, string) {
        let cache = {}

        for (let locale in this.locales) {
            let filePath = path.normalize(path.join(this.directory, locale, `${filename}.yaml`))
            try {
                let data = this.getString(locale, filename, string)
                if (!data) this.writeFile(locale, filename, string) 
            } catch (e) {
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

    setDefaultJson(string, object, locale) {
        let data
        if (!object) data = {}
        else data = object
        string = string.replace(/[\[]/gm, '.').replace(/[\]]/gm, '')
        let keys = string.split('.'),
            last = keys.pop();
        
        keys.reduce(function (o, k) { return o[k] = o[k] || {}; }, data)[last] = `${locale} locale for \`${last}\` not found`
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

    setLocale(object, locale) {
        if (Array.isArray(object) && typeof locale === 'string') {
            for (let i = object.length - 1; i >= 0; i--) {
                this.setLocale(object[i], locale, true)
            }
            return this.getLocale(object[0])
        }

        let targetObject = object
        let targetLocale = locale

        if (locale === undefined && typeof object === 'string') {
            targetObject = this
            targetLocale = object
        }

        if (!object && !locale) {
            return new Error(`Not found 'object' or 'locale'`)
        }

        if (!this.locales[targetLocale]) {
            targetLocale = this.defaultLocale
        }

        targetObject.locale = this.locales[targetLocale] ? targetLocale : this.defaultLocale
        return this.getLocale(targetObject)
    }

    getLocale(object) {
        if (object && object.locale) {
            return object.locale
        }

        return this.locale || this.defaultLocale
    }

    getLocales() {
        return Object.keys(this.locales)
    }


    readFolder(locale) {
        if (!this.locales[locale]) {
            this.locales[locale] = {}
        }
        
        let LocaleFolder
        let FolderPath = path.join(this.directory, locale)
        
        try {
            LocaleFolder = fs.readdirSync(FolderPath)
            if (LocaleFolder) {
                LocaleFolder.forEach(f => {
                    let extensionRegex = new RegExp('.yaml' + '$', 'g')
                    let localeFile = f.replace(extensionRegex, '')
                    this.readFile(locale, localeFile)
                })
            }
            
        } catch (e) {
            if (fs.existsSync(FolderPath)) fs.renameSync(FolderPath, `${FolderPath}.invalid`)
            this.writeFolder(locale)
        }
    }

    writeFolder(locale) {
        try { fs.lstatSync(path.join(this.directory, locale)) }
        catch (e) { fs.mkdirSync(path.join(this.directory, locale) )}
    }

    readFile(locale, filename) {
        let LocaleFile
        let FilePath = path.normalize(path.join(this.directory, locale, `${filename}.yaml`))
        
        try {
            LocaleFile = fs.readFileSync(FilePath, { encoding: 'utf8'})
            let File = yaml.safeLoad(LocaleFile)
            try {
                this.locales[locale][filename] = File
                this[filename] = (string, object) => {
                    return this.translateFromFile(filename, string, object)
                }
            } catch (e) {
                console.log(`Failed create link to this.locales.${locale} from ${filename}`)
            }
        } catch (e) {
            if (fs.existsSync(FilePath)) {
                console.log(`Invalid locale data from file '${locale}/${filename}'`)
                fs.renameSync(FilePath, `${FilePath}.invalid`)
            }
            this.writeFile(locale, filename)
        }
    }

    writeFile(locale, filename, string) {
        let stats, FilePath
        if (!this.updateFiles) {
            return
        }

        try { stats = fs.lstatSync(path.join(this.directory, locale)) } 
        catch (e) { fs.mkdirSync(path.join(this.directory, locale)) }
        
        if (!this.locales[locale][filename]) {
            this.locales[locale][filename] = {}
        }

        try {
            FilePath = path.join(this.directory, locale, `${filename}.yaml`)
            let data
            if (string) data = this.setDefaultJson(string, this.locales[locale][filename], locale)
            else data = this.locales[locale][filename]
                
            data = Yaml.stringify(data)
            fs.appendFileSync(`${FilePath}.tmp`, data, { encoding: 'utf8' })
            stats = fs.statSync(`${FilePath}.tmp`)
            if (stats.isFile()) { fs.renameSync(`${FilePath}.tmp`, FilePath) } 
            else { console.log(`Can't write locales data to file '${locale}/${filename}'`) }
        } catch (e) {
            console.log(`Writing error file '${locale}/${filename}'`, e)
        }
    }
}

