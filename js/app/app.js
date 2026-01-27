// js/app/app.js
import { supabaseClient, checkAdminPermissions } from '../auth.js';
import { renderRosterView } from './roster_view.js';
import { renderTrainingView } from './training_view.js';
import { renderMarketView } from './market_view.js';
import { renderFinancesView } from './finances_view.js';
import { renderMediaView } from './media_view.js'; 
import { renderLeagueView } from './league_view.js';
import { renderArenaView } from './arena_view.js';
import { ScheduleView } from './schedule_view.js';
import { RosterActions } from './roster_actions.js';
import { renderMyClubView } from './myclub_view.js';
import { renderNationalCupView } from './nationalcup_view.js'; // NOWY IMPORT
import { renderStaffView } from './staff_view.js'; // NOWY IMPORT - DODANE
import { renderSettingsView } from './settings_view.js'; // NOWY IMPORT - USTAWIENIA

// Rejestracja globalna
window.RosterActions = RosterActions;
window.potentialDefinitions = {}; 
window.gameState = {
    team: null,
    players: [],
    currentWeek: 0,
    isAdmin: false,
    countryData: null,
    nationalCupData: null
};

// Zmienna do przechowywania ostatnio wybranej zakładki
let lastActiveTab = null;

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
 * Funkcja pomocnicza do pobierania statystyk modułu
 */
function getModuleStats(moduleKey) {
    // Tymczasowa implementacja - zwraca puste stringi
    // W przyszłości można tu dodać logikę zliczania np. nowych wiadomości, zadań itp.
    const stats = {
        'm-roster': window.gameState.players?.length || 0,
        'm-training': '0',
        'm-market': '0',
        'm-media': '0',
        'm-finances': '0',
        'm-arena': '0',
        'm-myclub': '0',
        'm-schedule': '0',
        'm-league': '0',
        'm-nationalcup': window.gameState.nationalCupData ? '🏆' : '0', // Statystyka dla pucharu
        'm-staff': '👥' // NOWA STATYSTYKA DLA PERSONELU
    };
    
    return stats[moduleKey] || '0';
}

/**
 * Pobiera dane kraju drużyny (z ligi)
 */
async function fetchCountryData(teamId) {
    try {
        const { data: teamData, error: teamError } = await supabaseClient
            .from('teams')
            .select('league_id')
            .eq('id', teamId)
            .single();
            
        if (teamError) throw teamError;
        
        if (teamData?.league_id) {
            // Pobierz dane ligi (z krajem)
            const { data: leagueData, error: leagueError } = await supabaseClient
                .from('leagues')
                .select('id, country')
                .eq('id', teamData.league_id)
                .single();
                
            if (leagueError) throw leagueError;
            
            if (leagueData) {
                window.gameState.countryData = {
                    id: leagueData.id,
                    name: leagueData.country,
                    // Możesz dodać więcej pól z tabeli leagues jeśli są potrzebne
                };
                return window.gameState.countryData;
            }
        }
        return null;
    } catch (err) {
        console.error("[APP] Błąd pobierania danych kraju:", err);
        return null;
    }
}

/**
 * Pobiera dane pucharu narodowego dla drużyny
 */
