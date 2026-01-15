// js/app/market_view.js
import { supabaseClient } from '../auth.js';
import { calculateMarketValue } from '../core/economy.js';

export async function renderMarketView(teamData) {
    // 1. Sprawdzamy oba możliwe kontenery (z index.html i Twoich skryptów)
    const container = document.getElementById('market-container') || document.getElementById('m-market');
    
    if (!container) {
        console.error("BŁĄD: Nie znaleziono kontenera dla rynku w index.html!");
        return;
    }

    // 2. Budujemy szkielet UI (Uproszczony styl inline dla pewności wyświetlenia)
    container.innerHTML = `
        <div class="market-wrapper" style="padding: 20px; background: #0f172a; color: white; min-height: 80vh;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin:0;">RYNEK TRANSFEROWY</h2>
                <div style="color: #22c55e; font-weight: bold;">BUDŻET: $${teamData?.balance?.toLocaleString() || '0'}</div>
            </div>

            <div class="filter-panel" style="background: rgba(30, 41, 59, 0.8); padding: 15px; border-radius: 12px; display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; border: 1px solid #334155;">
                <select id="f-pos" style="background: #1e293b; color: white; border: 1px solid #475569; padding: 8px; border-radius: 6px;">
                    <option value="">Pozycje</option>
                    <option value="PG">PG</option><option value="SG">SG</option>
                    <option value="SF">SF</option><option value="PF">PF</option><option value="C">C</option>
                </select>
                <input type="number" id="f-max-ovr" placeholder="Max OVR" style="width: 100px; background: #1e293b; color: white; border: 1px solid #475569; padding: 8px; border-radius: 6px;">
                <input type="number" id="f-min-age" placeholder="Min Wiek" style="width: 100px; background: #1e293b; color: white; border: 1px solid #475569; padding: 8px; border-radius: 6px;">
                <button id="btn-search-market" style="background: #38bdf8; color: #0f172a; border: none; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">SZUKAJ</button>
            </div>

            <div id="market-listings" style="display: flex; flex-direction: column; gap: 10px;">
                <div style="text-align:center; padding: 20px; color: #64748b;">Ładowanie ofert...</div>
            </div>
        </div>
    `;

    // 3. Podpięcie przycisku
    const searchBtn = document.getElementById('btn-search-market');
    if (searchBtn) {
        searchBtn.onclick = () => loadMarketData();
    }

    // 4. Pierwsze ładowanie
    await loadMarketData();
}

async function loadMarketData() {
    const list = document.getElementById('market-listings');
    if (!list) return;

    const fPos = document.getElementById('f-pos')?.value;
    const fMaxOvr = document.getElementById('f-max-ovr')?.value;
    const fMinAge = document.getElementById('f-min-age')?.value;

    try {
        // Pobieramy dane z tabeli transfer_market i łączymy z players
        const { data, error } = await supabaseClient
            .from('transfer_market')
            .select('*, players(*)')
            .eq('status', 'active');

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding: 40px;">Brak aktywnych ofert na rynku.</div>`;
            return;
        }

        // Filtrowanie OVR i Wieku po stronie klienta
        const filtered = data.filter(item => {
            const p = item.players;
            if (!p) return false;
            const matchPos = fPos ? p.position === fPos : true;
            const matchMaxOvr = fMaxOvr ? p.overall_rating <= parseInt(fMaxOvr) : true;
            const matchMinAge = fMinAge ? p.age >= parseInt(fMinAge) : true;
            return matchPos && matchMaxOvr && matchMinAge;
        });

        list.innerHTML = filtered.map(item => renderPlayerRow(item)).join('');

    } catch (err) {
        console.error("Market Load Error:", err);
        list.innerHTML = `<div style="color:red; text-align:center;">Błąd ładowania danych: ${err.message}</div>`;
    }
}

function renderPlayerRow(item) {
    const p = item.players;
    const marketVal = calculateMarketValue(p);
    
    // Mini statystyki (SHT, DEF, SPD, PAS, REB)
    const stats = [
        { l: 'SHT', v: p.shooting || 60, c: '#f87171' },
        { l: 'DEF', v: p.defense || 60, c: '#38bdf8' },
        { l: 'SPD', v: p.speed || 60, c: '#fbbf24' },
        { l: 'PAS', v: p.passing || 60, c: '#c084fc' },
        { l: 'REB', v: p.rebounding || 60, c: '#4ade80' }
    ];

    return `
        <div class="market-row" style="background: #1e293b; border-radius: 8px; padding: 12px 20px; display: grid; grid-template-columns: 50px 180px 1fr 180px 120px; align-items: center; border: 1px solid #334155;">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" style="width: 40px; height: 40px; border-radius: 50%; background: #0f172a;">
            
            <div>
                <div style="font-weight:bold;">${p.last_name}</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">${p.position} | OVR: ${p.overall_rating} | ${p.age} l.</div>
            </div>

            <div style="display: flex; gap: 8px; justify-content: center; height: 30px; align-items: flex-end;">
                ${stats.map(s => `
                    <div style="width: 10px; height: ${s.v/2.5}px; background: ${s.c}; border-radius: 2px;" title="${s.l}: ${s.v}"></div>
                `).join('')}
            </div>

            <div style="text-align: right; padding-right: 15px;">
                <div style="font-size: 1.1rem; font-weight: bold; color: #fbbf24;">$${item.current_price.toLocaleString()}</div>
                <div style="font-size: 0.6rem; color: #64748b;">Wycena: $${marketVal.toLocaleString()}</div>
            </div>

            <button style="background: #38bdf8; color: #0f172a; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer;">LICYTUJ</button>
        </div>
    `;
}
