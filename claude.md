# VOCALIA INTERNATIONAL - Guide Développeur

## 🎯 MISSION PRINCIPALE

**Internationaliser complètement VOCALIA en 4 langues : 🇫🇷 FR, 🇬🇧 EN, 🇨🇳 CN, 🇯🇵 JP**

Ce projet est la **version internationale** de VOCALIA France. Il s'agit d'un fork complet avec son propre déploiement, sa propre base Supabase, mais certaines traductions sont incomplètes ou buggées.

---

## 👤 CONTEXTE DÉVELOPPEUR

**Développeur** : Andrea CIECHELSKI  
**Secteur** : Commercial itinérant (métallurgie/inox)  
**Stack préférée** : Vanilla JavaScript (pas de frameworks)  
**Environnement** : macOS, VS Code, Terminal zsh

---

## 🏗️ ARCHITECTURE DU PROJET

### Structure des fichiers

```
VOCALIA-international/
│
├── 📁 vitrine BoostlyAI international/
│   ├── index.html                    # Page d'accueil BoostlyAI
│   ├── vocalia.html                  # Page produit Vocalia
│   ├── meetia.html                   # Page produit Meetia
│   ├── kinesia.html                  # Page produit Kinesia
│   ├── faq.html                      # FAQ
│   ├── legal.html                    # Mentions légales
│   ├── privacy.html                  # Politique de confidentialité
│   ├── terms.html                    # CGU
│   │
│   └── css/
│       ├── variables.css             # Variables design system
│       ├── boostly.css              # Styles vitrine
│       ├── product-page.css         # Styles pages produits
│       └── legal-pages.css          # Styles pages légales
│
└── 📁 VOCALIA international/
    ├── app.html                      # Application principale (après login)
    ├── register.html                 # Page d'inscription
    ├── index.html                    # Redirection vers app.html
    │
    ├── pages/
    │   ├── success.html              # Paiement Stripe réussi
    │   └── cancel.html               # Paiement Stripe annulé
    │
    ├── css/
    │   ├── styles.css                # Styles app principale
    │   └── register.css              # Styles page inscription
    │
    ├── js/
    │   ├── app.js                    # 🔴 Logique principale app
    │   ├── audio-manager.js          # Gestion enregistrement audio
    │   ├── data-manager.js           # CRUD rapports (Supabase)
    │   ├── profile-manager.js        # Gestion profil utilisateur
    │   │
    │   ├── config.js                 # Config webhook n8n
    │   ├── supabase-config.js        # Config Supabase
    │   ├── stripe-config.js          # Config Stripe
    │   │
    │   ├── language-manager.js       # 🟡 Système i18n (à corriger)
    │   ├── translations.js           # 🟡 Dictionnaire (incomplet)
    │   │
    │   ├── register.js               # Logique inscription
    │   ├── utils.js                  # Utilitaires
    │   └── supabase_min.js           # Librairie Supabase
    │
    ├── manifest.json                 # PWA manifest
    ├── service-worker.js             # Service Worker PWA
    └── claude.md                     # 👈 CE FICHIER
```

---

## 🌍 SYSTÈME DE TRADUCTION ACTUEL

### Fichiers clés

#### 1. `translations.js`
- **État** : Fonctionnel mais **incomplet**
- **Structure** :
```javascript
const TRANSLATIONS = {
    fr: { /* traductions françaises */ },
    en: { /* traductions anglaises - INCOMPLET */ },
    cn: { /* traductions chinoises - INCOMPLET */ },
    jp: { /* traductions japonaises - INCOMPLET */ }
};
```

#### 2. `language-manager.js`
- **État** : Fonctionnel mais **quelques bugs**
- **Classe principale** : `LanguageManager`
- **Méthodes importantes** :
  - `init()` : Initialise la langue (localStorage ou détection navigateur)
  - `setLanguage(langCode)` : Change la langue
  - `translate(key, params)` ou `t(key, params)` : Traduit une clé
  - `updateUI()` : Met à jour tous les éléments `[data-i18n]`

#### 3. Utilisation dans le HTML
```html
<!-- Texte simple -->
<h1 data-i18n="app.welcome">Bienvenue</h1>

<!-- Placeholder -->
<input data-i18n-placeholder="app.search" placeholder="Rechercher...">

<!-- Title attribute -->
<button data-i18n-title="app.close" title="Fermer">❌</button>
```

---

## 📋 ÉTAT ACTUEL DES TRADUCTIONS

### ✅ Ce qui est traduit (partiellement)
- **App VOCALIA** (`app.html`) : ~70% traduit
  - Navigation ✅
  - Pages principales ✅
  - **Modals** : ❌ Certains non traduits
  - Messages d'erreur : ⚠️ Incomplet

