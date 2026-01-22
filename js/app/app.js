// js/app/app.js
import { supabaseClient } from '../auth.js';
import { renderRosterView } from './roster_view.js';
import { renderTrainingView } from './training_view.js';
import { renderMarketView } from './market_view.js';
import { renderFinancesView } from './finances_view.js';
import { renderMediaView } from './media_view.js'; 
import { ScheduleView } from './schedule_view.js';
import { RosterActions } from './roster_actions.js';

// Rejestracja globalna
window.RosterActions = RosterActions;
window.potentialDefinitions = {}; 
window.gameState = {
    team: null,
    players: [],
    currentWeek: 0,
    isAdmin: false // Dodajemy flagę admina
};

/**
 * Pobiera definicje potencjału
 */
async function fetchPotentialDefinitions() {
    try {
        const { data, error } = await supabaseClient
            .from('potential_definitions')
            .select('*');
        
        if (error) throw error;

        window.potentialDefinitions = data.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {});
        
        window.getPotentialData = (id) => {
            const d = window.potentialDefinitions[id];
            return d ? { label: d.label, icon: d.emoji || '', color: d.color || '#3b82f6' } : { label: 'Prospect', icon: '', color: '#94a3b8' };
        };
    } catch (err) {
        console.error("[APP] Błąd potencjałów:", err);
    }
}

/**
 * DYNAMICZNE MENU
 */
async function loadDynamicNavigation() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        let { data: settings } = await supabaseClient
            .from('user_dashboard_settings')
            .select('*, app_modules(*)')
            .eq('user_id', user.id)
            .order('order_index', { ascending: true });

        if (!settings || settings.length === 0) {
            const { data: defaults } = await supabaseClient
                .from('app_modules')
                .select('*')
                .eq('is_active', true);
            
            settings = (defaults || []).map((m, idx) => ({ app_modules: m, order_index: idx }));
        }

        const navContainer = document.getElementById('main-nav-container'); 
        if (!navContainer) return;

        navContainer.innerHTML = settings.map(s => `
            <button class="btn-tab" 
                    data-tab="${s.app_modules.module_key}" 
                    onclick="switchTab('${s.app_modules.module_key}')">
                <span class="tab-icon">${s.app_modules.icon || ''}</span>
                <span class="tab-label">${s.app_modules.display_name}</span>
            </button>
        `).join('');

        // Ustawienie domyślnej zakładki (np. Media) po załadowaniu menu
        if (settings.length > 0) {
            const firstTab = settings[0].app_modules.module_key;
            switchTab(firstTab);
        }

    } catch (err) {
        console.error("[APP] Błąd menu:", err);
    }
}

/**
 * Inicjalizacja danych gry
 */
export async function initApp() {
    console.log("[APP] Start inicjalizacji...");
    try {
        // Sprawdzenie czy supabaseClient jest dostępny
        if (!supabaseClient) {
            throw new Error("supabaseClient nie został zainicjalizowany!");
        }

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            console.warn("[APP] Brak zalogowanego użytkownika.");
            return;
        }

        // 1. Pobierz dane podstawowe
        const [profileRes, configRes] = await Promise.all([
            supabaseClient.from('profiles').select('team_id').eq('id', user.id).single(),
            supabaseClient.from('game_config').select('value').eq('key', 'current_week').single()
        ]);

        const teamId = profileRes.data?.team_id;
        if (!teamId) {
            console.error("[APP] Brak przypisanej drużyny!");
            return;
        }

        window.userTeamId = teamId;
        window.gameState.currentWeek = configRes.data ? parseInt(configRes.data.value) : 1;

        // 2. Pobierz definicje potencjałów
        await fetchPotentialDefinitions();

        // 3. Pobierz dane drużyny i zawodników
        const [teamRes, playersRes] = await Promise.all([
            supabaseClient.from('teams').select('*').eq('id', teamId).single(),
            supabaseClient.from('players').select('*').eq('team_id', teamId)
        ]);

        window.gameState.team = teamRes.data;
        window.gameState.players = (playersRes.data || []).map(p => ({
            ...p,
            potential_definitions: window.getPotentialData(p.potential)
        }));

        // UI Updates dla nagłówka
        const teamName = window.gameState.team?.team_name || "Twoja Drużyna";
        document.querySelectorAll('.team-info b, #display-team-name').forEach(el => el.innerText = teamName);

        // 4. Załaduj nawigację (to wywoła switchTab dla pierwszej zakładki)
        await loadDynamicNavigation();

        // 5. Inicjalizacja panelu admina
        initAdminConsole();

    } catch (err) {
        console.error("[APP] Błąd krytyczny initApp:", err);
    }
}

