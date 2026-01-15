// index.js
import { supabaseClient } from './js/auth.js';
import { initApp } from './js/app/app.js';

// Nasłuchuj na zmiany stanu autoryzacji
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        console.log("Użytkownik zalogowany, odpalam aplikację...");
        initApp(); // To uruchomi nasz League Clock i widoki
    } else if (event === 'SIGNED_OUT') {
        console.log("Użytkownik wylogowany.");
        // Tutaj można wyświetlić widok logowania
        renderLoginView(); 
    }
});

function renderLoginView() {
    const container = document.getElementById('app-main-view');
    container.innerHTML = `
        <div style="text-align: center; margin-top: 100px; color: white;">
            <h1>Basket Manager 2026</h1>
            <p>Zaloguj się, aby zarządzać swoją drużyną</p>
            <button id="login-btn" style="padding: 10px 20px; cursor: pointer;">Zaloguj przez Google / Email</button>
        </div>
    `;
    
    document.getElementById('login-btn').addEventListener('click', () => {
        // Tu wywołaj swoją funkcję logowania z js/auth.js
    });
}
