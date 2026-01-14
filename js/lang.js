const translations = {
    pl: {
        welcome_title: "ELITE BUZZER LEAGUE",
        login_header: "Panel Managera",
        btn_login: "ZALOGUJ SIĘ",
        btn_signup: "ZAŁÓŻ KONTO",
        admin_panel: "Panel Administratora",
        gen_world: "GENERUJ ŚWIAT I LIGI",
        logout: "Wyloguj",
        rookie_edit: "Edycja Wyglądu Rookie",
        admin_desc: "Witaj, Szefie. Wygeneruj zawodników do Draftu.",
        // Zakładki Managera
        m_roster: "ZAWODNICY",
        m_market: "RYNEK",
        m_schedule: "TERMINARZ",
        m_draft: "DRAFT",
        m_finances: "FINANSE",
        // Inne
        back_to_base: "← POWRÓT DO BAZY",
        admin_mode: "TRYB ADMINISTRATORA"
    },
    en: {
        welcome_title: "ELITE BUZZER LEAGUE",
        login_header: "Manager Panel",
        btn_login: "LOG IN",
        btn_signup: "SIGN UP",
        admin_panel: "Admin Dashboard",
        gen_world: "GENERATE WORLD & LEAGUES",
        logout: "Logout",
        rookie_edit: "Edit Rookie Appearance",
        admin_desc: "Welcome, Boss. Generate players for the Draft.",
        // Manager Tabs
        m_roster: "ROSTER",
        m_market: "MARKET",
        m_schedule: "SCHEDULE",
        m_draft: "DRAFT",
        m_finances: "FINANCES",
        // Others
        back_to_base: "← BACK TO BASE",
        admin_mode: "ADMIN MODE"
    }
};

let currentLang = localStorage.getItem('ebl_lang') || 'pl';

// Główna funkcja zmiany języka dostępna globalnie
window.setLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('ebl_lang', lang);
    
    // 1. Zastosuj tłumaczenia tekstów
    applyTranslations();
    
    // 2. Zaktualizuj wygląd flag
    updateFlagUI(lang);
    
    console.log(`Język zmieniony na: ${lang}`);
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
            // Obsługa zarówno zwykłego tekstu jak i inputów (placeholder)
            if (el.tagName === 'INPUT') {
                el.placeholder = translations[currentLang][key];
            } else {
                el.innerText = translations[currentLang][key];
            }
        }
    });
}

function updateFlagUI(lang) {
    // Pobieramy flagi po ID (zgodnie z nowym index.html) oraz po klasach jeśli istnieją
    const plFlags = document.querySelectorAll('#flag-pl, #lang-pl, .lang-flag[onclick*="pl"]');
    const enFlags = document.querySelectorAll('#flag-en, #lang-en, .lang-flag[onclick*="en"]');
    
    if(lang === 'pl') {
        plFlags.forEach(f => f.classList.add('active'));
        enFlags.forEach(f => f.classList.remove('active'));
    } else {
        enFlags.forEach(f => f.classList.add('active'));
        plFlags.forEach(f => f.classList.remove('active'));
    }
}

// Eksportujemy funkcję do window, by była dostępna z HTML (onclick)
window.applyTranslations = applyTranslations;

// Inicjalizacja przy starcie strony
document.addEventListener('DOMContentLoaded', () => {
    // Małe opóźnienie, aby upewnić się, że DOM jest gotowy na zmiany klas
    setTimeout(() => {
        applyTranslations();
        updateFlagUI(currentLang);
    }, 50);
});
