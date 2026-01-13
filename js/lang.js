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
        admin_desc: "Witaj, Szefie. Wygeneruj zawodników do Draftu."
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
        admin_desc: "Welcome, Boss. Generate players for the Draft."
    }
};

let currentLang = localStorage.getItem('ebl_lang') || 'pl';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('ebl_lang', lang);
    
    // 1. Zastosuj tłumaczenia tekstów
    applyTranslations();
    
    // 2. Zaktualizuj wygląd flag (kolorowe vs szare)
    updateFlagUI(lang);
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });
}

function updateFlagUI(lang) {
    // Pobieramy wszystkie flagi PL i EN (zarówno z landing page jak i z aplikacji)
    const plFlags = document.querySelectorAll('#lang-pl, #lang-pl-landing');
    const enFlags = document.querySelectorAll('#lang-en, #lang-en-landing');
    
    if(lang === 'pl') {
        plFlags.forEach(f => { f.classList.add('active'); f.classList.remove('inactive'); });
        enFlags.forEach(f => { f.classList.add('inactive'); f.classList.remove('active'); });
    } else {
        enFlags.forEach(f => { f.classList.add('active'); f.classList.remove('inactive'); });
        plFlags.forEach(f => { f.classList.add('inactive'); f.classList.remove('active'); });
    }
}

// Inicjalizacja przy starcie strony
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    updateFlagUI(currentLang);
});