### ❌ Ce qui n'est PAS traduit
- **Vitrine BoostlyAI complète** (0%)
  - index.html
  - vocalia.html
  - meetia.html
  - kinesia.html
  - faq.html
  - legal.html
  - privacy.html
  - terms.html

- **Pages annexes VOCALIA**
  - success.html (paiement réussi)
  - cancel.html (paiement annulé)

---

## 🎯 OBJECTIFS PRIORITAIRES

### Phase 1 : Corriger et compléter le système i18n
1. **Auditer** `translations.js` et `language-manager.js`
2. **Corriger les bugs** identifiés
3. **Compléter les traductions manquantes** dans l'app
4. **Traduire tous les modals** et messages dynamiques

### Phase 2 : Traduire la vitrine BoostlyAI
1. Ajouter les clés de traduction pour toutes les pages vitrine
2. Intégrer le système i18n dans les pages HTML vitrine
3. Créer un sélecteur de langue cohérent

### Phase 3 : Pages annexes
1. Traduire `success.html` et `cancel.html`
2. S'assurer que la langue persiste après paiement

---

## ⚠️ CONTRAINTES CRITIQUES

### 🚫 NE PAS TOUCHER
- **Fonctionnalités métier existantes** :
  - ✅ Authentification Supabase
  - ✅ Enregistrement audio
  - ✅ Envoi webhook n8n
  - ✅ Système de rapports (CRUD)
  - ✅ Génération PDF
  - ✅ Paiements Stripe

**Règle d'or** : Dans un premier temps, **UNIQUEMENT la traduction**. Ne pas modifier la logique métier.

### 📐 CSS
- **Desktop** : Ne pas modifier
- **Mobile** : Uniquement si nécessaire pour le sélecteur de langue
- Utiliser les variables CSS existantes dans `variables.css`

---

## 🔧 CONFIGURATION TECHNIQUE

### Supabase
```javascript
// supabase-config.js
const SUPABASE_CONFIG = {
    url: 'https://oxgouagsxwwynvyzzajs.supabase.co',
    anonKey: 'eyJhbGc...' // Clé complète dans le fichier
};
```

### Webhook n8n
```javascript
// config.js
const CONFIG = {
    N8N_WEBHOOK_URL: 'https://andreaprogra.app.n8n.cloud/webhook/88303112...',
    N8N_TRANSLATE_WEBHOOK_URL: 'https://andreaprogra.app.n8n.cloud/webhook/translate-report'
};
```

Le workflow de traduction de rapports est **déjà fonctionnel** côté n8n.

### Stripe
```javascript
// stripe-config.js
const STRIPE_CONFIG = {
    publishableKey: 'pk_test_...',
    priceId: 'price_1SJ2PdFzGIz9kApxnVFvWAsa'
};
```

---

## 🌐 LANGUES SUPPORTÉES

| Langue | Code | Drapeau | Nom natif |
|--------|------|---------|-----------|
| Français | `fr` | 🇫🇷 | Français |
| Anglais | `en` | 🇬🇧 | English |
| Chinois | `cn` | 🇨🇳 | 中文 |
| Japonais | `jp` | 🇯🇵 | 日本語 |

---

## 📝 GUIDE DE TRADUCTION

### Principes
1. **Cohérence** : Utiliser les mêmes termes dans toute l'app
2. **Contexte métier** : VOCALIA est pour les **commerciaux terrain**
3. **Ton** : Professionnel mais accessible
4. **Longueur** : Adapter selon l'espace UI disponible

### Termes clés
| Français | Anglais | Chinois | Japonais |
|----------|---------|---------|----------|
| Rapport | Report | 报告 | レポート |
| Enregistrement | Recording | 录音 | 録音 |
| Brouillon | Draft | 草稿 | 下書き |
| Valider | Validate | 验证 | 検証する |
| Profil | Profile | 个人资料 | プロフィール |

### Format des clés
```javascript
// Hiérarchique et descriptif
"app.navigation.home"
"app.navigation.reports"
"app.modal.delete.title"
"app.modal.delete.confirm"
"app.error.network"
```

---

## 🎨 SÉLECTEUR DE LANGUE

### Design actuel
```html
<button id="currentLanguageBtn" onclick="toggleLanguageDropdown()">
    <span id="currentFlag">🇫🇷</span>
    <span id="currentLangCode">FR</span>
</button>

<div id="languageDropdown" style="display: none;">
    <div onclick="changeLanguage('fr')">🇫🇷 Français</div>
    <div onclick="changeLanguage('en')">🇬🇧 English</div>
    <div onclick="changeLanguage('cn')">🇨🇳 中文</div>
    <div onclick="changeLanguage('jp')">🇯🇵 日本語</div>
</div>
```

**Localisation** :
- App : Header principal
- Vitrine : Navigation BoostlyAI
- Register : Coin supérieur droit