/**
 * Przełączanie zakładek
 */
export async function switchTab(tabId) {
    console.log("[NAV] Przełączam na:", tabId);
    
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const { team, players } = window.gameState;
    if (!team) return;

    switch (tabId) {
        case 'm-roster': renderRosterView(team, players); break;
        case 'm-training': renderTrainingView(team, players); break;
        case 'm-market': renderMarketView(team, players); break;
        case 'm-media': renderMediaView(team, players); break;
        case 'm-finances': renderFinancesView(team, players); break;
        case 'm-schedule': 
            ScheduleView.render(tabId, window.userTeamId); 
            break;
    }
}

// ============================================
// PANEL ADMINA - DOSTĘP PRZEZ KONSOLĘ (KROK 3)
// ============================================

/**
 * Inicjalizacja konsoli admina
 */
function initAdminConsole() {
    console.log("[ADMIN] Inicjalizacja panelu admina...");
    
    // Funkcja do ładowania panelu admina
    window.loadAdminPanel = async function() {
        console.log("[ADMIN] Próba załadowania panelu admina...");
        
        // 1. Sprawdź czy użytkownik jest zalogowany
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert("❌ Musisz być zalogowany!");
            return;
        }
        
        // 2. Proste zabezpieczenie hasłem (możesz zmienić)
        const password = prompt("🔐 PANEL ADMINA\n\nWprowadź hasło dostępu:");
        
        if (password === "NBA2024!ADMIN") {
            // Hasło poprawne - załaduj panel
            await showAdminPanel();
        } else if (password === "test") {
            // Tryb testowy z łatwiejszym dostępem
            alert("⚠️ Tryb testowy - ograniczone funkcje");
            await showAdminPanel(true);
        } else {
            alert("❌ Nieprawidłowe hasło!");
            return;
        }
    };

    // Główna funkcja pokazująca panel admina
    async function showAdminPanel(isTestMode = false) {
        try {
            // Znajdź kontener główny
            let container = document.getElementById('main-content');
            if (!container) {
                // Jeśli nie ma, stwórz
                container = document.createElement('div');
                container.id = 'main-content';
                document.body.appendChild(container);
            }
            
            // Pokaż ładowanie
            container.innerHTML = `
                <div style="padding: 50px; text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 20px;">⚙️</div>
                    <h2 style="color: #1a237e;">Ładowanie Panelu Admina...</h2>
                    <p style="color: #64748b;">Proszę czekać</p>
                </div>
            `;
            
            // Dynamiczny import panelu admina
            const { renderAdminPanel } = await import('./admin_panel.js');
            
            // Pobierz dane drużyny (jeśli potrzebne)
            let teamData = window.gameState.team;
            
            // Jeśli tryb testowy, przekaż flagę
            if (isTestMode) {
                teamData = { ...teamData, test_mode: true };
            }
            
            // Renderuj panel
            await renderAdminPanel(teamData);
            
            console.log("[ADMIN] Panel załadowany pomyślnie!");
            
        } catch (error) {
            console.error("[ADMIN] Błąd ładowania panelu:", error);
            
            const container = document.getElementById('main-content');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 50px; text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 20px; color: #ef4444;">❌</div>
                        <h2 style="color: #1a237e;">Błąd ładowania panelu</h2>
                        <p style="color: #64748b;">${error.message}</p>
                        <button onclick="location.reload()" 
                                style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 8px; margin-top: 20px;">
                            Odśwież stronę
                        </button>
                    </div>
                `;
            }
        }
    }

    // Dodatkowe funkcje admina dostępne z konsoli
    window.__ADMIN = {
        // Otwórz panel admina
        open: () => window.loadAdminPanel(),
        
        // Sprawdź stan aplikacji
        status: () => {
            console.log("=== STATUS APLIKACJI ===");
            console.log("User ID:", localStorage.getItem('user_id'));
            console.log("Team ID:", window.userTeamId);
            console.log("Team Name:", window.gameState.team?.team_name);
            console.log("Players:", window.gameState.players.length);
            console.log("Current Week:", window.gameState.currentWeek);
            console.log("Token:", localStorage.getItem('supabase.auth.token'));
            console.log("========================");
        },
        
        // Wyczyść cache aplikacji
        clearCache: () => {
            if (confirm("Czy na pewno chcesz wyczyścić cache?\nWszystkie dane lokalne zostaną usunięte.")) {
                localStorage.clear();
                sessionStorage.clear();
                alert("✅ Cache wyczyszczony! Strona zostanie odświeżona.");
                location.reload();
            }
        },
        
        // Test połączenia z Supabase
        testConnection: async () => {
            try {
                const { data, error } = await supabaseClient
                    .from('teams')
                    .select('count')
                    .limit(1);
                    
                if (error) throw error;
                console.log("✅ Połączenie z Supabase OK");
                alert("✅ Połączenie z bazą działa poprawnie!");
                return true;
            } catch (error) {
                console.error("❌ Błąd połączenia:", error);
                alert("❌ Błąd połączenia: " + error.message);
                return false;
            }
        },
        
        // Szybka aktualizacja pensji (bez GUI)
        updateSalaries: async () => {
            if (!confirm("Czy chcesz zaktualizować pensje wszystkich graczy?\nTa operacja może potrwać kilka minut.")) return;
            
            try {
                // Import funkcji z economy.js
                const { updateAllPlayerSalaries } = await import('../core/economy.js');
                console.log("[ADMIN] Rozpoczynam aktualizację pensji...");
                
                const result = await updateAllPlayerSalaries();
                
                console.log("✅ Wynik aktualizacji:", result);
                
                if (result.success) {
                    alert(`✅ Aktualizacja zakończona!\n\nZaktualizowano: ${result.updatedPlayers} graczy\nBez zmian: ${result.unchangedPlayers} graczy\nW sumie: ${result.totalPlayers} graczy`);
                } else {
                    alert(`❌ Błąd aktualizacji:\n${result.errors?.join('\n') || result.error}`);
                }
                
                return result;
                
            } catch (error) {
                console.error("❌ Błąd:", error);
                alert("❌ Błąd aktualizacji: " + error.message);
                return { success: false, error: error.message };
            }
        },
        
        // Aktualizuj wartości rynkowe
        updateMarketValues: async () => {
            if (!confirm("Czy chcesz zaktualizować wartości rynkowe wszystkich graczy?")) return;
            
            try {
                const { updateAllPlayerMarketValues } = await import('../core/economy.js');
                console.log("[ADMIN] Rozpoczynam aktualizację wartości rynkowych...");
                
                const result = await updateAllPlayerMarketValues();
                
                if (result.success) {
                    alert(`✅ Zaktualizowano wartości rynkowe ${result.updatedCount} graczy`);
                } else {
                    alert(`❌ Błąd: ${result.error}`);
                }
                
                return result;
                
            } catch (error) {
                console.error("❌ Błąd:", error);
                alert("❌ Błąd: " + error.message);
            }
        }
    };

    // Skrót klawiaturowy (opcjonalnie) - Ctrl+Shift+A
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            console.log("[ADMIN] Skrót klawiaturowy wykryty - otwieram panel...");
            window.loadAdminPanel();
        }
    });

    // Automatyczne logowanie do konsoli po załadowaniu strony
    setTimeout(() => {
        console.log("==========================================");
        console.log("PANEL ADMINA DOSTĘPNY");
        console.log("Dostępne komendy w konsoli:");
        console.log("  loadAdminPanel()  - otwórz panel GUI");
        console.log("  __ADMIN.open()    - to samo");
        console.log("  __ADMIN.status()  - status aplikacji");
        console.log("  __ADMIN.updateSalaries() - aktualizuj pensje");
        console.log("  __ADMIN.updateMarketValues() - aktualizuj wartości");
        console.log("  __ADMIN.testConnection() - test bazy");
        console.log("  __ADMIN.clearCache() - wyczyść cache");
        console.log("");
        console.log("Skrót klawiaturowy: Ctrl+Shift+A");
        console.log("==========================================");
    }, 2000);
}

// Rejestracja globalna dla onclick w HTML
window.switchTab = switchTab;

// BEZPIECZNY START: Czekamy na załadowanie DOM i modułów
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
