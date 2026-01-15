// ============================================
// VOCALIA INTERNATIONAL - LANGUAGE MANAGER
// Gestion multilingue FR/EN/CN/JP
// ============================================

class LanguageManager {
    constructor() {
        this.currentLang = 'fr'; // Défaut temporaire
        this.storageKey = 'vocalia_language';
        this.supportedLanguages = {
            fr: { name: 'Français', flag: '🇫🇷', code: 'FR' },
            en: { name: 'English', flag: '🇬🇧', code: 'EN' },
            cn: { name: '中文', flag: '🇨🇳', code: 'CN' },
            jp: { name: '日本語', flag: '🇯🇵', code: 'JP' }
        };
    }

    /**
     * Initialisation - Détecte ou charge la langue
     */
    init() {
        console.log('🔄 Initialisation LanguageManager...');
        
        // 1. Priorité : localStorage
        const savedLang = localStorage.getItem(this.storageKey);
        
        if (savedLang && this.supportedLanguages[savedLang]) {
            this.currentLang = savedLang;
            console.log(`✅ Langue chargée depuis localStorage: ${this.currentLang}`);
        } 
        // 2. Détection navigateur
        else {
            const browserLang = navigator.language.split('-')[0];
            
            if (this.supportedLanguages[browserLang]) {
                this.currentLang = browserLang;
            } else {
                this.currentLang = 'en'; // Fallback international
            }
            
            console.log(`🌐 Langue détectée: ${this.currentLang}`);
            this.saveLang(this.currentLang);
        }
        
        return this.currentLang;
    }

    /**
     * Obtenir la langue actuelle
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Obtenir les infos de la langue actuelle
     */
    getCurrentLanguageInfo() {
        return this.supportedLanguages[this.currentLang];
    }

    /**
     * Changer la langue
     */
    setLanguage(langCode) {
        if (!this.supportedLanguages[langCode]) {
            console.warn(`⚠️ Langue non supportée: ${langCode}`);
            return false;
        }

        this.currentLang = langCode;
        this.saveLang(langCode);
        
        console.log(`🌐 Langue changée: ${langCode}`);
        
        // Mettre à jour l'UI
        this.updateUI();
        
        // Event personnalisé
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: langCode } 
        }));
        
        return true;
    }

    /**
     * Sauvegarder la langue
     */
    saveLang(langCode) {
        localStorage.setItem(this.storageKey, langCode);
        document.documentElement.lang = langCode;
    }

    /**
     * Traduire une clé
     */
    translate(key, params = {}) {
        if (!window.TRANSLATIONS) {
            console.error('❌ TRANSLATIONS non chargé');
            return key;
        }

        let translation = window.TRANSLATIONS[this.currentLang]?.[key];
        
        // Fallback anglais si traduction manquante
        if (!translation) {
            translation = window.TRANSLATIONS['en']?.[key];
            if (!translation) {
                console.warn(`⚠️ Traduction manquante: "${key}"`);
                return key;
            }
        }
        
        // Remplacer les paramètres {name}, {count}, etc.
        return translation.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }

    /**
     * Alias court
     */
    t(key, params = {}) {
        return this.translate(key, params);
    }

    /**
     * Mettre à jour toute l'UI
     */
    updateUI() {
        console.log(`🔄 Mise à jour UI: ${this.currentLang}`);
        
        // 1. Éléments avec data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            
            // Éviter d'écraser les éléments avec compteurs dynamiques
            const hasCounters = element.querySelector('[id$="Count"]') || 
                               element.querySelector('[id$="Limit"]');
            
            if (!hasCounters) {
                element.textContent = this.t(key);
            }
        });

        // 2. Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // 3. Titres (title attribute)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // 4. Mettre à jour les sélecteurs de langue
        this.updateLanguageSelectors();
        
        console.log(`✅ UI mise à jour`);
    }

    /**
     * Mettre à jour les sélecteurs de langue
     */
    updateLanguageSelectors() {
        const info = this.getCurrentLanguageInfo();
        
        // Sélecteur app
        const currentFlag = document.getElementById('currentFlag');
        const currentLangCode = document.getElementById('currentLangCode');
        
        if (currentFlag) currentFlag.textContent = info.flag;
        if (currentLangCode) currentLangCode.textContent = info.code;
        
        // Sélecteur vitrine
        const currentFlagVitrine = document.getElementById('currentFlagVitrine');
        const currentLangCodeVitrine = document.getElementById('currentLangCodeVitrine');
        
        if (currentFlagVitrine) currentFlagVitrine.textContent = info.flag;
        if (currentLangCodeVitrine) currentLangCodeVitrine.textContent = info.code;
    }

    /**
     * Formater une date selon la langue
     */
    formatDate(date, options = {}) {
        const localeMap = {
            fr: 'fr-FR',
            en: 'en-US',
            cn: 'zh-CN',
            jp: 'ja-JP'
        };
        
        const locale = localeMap[this.currentLang] || 'en-US';
        const defaultOptions = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        
        return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options })
            .format(new Date(date));
    }

    /**
     * Formater un nombre selon la langue
     */
    formatNumber(number) {
        const localeMap = {
            fr: 'fr-FR',
            en: 'en-US',
            cn: 'zh-CN',
            jp: 'ja-JP'
        };

        const locale = localeMap[this.currentLang] || 'en-US';
        return new Intl.NumberFormat(locale).format(number);
    }

    /**
     * Injecter les styles CSS pour le sélecteur de langue
     */
    injectStyles() {
        // Injecte les styles CSS nécessaires pour le changement de langue
        // Pour l'instant, méthode vide car aucun style spécifique n'est requis
        console.log('✅ Language styles injected');
    }

    /**
     * Créer le sélecteur de langue (HTML dynamique)
     * Utilisé pour l'injecter dans register.html et autres pages
     */
    createLanguageSelector() {
        const container = document.createElement('div');
        container.className = 'login-language-selector';

        const info = this.getCurrentLanguageInfo();

        // Bouton principal
        const button = document.createElement('button');
        button.className = 'language-btn-login';
        button.id = 'currentLanguageBtn';
        button.onclick = toggleLanguageDropdown;
        button.innerHTML = `
            <span id="currentFlag">${info.flag}</span>
            <span id="currentLangCode">${info.code}</span>
            <span class="arrow">▼</span>
        `;

        // Dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'language-dropdown-login';
        dropdown.id = 'languageDropdown';
        dropdown.style.display = 'none';

        // Options de langue
        Object.keys(this.supportedLanguages).forEach(langCode => {
            const lang = this.supportedLanguages[langCode];
            const option = document.createElement('button');
            option.className = 'lang-option';
            option.onclick = () => changeLanguage(langCode);
            option.innerHTML = `${lang.flag} <span>${lang.name}</span>`;
            dropdown.appendChild(option);
        });

        container.appendChild(button);
        container.appendChild(dropdown);

        console.log('✅ Language selector created');
        return container;
    }
}

