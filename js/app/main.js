// js/main.js

import { signIn, signUp, logout } from './js/auth.js';
import { switchTab, initApp } from './js/app/app.js';
import { initContentManager } from './js/content-manager.js';

// Inicjalizacja content managera
let contentManager = null;

async function initializeContentManager() {
    try {
        // Supabase jest dostępny globalnie przez window.supabase
        contentManager = await initContentManager(window.supabase, {
            preload: true,
            preloadKeys: ['terms_of_service', 'privacy_policy']
        });
        
        // Aktualizuj funkcje globalne
        window.showTerms = () => contentManager.showTerms();
        window.showPrivacy = () => contentManager.showPrivacy();
        
        console.log('[APP] Content manager initialized');
    } catch (error) {
        console.error('[APP] Failed to initialize content manager:', error);
        // Fallback functions
        window.showTerms = () => {
            window.open('/content/terms_of_service.html', '_blank');
        };
        window.showPrivacy = () => {
            window.open('/content/privacy_policy.html', '_blank');
        };
    }
}

// Funkcje do obsługi FAQ
window.showFAQ = function() {
    const faqModal = document.getElementById('faqModal');
    if (faqModal) {
        faqModal.classList.remove('hidden');
    }
};

window.hideFAQ = function() {
    const faqModal = document.getElementById('faqModal');
    if (faqModal) {
        faqModal.classList.add('hidden');
    }
};

window.setupUI = async function(role) {
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('game-app');
    landing.style.display = 'none';
    app.classList.remove('auth-state-pending');
    app.style.display = 'block';
    
    await initApp();
    await switchTab('m-roster');
};

document.addEventListener('DOMContentLoaded', async () => {
    // Inicjalizuj content manager
    await initializeContentManager();
    
    // Event listeners dla przycisków
    document.getElementById('btn-login-action')?.addEventListener('click', signIn);
    document.getElementById('btn-signup-action')?.addEventListener('click', signUp);
    document.getElementById('btn-logout-action')?.addEventListener('click', logout);
    
    // Obsługa zamykania FAQ modala
    const faqModal = document.getElementById('faqModal');
    if (faqModal) {
        faqModal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideFAQ();
            }
        });
    }
    
    // Linki w footerze (już mają onclick, ale dla pewności)
    const termsLinks = document.querySelectorAll('a[onclick*="showTerms"]');
    termsLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.showTerms === 'function') {
                window.showTerms();
            }
        });
    });
    
    const privacyLinks = document.querySelectorAll('a[onclick*="showPrivacy"]');
    privacyLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.showPrivacy === 'function') {
                window.showPrivacy();
            }
        });
    });
    
    const faqLinks = document.querySelectorAll('a[onclick*="showFAQ"]');
    faqLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof window.showFAQ === 'function') {
                window.showFAQ();
            }
        });
    });
});
