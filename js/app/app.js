// js/app/app.js
import { supabaseClient } from '../auth.js';
import { renderRosterView } from './roster_view.js';
import { renderTrainingDashboard } from './training_view.js';
import { renderMarketView } from './market_view.js';
import { renderFinancesView } from './finances_view.js';

// KRYTYCZNY IMPORT DLA PRZYCISKÓW
import { RosterActions } from './roster_actions.js';

// Rejestracja globalna natychmiast po załadowaniu
window.RosterActions = RosterActions;
window.potentialDefinitions = {}; // Globalny słownik definicji

/**
 * Fizycznie układa sekcje w HTML zgodnie z kolejnością z bazy danych
 */
function applyLayout(layoutArray) {
    const container = document.getElementById('game-content-area');
    if (!container || !layoutArray || !Array.isArray(layoutArray)) return;

    layoutArray.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            // W JavaScript appendChild na istniejącym elemencie przenosi go na koniec
            container.appendChild(section);
        }
    });
}

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

export async function initApp() {
    console.log("[APP] Pobieranie danych drużyny...");
    try {
        // Najpierw upewnij się, że mamy definicje słownikowe
        if (Object.keys(window.potentialDefinitions).length === 0) {
            await fetchPotentialDefinitions();
        }

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabaseClient
            .from('profiles').select('*').eq('id', user.id).single();

        if (!profile?.team_id) {
            console.warn("[APP] Manager nie ma przypisanej drużyny!");
            return null;
        }

        // NOWOŚĆ: Zastosowanie zapisanego układu UI z bazy danych
        if (profile.ui_layout) {
            applyLayout(profile.ui_layout);
        }

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
    
    // 1. Zarządzanie widocznością kontenerów (Naprawa pod Safari)
    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.remove('active');
        t.style.display = 'none'; // Musimy jawnie ukryć, by uniknąć glitchy
    });

    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block'; // Pokazujemy przed renderowaniem
    }
    
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // 2. Pobieranie świeżych danych
    const data = await initApp();
    if (!data) return;

    // 3. Renderowanie do DEDYKOWANYCH kontenerów (zgodnie z nowym index.html)
    if (tabId === 'm-roster') renderRosterView(data.team, data.players);
    else if (tabId === 'm-training') renderTrainingDashboard(data.players);
    else if (tabId === 'm-market') renderMarketView(data.team, data.players);
    else if (tabId === 'm-finances') renderFinancesView(data.team, data.players);
}

window.switchTab = switchTab;