// ============================================
// FONCTIONS GLOBALES POUR LES DROPDOWNS
// ============================================

/**
 * Toggle dropdown langue (app)
 */
function toggleLanguageDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    const btn = document.getElementById('currentLanguageBtn');
    
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    btn?.classList.toggle('active', !isVisible);
}

/**
 * Toggle dropdown langue (vitrine)
 */
function toggleLanguageDropdownVitrine() {
    const dropdown = document.getElementById('languageDropdownVitrine');
    const btn = document.getElementById('currentLanguageBtnVitrine');
    
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    btn?.classList.toggle('active', !isVisible);
}

/**
 * Changer la langue (app)
 */
function changeLanguage(langCode) {
    if (window.languageManager) {
        window.languageManager.setLanguage(langCode);
    }
    
    // Fermer le dropdown
    const dropdown = document.getElementById('languageDropdown');
    if (dropdown) dropdown.style.display = 'none';
    
    const btn = document.getElementById('currentLanguageBtn');
    if (btn) btn.classList.remove('active');
}

/**
 * Changer la langue (vitrine)
 */
function changeLanguageVitrine(langCode) {
    if (window.languageManager) {
        window.languageManager.setLanguage(langCode);
    }
    
    // Fermer le dropdown
    const dropdown = document.getElementById('languageDropdownVitrine');
    if (dropdown) dropdown.style.display = 'none';
    
    const btn = document.getElementById('currentLanguageBtnVitrine');
    if (btn) btn.classList.remove('active');
}

/**
 * Fermer les dropdowns au clic extérieur
 */
document.addEventListener('click', (e) => {
    // App dropdown
    const appDropdown = document.getElementById('languageDropdown');
    const appBtn = document.getElementById('currentLanguageBtn');
    
    if (appDropdown && appBtn && 
        !appDropdown.contains(e.target) && 
        !appBtn.contains(e.target)) {
        appDropdown.style.display = 'none';
        appBtn.classList.remove('active');
    }
    
    // Vitrine dropdown
    const vitrineDropdown = document.getElementById('languageDropdownVitrine');
    const vitrineBtn = document.getElementById('currentLanguageBtnVitrine');
    
    if (vitrineDropdown && vitrineBtn && 
        !vitrineDropdown.contains(e.target) && 
        !vitrineBtn.contains(e.target)) {
        vitrineDropdown.style.display = 'none';
        vitrineBtn.classList.remove('active');
    }
});

// ============================================
// INITIALISATION AUTO
// ============================================

// Créer l'instance globale
window.languageManager = new LanguageManager();

// Fonction helper globale
window.t = function(key, params = {}) {
    return window.languageManager ? window.languageManager.t(key, params) : key;
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageManager;
}