async function fetchNationalCupData(teamId) {
    try {
        // Pobierz ligę drużyny (drużyna należy do ligi, liga ma kraj)
        const { data: teamData, error: teamError } = await supabaseClient
            .from('teams')
            .select('league_id')
            .eq('id', teamId)
            .single();
            
        if (teamError || !teamData?.league_id) {
            console.log("[APP] Drużyna nie ma przypisanej ligi");
            return null;
        }
        
        // Pobierz dane ligi (w tym kraj)
        const { data: leagueData, error: leagueError } = await supabaseClient
            .from('leagues')
            .select('id, country')
            .eq('id', teamData.league_id)
            .single();
            
        if (leagueError || !leagueData) {
            console.log("[APP] Błąd pobierania danych ligi");
            return null;
        }
        
        // Zapisz dane kraju w gameState
        window.gameState.countryData = {
            id: leagueData.id,
            name: leagueData.country,
        };
        
        // Pobierz bieżący sezon
        const { data: configRes } = await supabaseClient
            .from('game_config')
            .select('value')
            .eq('key', 'current_season')
            .single();
        
        const currentSeason = configRes?.value || new Date().getFullYear();
        
        // Znajdź aktywny puchar dla tej ligi
        const { data: cupData, error: cupError } = await supabaseClient
            .from('national_cups')
            .select('*')
            .eq('league_id', leagueData.id)
            .eq('season', currentSeason)
            .eq('is_active', true)
            .single();
            
        if (cupError || !cupData) {
            console.log("[APP] Brak aktywnego pucharu dla tej ligi");
            return null;
        }
        
        // Pobierz dane pucharu
        const { data: roundsData, error: roundsError } = await supabaseClient
            .from('national_cup_rounds')
            .select('*')
            .eq('cup_id', cupData.id)
            .order('round_number', { ascending: true });
            
        if (roundsError) throw roundsError;
        
        // Pobierz mecze pucharowe
        const roundIds = roundsData.map(r => r.id);
        const { data: matchesData, error: matchesError } = await supabaseClient
            .from('matches')
            .select(`
                *,
                home_team:teams!matches_home_team_id_fkey (team_name, logo_url, city),
                away_team:teams!matches_away_team_id_fkey (team_name, logo_url, city)
            `)
            .eq('match_type', 'Puchar')
            .eq('cup_id', cupData.id)
            .in('cup_round_id', roundIds)
            .order('cup_round_id', { ascending: true })
            .order('match_date', { ascending: true });
            
        if (matchesError) throw matchesError;
        
        // Sprawdź czy drużyna bierze udział
        const { data: participantData, error: participantError } = await supabaseClient
            .from('national_cup_participants')
            .select('*')
            .eq('cup_id', cupData.id)
            .eq('team_id', teamId)
            .single();
            
        if (participantError) {
            console.log("[APP] Drużyna nie bierze udziału w pucharze");
            return null;
        }
        
        // Pobierz wszystkich uczestników
        const { data: allParticipants, error: participantsError } = await supabaseClient
            .from('national_cup_participants')
            .select(`
                *,
                team:teams (team_name, logo_url)
            `)
            .eq('cup_id', cupData.id);
            
        if (participantsError) throw participantsError;
        
        const cupInfo = {
            cup: cupData,
            participant: participantData,
            rounds: roundsData,
            matches: matchesData,
            allParticipants: allParticipants,
            currentRound: cupData.current_round
        };
        
        window.gameState.nationalCupData = cupInfo;
        return cupInfo;
        
    } catch (err) {
        console.error("[APP] Błąd pobierania danych pucharu:", err);
        return null;
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

        // Sprawdź czy użytkownik jest adminem
        const isAdmin = window.gameState.isAdmin || false;

        // Generuj menu z kartami
        let navHTML = settings.map(s => `
            <div class="nav-card" onclick="switchTab('${s.app_modules.module_key}')">
                <div class="nav-card-icon">${s.app_modules.icon || '📊'}</div>
                <div class="nav-card-content">
                    <div class="nav-card-title">${s.app_modules.display_name}</div>
                    <div class="nav-card-badge">${getModuleStats(s.app_modules.module_key)}</div>
                </div>
            </div>
        `).join('');

        if (isAdmin) {
            navHTML += `
                <div class="nav-card" onclick="switchTab('m-admin')">
                    <div class="nav-card-icon">🔧</div>
                    <div class="nav-card-content">
                        <div class="nav-card-title">Admin</div>
                        <div class="nav-card-badge">⚙️</div>
                    </div>
                </div>
            `;
            console.log('[ADMIN] Zakładka Admin dodana do menu');
        }

        navContainer.innerHTML = navHTML;

        // SPRAWDŹ CZY JEST ZAPISANA OSTATNIA ZAKŁADKA W LOCALSTORAGE
        const savedTab = localStorage.getItem('lastActiveTab');
        
        if (savedTab) {
            // Sprawdź czy zapisana zakładka istnieje w menu
            const tabExists = settings.some(s => s.app_modules.module_key === savedTab) || 
                            (isAdmin && savedTab === 'm-admin');
            
            if (tabExists) {
                // Użyj zapisanej zakładki
                setTimeout(() => switchTab(savedTab), 100);
                return;
            }
        }
        
        // JEŚLI NIE MA ZAPISANEJ ZAKŁADKI LUB NIE ISTNIEJE, USTAW DOMYŚLNĄ
        // Ale TYLKO jeśli nie jest to admin (dla admina zostawiamy wybór)
        if (settings.length > 0 && !isAdmin) {
            const firstTab = settings[0].app_modules.module_key;
            setTimeout(() => switchTab(firstTab), 100);
        }

    } catch (err) {
        console.error("[APP] Błąd menu:", err);
    }
}