---

## 🚀 PHASE FUTURE (NE PAS FAIRE MAINTENANT)

### Traduction des rapports générés
- **Trigger** : Bouton 🌐 "Traduire" sur chaque rapport
- **UI** : Modal avec sélection langue cible
- **Backend** : Workflow n8n déjà prêt (`N8N_TRANSLATE_WEBHOOK_URL`)
- **Stockage** : Champ `translations` JSONB dans table `rapports`

**Note** : Cette feature sera implémentée **après** la traduction complète de l'UI.

---

## 📊 CHECKLIST DE VALIDATION

### Avant de considérer la traduction terminée

#### App VOCALIA
- [ ] Navigation complète (FR/EN/CN/JP)
- [ ] Page Brouillon (enregistrement audio)
- [ ] Page Rapports (liste + détails)
- [ ] Page Profil
- [ ] Tous les modals (suppression, validation, etc.)
- [ ] Messages de succès/erreur
- [ ] Toasts et notifications
- [ ] Page inscription (`register.html`)
- [ ] Page succès paiement (`success.html`)
- [ ] Page annulation paiement (`cancel.html`)

#### Vitrine BoostlyAI
- [ ] index.html (accueil)
- [ ] vocalia.html (page produit)
- [ ] meetia.html (page produit)
- [ ] kinesia.html (page produit)
- [ ] faq.html
- [ ] legal.html
- [ ] privacy.html
- [ ] terms.html

#### Fonctionnel
- [ ] Sélecteur de langue visible partout
- [ ] Langue persiste (localStorage)
- [ ] Pas de clés non traduites visibles
- [ ] Dates et nombres formatés selon la langue
- [ ] Emails Supabase : ❌ **À faire plus tard par Andrea**

---

## 🐛 BUGS CONNUS À CORRIGER

1. **language-manager.js** : Quelques bugs dans `updateUI()` (à identifier)
2. **Modals non traduits** : Certains modals affichent du texte en dur en français
3. **Messages dynamiques** : Certains toasts/erreurs ne passent pas par le système i18n

---

## 💡 BONNES PRATIQUES

### Lors de l'ajout de traductions
1. Toujours ajouter la clé dans **les 4 langues** en même temps
2. Utiliser des traductions **professionnelles** (pas Google Translate brut)
3. Tester sur mobile ET desktop
4. Vérifier que les textes longs ne cassent pas le layout

### Lors de modifications HTML
1. Remplacer les textes en dur par `data-i18n="key"`
2. Appeler `languageManager.updateUI()` si ajout dynamique
3. Conserver la structure HTML existante

### Commits Git
- Message clair : `i18n: Traduction complète de success.html`
- Commits atomiques : Une page/feature à la fois

---

## 🎓 EXEMPLES DE CODE

### Ajouter une nouvelle traduction

```javascript
// translations.js
const TRANSLATIONS = {
    fr: {
        "app.new.feature": "Nouvelle fonctionnalité"
    },
    en: {
        "app.new.feature": "New feature"
    },
    cn: {
        "app.new.feature": "新功能"
    },
    jp: {
        "app.new.feature": "新機能"
    }
};
```

### Utiliser dans le HTML

```html
<!-- Statique -->
<h2 data-i18n="app.new.feature">Nouvelle fonctionnalité</h2>

<!-- Dynamique en JS -->
<script>
const message = t('app.new.feature');
showToast(message);
</script>
```

### Traduction avec paramètres

```javascript
// translations.js
"app.welcome.user": "Bienvenue {name} !"

// Utilisation
const msg = t('app.welcome.user', { name: 'Andrea' });
// → "Bienvenue Andrea !"
```

---

## 📞 CONTACT & SUPPORT

**Développeur** : Andrea CIECHELSKI  
**Email** : ciechelskia@gmail.com  
**Projet actuel** : VOCALIA International  
**Version VOCALIA France** : https://vocalia-app.netlify.app

---

## ✅ RÉSUMÉ POUR CLAUDE CODE

**Mission** : Internationaliser VOCALIA en FR/EN/CN/JP

**Priorités** :
1. Corriger `language-manager.js` et `translations.js`
2. Compléter traductions app VOCALIA
3. Traduire vitrine BoostlyAI
4. Traduire pages annexes (success/cancel)

**Ne pas toucher** :
- Logique métier (auth, audio, rapports, PDF, paiements)
- CSS desktop
- Fonctionnalités existantes

**Livrables** :
- Système i18n robuste et complet
- Toutes les pages traduites en 4 langues
- Sélecteur de langue fonctionnel partout
- Aucune régression fonctionnelle

**Questions** : Toujours demander avant de modifier la logique métier

---

*Dernière mise à jour : 3 janvier 2026*
*Version : 1.0.0*