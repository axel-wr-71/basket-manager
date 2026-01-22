// js/app/app.js
import { supabaseClient } from '../auth.js';
import { renderRosterView } from './roster_view.js';
import { renderTrainingView } from './training_view.js';
import { renderMarketView } from './market_view.js';
import { renderFinancesView } from './finances_view.js';
import { renderMediaView } from './media_view.js'; 
import { ScheduleView } from './schedule_view.js'; // NOWY IMPORT

// KRYTYCZNY IMPORT DLA PRZYCISKÓW
import { RosterActions } from './roster_actions.js';

// Rejestracja globalna natychmiast po załadowaniu
window.RosterActions = RosterActions;
window.potentialDefinitions = {}; // Globalny słownik definicji

/**
 * Pobiera definicje potencjału z bazy danych Supabase
 */
async function fetchPotentialDefinitions() {
    try {
        const { data, error } = await supabaseClient
            .from('potential_definitions')
            .select('*');
        
        if (error) throw error;

        // Mapowanie na obiekt po ID dla szybkiego dostępu
        window.potentialDefinitions = data.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {});
        
        // Pomocnicza funkcja dostępna globalnie
        window.getPotentialData = (id) => {
            const d = window.potentialDefinitions[id];
            return d ? { label: d.label, icon: d.emoji || '', color: d.color || '#3b82f6' } : { label: 'Prospect', icon: '', color: '#94a3b8' };
        };
    } catch (err) {
        console.error("[APP] Błąd pobierania definicji potencjału:", err);
    }
}

/**
 * DYNAMICZNE MENU: Pobiera i renderuje moduły użytkownika
 */
async function loadDynamicNavigation() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        // Pobieramy ustawienia modułów dla użytkownika
        let { data: settings, error } = await supabaseClient
            .from('user_dashboard_settings')
            .select('*, app_modules(*)')
            .eq('user_id', user.id)
            .order('order_index', { ascending: true });

        // FAIL-SAFE: Jeśli brak ustawień, pobierz domyślne moduły aktywne
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

        // Inicjalizacja Drag & Drop po wyrenderowaniu
        initSidebarSortable(navContainer, user.id);

    } catch (err) {
        console.error("[APP] Błąd ładowania dynamicznego menu:", err);
    }
}

/**
 * SORTABLE: Obsługa przeciągania modułów
 */
function initSidebarSortable(container, userId) {
    if (typeof Sortable === 'undefined') return;

    Sortable.create(container, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: async () => {
            const buttons = Array.from(container.querySelectorAll('.btn-tab'));
            const updates = buttons.map((btn, index) => ({
                user_id: userId,
                module_key: btn.getAttribute('data-tab'),
                order_index: index
            }));

            console.log("[DASHBOARD] Zapisywanie nowej kolejności...");
            
            for (const item of updates) {
                const { data: mod } = await supabaseClient
                    .from('app_modules')
                    .select('id')
                    .eq('module_key', item.module_key)
                    .single();

                await supabaseClient
                    .from('user_dashboard_settings')
                    .upsert({ 
                        user_id: userId, 
                        module_id: mod.id, 
                        order_index: item.order_index 
                    }, { onConflict: 'user_id, module_id' });
            }
        }
    });
}

export async function initApp() {
    console.log("[APP] Pobieranie danych drużyny...");
    try {
        await Promise.all([
            fetchPotentialDefinitions(),
            loadDynamicNavigation()
        ]);

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabaseClient
            .from('profiles').select('*').eq('id', user.id).single();

        if (!profile?.team_id) {
            console.warn("[APP] Manager nie ma przypisanej drużyny!");
            return null;
        }

        window.userTeamId = profile.team_id;

        const [teamRes, playersRes] = await Promise.all([
            supabaseClient.from('teams').select('*').eq('id', profile.team_id).single(),
            supabaseClient.from('players').select('*').eq('team_id', profile.team_id)
        ]);

        const team = teamRes.data;
        const players = (playersRes.data || []).map(p => {
            const potDef = window.getPotentialData(p.potential);
            return { ...p, potential_definitions: potDef };
        });

        const teamName = team?.team_name || team?.name || "Twoja Drużyna";
        const leagueName = team?.league_name || "Super League";

        const tName = document.getElementById('display-team-name');
        const lName = document.getElementById('display-league-name');
        if (tName) tName.innerText = teamName;
        if (lName) lName.innerText = leagueName;

        const globalTeamDisplay = document.querySelector('.team-info b');
        const globalLeagueDisplay = document.querySelector('.team-info span[style*="color: #ff4500"], #global-league-name');
        
        if (globalTeamDisplay) globalTeamDisplay.innerText = teamName;
        if (globalLeagueDisplay) globalLeagueDisplay.innerText = leagueName;

        return { team, players };
    } catch (err) {
        console.error("[APP] Błąd krytyczny initApp:", err);
        return null;
    }
}

export async function switchTab(tabId) {
    console.log("[NAV] Przełączam na:", tabId);
    
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const data = await initApp();
    if (!data) return;

    // Renderowanie odpowiedniego widoku
    if (tabId === 'm-roster') {
        renderRosterView(data.team, data.players);
    } else if (tabId === 'm-training') {
        renderTrainingView(data.team, data.players);
    } else if (tabId === 'm-market') {
        renderMarketView(data.team, data.players);
    } else if (tabId === 'm-media') {
        renderMediaView(data.team, data.players);
    } else if (tabId === 'm-schedule') { // NOWY WARUNEK DLA TERMINARZA
        ScheduleView.render(tabId, window.userTeamId);
    } else if (tabId === 'm-finances') {
        renderFinancesView(data.team, data.players);
    }
}

window.switchTab = switchTab;