/**
 * Sprawdza czy użytkownik jest administratorem
 */
async function checkUserAdminStatus(userId) {
    try {
        const adminCheck = await checkAdminPermissions();
        
        if (adminCheck.hasAccess) {
            window.gameState.isAdmin = true;
            console.log('[APP] Użytkownik jest administratorem');
            return true;
        }
        
        // Dodatkowe sprawdzenie z bazy danych
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role, is_admin')
            .eq('id', userId)
            .single();
            
        const isAdmin = profile?.role === 'admin' || profile?.is_admin === true;
        window.gameState.isAdmin = isAdmin;
        
        return isAdmin;
        
    } catch (error) {
        console.error("[APP] Błąd sprawdzania admina:", error);
        return false;
    }
}

/**
 * Pobiera dane dla zwykłego użytkownika (ma drużynę)
 */
async function loadRegularUserData(userId) {
    try {
        // 1. Pobierz dane podstawowe
        const [profileRes, configRes] = await Promise.all([
            supabaseClient.from('profiles').select('team_id').eq('id', userId).single(),
            supabaseClient.from('game_config').select('value').eq('key', 'current_week').single()
        ]);

        const teamId = profileRes.data?.team_id;
        if (!teamId) {
            console.error("[APP] Brak przypisanej drużyny!");
            return false;
        }

        window.userTeamId = teamId;
        window.gameState.currentWeek = configRes.data ? parseInt(configRes.data.value) : 1;

        // 2. Pobierz definicje potencjałów
        await fetchPotentialDefinitions();
        
        // 3. Pobierz dane kraju (z ligi)
        await fetchCountryData(teamId);
        
        // 4. Pobierz dane pucharu narodowego (jeśli istnieją)
        await fetchNationalCupData(teamId);

        // 5. Pobierz dane drużyny i zawodników
        const [teamRes, playersRes] = await Promise.all([
            supabaseClient.from('teams').select('*').eq('id', teamId).single(),
            supabaseClient.from('players').select('*').eq('team_id', teamId)
        ]);

        window.gameState.team = teamRes.data;
        window.gameState.players = (playersRes.data || []).map(p => ({
            ...p,
            potential_definitions: window.getPotentialData(p.potential)
        }));

        console.log('[APP] Drużyna załadowana:', window.gameState.team?.team_name);
        console.log('[APP] Graczy załadowanych:', window.gameState.players?.length);
        console.log('[APP] Kraj drużyny:', window.gameState.countryData?.name);
        console.log('[APP] Status pucharu:', window.gameState.nationalCupData ? 'Aktywny' : 'Nieaktywny');

        // UI Updates dla nagłówka
        const teamName = window.gameState.team?.team_name || "Twoja Drużyna";
        document.querySelectorAll('.team-info b, #display-team-name').forEach(el => {
            if (el) el.textContent = teamName;
        });

        return true;
        
    } catch (err) {
        console.error("[APP] Błąd ładowania danych użytkownika:", err);
        return false;
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

        console.log('[APP] Zalogowany użytkownik:', user.email);

        // Sprawdź czy użytkownik jest administratorem
        const isAdmin = await checkUserAdminStatus(user.id);
        
        if (isAdmin) {
            console.log('[APP] Użytkownik jest administratorem - pomijam ładowanie drużyny');
            
            // Dla admina ustawiamy puste dane drużyny
            window.userTeamId = null;
            window.gameState.team = { 
                id: 'admin',
                team_name: 'System Administrator',
                is_admin: true 
            };
            window.gameState.players = [];
            
            // Pobierz tydzień dla statystyk
            const { data: configRes } = await supabaseClient
                .from('game_config')
                .select('value')
                .eq('key', 'current_week')
                .single();
                
            window.gameState.currentWeek = configRes ? parseInt(configRes.value) : 1;
            
            // Pobierz definicje potencjałów (może być potrzebne do panelu admina)
            await fetchPotentialDefinitions();
            
        } else {
            // Zwykły użytkownik - ładujemy dane drużyny
            const success = await loadRegularUserData(user.id);
            if (!success) {
                console.error("[APP] Nie udało się załadować danych użytkownika");
                return;
            }
        }

        // 4. Załaduj nawigację (to wywoła switchTab dla pierwszej zakładki)
        await loadDynamicNavigation();

    } catch (err) {
        console.error("[APP] Błąd krytyczny initApp:", err);
    }
}

