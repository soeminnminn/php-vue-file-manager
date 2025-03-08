// https://github.com/amitkhare/easy-translator-vue
import { vsprintf } from "./sprintf.js";

class Lang {
  /**
   * @param {{ locales: object, locale: string, fallbackLocale: string, rootLocale: string }} [opts={}] 
   */
  constructor(opts = {}) {
    this.options = {
      locales: null,
      locale: "en",
      fallbackLocale: "en",
      rootLocale: "en"
    };

    this.setOptions(opts || {});
  }

  /**
   * @param {{ locales: object, locale: string, fallbackLocale: string, rootLocale: string }} options 
   */
  setOptions(options) {
    if (options.locales) this.options.locales = options.locales;
    if (options.locale) this.options.rootLocale = options.locale;
    if (options.fallbackLocale) {
      this.options.fallbackLocale = options.fallbackLocale;
    }
  }

  /**
   * @param {string} key 
   * @returns {string}
   */
  lang(key) {
    let str = this.formatString(key);
    if (this.options.locales[this.options.locale][key]) {
      str = this.options.locales[this.options.locale][key];
    } else if (this.options.locales[this.options.fallbackLocale][key]) {
      str = this.options.locales[this.options.fallbackLocale][key];
    }
    return str;
  }

  /**
   * @param {string} key 
   * @param {Array<string>} [replacements=[]] 
   * @param {boolean} [translateReplacements=true] 
   * @returns {string}
   */
  langWithReplace(key, replacements = [], translateReplacements = true) {
    const mainstring = this.lang(key);

    if (replacements && translateReplacements) {
      replacements = replacements.map(x => {
        return this.lang(x.toUpperCase());
      });
    }

    return vsprintf(mainstring, replacements);
  }

   /**
   * @param {string} key 
   * @param {Array<string>|null} [replacements=null] 
   * @param {boolean} [translateReplacements=true] 
   * @returns {string}
   */
  translate(key, replacements = null, translateReplacements = true) {
    key = key.toUpperCase().replaceAll(/\s/g, '_').replaceAll(/[^A-Z0-9_\-]/g, '');
    return this.langWithReplace(key, replacements, translateReplacements);
  }

  formatString(key) {
    let k = key.toLowerCase();
    k = k.replace("_", " ");
    k = k.replace("-", " ");
    k = k.charAt(0).toUpperCase() + k.slice(1);
    return k;
  }

   /**
   * @param {string} key 
   * @param {Array<string>|null} [replacements=null] 
   * @param {boolean} [translateReplacements=true] 
   * @param {boolean} [setLang=false] 
   * @returns {string}
   */
  $t(key, replacements = null, translateReplacements = true, setLang = false) {
    if (setLang) {
      this.options.locale = setLang;

    } else {
      this.options.locale = this.options.rootLocale;
    }
  
    return this.translate(key, replacements, translateReplacements);
  }
}

/**
 * @param {{ locales: object, locale: string, fallbackLocale: string, rootLocale: string }} options 
 */
export default function(options) {
  const lang = new Lang(options);

  const api = (key, replacements = null, translateReplacements = true, setLang = false) => {
    return lang.$t.call(lang, key, replacements, translateReplacements, setLang);
  };

  function install(app) {
    app.config.globalProperties.$t = api;
  }

  return {
    install
  };
}