/**
 * Przełączanie zakładek
 */
export async function switchTab(tabId) {
    console.log("[NAV] Przełączam na:", tabId);
    
    // ZAPISZ OSTATNIĄ WYBRANĄ ZAKŁADKĘ W LOCALSTORAGE
    localStorage.setItem('lastActiveTab', tabId);
    lastActiveTab = tabId;
    
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-card').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const activeCard = document.querySelector(`.nav-card[onclick*="${tabId}"]`);
    if (activeCard) activeCard.classList.add('active');

    const { team, players, isAdmin, nationalCupData } = window.gameState;
    
    // Dla admina specjalne traktowanie
    if (isAdmin && tabId === 'm-admin') {
        await renderAdminView(team, players);
        return;
    }
    
    // Dla zwykłego użytkownika lub innych zakładek admina
    if (!team && !isAdmin) {
        console.warn('[SWITCHTAB] Brak danych drużyny!');
        return;
    }

    console.log('[SWITCHTAB] Team:', team?.team_name);
    console.log('[SWITCHTAB] Players:', players?.length);
    console.log('[SWITCHTAB] National Cup:', nationalCupData ? 'Dane dostępne' : 'Brak danych');

    switch (tabId) {
        case 'm-roster': 
            if (!isAdmin) renderRosterView(team, players); 
            break;
        case 'm-training': 
            if (!isAdmin) renderTrainingView(team, players); 
            break;
        case 'm-market': 
            if (!isAdmin) renderMarketView(team, players); 
            break;
        case 'm-media': 
            if (!isAdmin) renderMediaView(team, players); 
            break;
        case 'm-finances': 
            if (!isAdmin) renderFinancesView(team, players); 
            break;
        case 'm-arena': 
            if (!isAdmin) renderArenaView(team, players);
            break;
        case 'm-myclub': 
            if (!isAdmin) renderMyClubView(team, players);
            break;
        case 'm-schedule': 
            if (!isAdmin) ScheduleView.render(tabId, window.userTeamId); 
            break;
        case 'm-league': 
            if (!isAdmin) renderLeagueView(team, players); 
            break;
        case 'm-nationalcup': // NOWA ZAKŁADKA
            if (!isAdmin) renderNationalCupView(team, players, window.gameState.nationalCupData); 
            break;
        case 'm-staff': // NOWA ZAKŁADKA - PERSONEL
            if (!isAdmin) renderStaffView(team, players); 
            break;
        case 'm-admin': 
            console.log('[SWITCHTAB] Przełączam na panel admina');
            await renderAdminView(team, players); 
            break;
        default:
            console.warn('[SWITCHTAB] Nieznana zakładka:', tabId);
    }
}

/**
 * Funkcja do renderowania panelu admina Z PLIKU admin_panel.js
 */
async function renderAdminView(team, players) {
    console.log('[ADMIN] renderAdminView wywołany');
    
    const container = document.getElementById('m-admin');
    if (!container) {
        console.error('[ADMIN] Nie znaleziono kontenera m-admin');
        return;
    }
    
    console.log('[ADMIN] Kontener znaleziony');
    
    // Sprawdź czy użytkownik jest adminem
    const userEmail = JSON.parse(localStorage.getItem('supabase.auth.token'))?.currentSession?.user?.email;
    
    console.log('[ADMIN] Email użytkownika:', userEmail);
    console.log('[ADMIN] Czy jest adminem?', window.gameState.isAdmin);
    
    if (!window.gameState.isAdmin) {
        container.innerHTML = `
            <div style="padding: 50px; text-align: center;">
                <h2 style="color: #ef4444;">❌ Brak uprawnień</h2>
                <p style="color: #64748b;">Nie masz dostępu do panelu administracyjnego.</p>
                <p>Twój email: ${userEmail || 'niezalogowany'}</p>
            </div>
        `;
        return;
    }
    
    // Pobierz panel admina z pliku admin_panel.js
    try {
        // Pokaż ładowanie
        container.innerHTML = `
            <div style="padding: 30px; text-align: center;">
                <h2 style="color: #1a237e;">⚙️ Ładowanie panelu admina...</h2>
                <p style="color: #64748b;">Proszę czekać</p>
            </div>
        `;
        
        // Dynamiczny import panelu admina z pliku admin_panel.js
        const { renderAdminPanel } = await import('./admin_panel.js');
        
        // Pobierz dane dla admina
        let teamData = window.gameState.team;
        
        // Renderuj panel admina z pliku admin_panel.js
        await renderAdminPanel(teamData);
        
        console.log('[ADMIN] Panel admina załadowany z pliku admin_panel.js');
        
    } catch (error) {
        console.error("[ADMIN] Błąd ładowania panelu z pliku admin_panel.js:", error);
        
        // Fallback - wyświetl podstawowy panel jeśli nie uda się załadować pliku
        container.innerHTML = `
            <div style="padding: 20px;">
                <h1 style="color: #1a237e; margin-bottom: 20px;">🔧 Panel Administracyjny</h1>
                <p style="color: #64748b; margin-bottom: 30px;">Witaj, ${userEmail}</p>
                <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="color: #1a237e; margin-bottom: 15px;">ℹ️ Informacje debugowania</h3>
                    <div style="font-family: monospace; background: #f3f4f6; padding: 15px; border-radius: 6px;">
                        <p><strong>Email:</strong> ${userEmail}</p>
                        <p><strong>Admin:</strong> TAK</p>
                        <p><strong>Current Week:</strong> ${window.gameState.currentWeek}</p>
                        <p><strong>Błąd ładowania panelu:</strong> ${error.message}</p>
                        <button onclick="location.reload()" 
                                style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 8px; margin-top: 20px;">
                            Odśwież stronę
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Rejestracja globalna dla onclick w HTML
window.switchTab = switchTab;
window.renderSettingsView = renderSettingsView; // DODANE - Rejestracja widoku ustawień

// BEZPIECZNY START: Czekamy na załadowanie DOM i modułów
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
