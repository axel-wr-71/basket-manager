import { supabaseClient } from '../auth.js';

/**
 * GŁÓWNA FUNKCJA RENDERUJĄCA WIDOK FINANSÓW
 * Wersja 2.1.0 - Modern Elite Design
 */
export async function renderFinancesView(teamData, players = null) {
    const container = document.getElementById('finances-view-container');
    if (!container) {
        console.error("Nie znaleziono kontenera finances-view-container");
        return;
    }

    // 1. Pobieranie danych z Supabase
    const { data: logs, error: logsError } = await supabaseClient
        .from('financial_logs')
        .select('*')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false });

    if (logsError) console.error("Błąd pobierania logów:", logsError);

    const stats = calculateDetailedStats(logs);
    const weeklySalaries = await calculateTotalSalaries(teamData.id);
    
    // Obliczanie prognozy (Forecast)
    const weeklyForecast = (stats.income7d - (stats.expense7d + weeklySalaries));

    container.innerHTML = `
        <div class="finances-wrapper" style="padding: 40px; background: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif;">
            
            <!-- HEADER SECTION -->
            <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                <div>
                    <h1 style="font-size: 2.5rem; font-weight: 900; color: #0f172a; letter-spacing: -1px; margin: 0;">
                        FINANCE <span style="color: #f58426;">HUB</span>
                    </h1>
                    <p style="color: #64748b; margin-top: 5px; font-size: 1.1rem;">
                        Zarządzanie budżetem: <span style="font-weight: 700; color: #1e293b;">${teamData.team_name}</span>
                    </p>
                </div>
                <div style="background: white; padding: 15px 25px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; text-align: right;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Aktualne Saldo</span>
                    <div style="font-size: 1.8rem; font-weight: 900; color: #059669;">$${teamData.balance.toLocaleString()}</div>
                </div>
            </header>

            <!-- KPI CARDS -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 40px;">
                ${renderStatCard('PRZYCHODY (7D)', stats.income7d, '#10b981', '↑')}
                ${renderStatCard('WYDATKI (7D)', stats.expense7d, '#ef4444', '↓')}
                ${renderStatCard('PENSJE TYGODNIOWE', weeklySalaries, '#f58426', '∑')}
                ${renderStatCard('PROGNOZA BILANSU', weeklyForecast, weeklyForecast >= 0 ? '#3b82f6' : '#ef4444', '⇄')}
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px;">
                
                <!-- LEFT COLUMN: STRUCTURE & LOGS -->
                <div style="display: flex; flex-direction: column; gap: 40px;">
                    
                    <!-- CASHFLOW STRUCTURE -->
                    <div style="background: white; border-radius: 24px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                        <h3 style="margin: 0 0 24px 0; font-size: 1.25rem; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                            <span style="width: 8px; height: 24px; background: #f58426; border-radius: 4px;"></span>
                            Struktura Przepływów
                        </h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            ${renderFinancialBar('Bilety & Arena', stats.cat_tickets, stats.max_cat, '#3b82f6')}
                            ${renderFinancialBar('Merchandising', stats.cat_merch, stats.max_cat, '#3b82f6')}
                            ${renderFinancialBar('Umowy Sponsorskie', stats.cat_sponsors, stats.max_cat, '#3b82f6')}
                            ${renderFinancialBar('Rynek Transferowy', stats.cat_transfers, stats.max_cat, '#3b82f6')}
                            <div style="height: 1px; background: #f1f5f9; margin: 10px 0;"></div>
                            ${renderFinancialBar('Koszty Operacyjne (Pensje)', -weeklySalaries, stats.max_cat, '#ef4444')}
                        </div>
                    </div>

                    <!-- RECENT TRANSACTIONS -->
                    <div style="background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                        <div style="padding: 20px 32px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; letter-spacing: 0.5px;">OSTATNIE TRANSAKCJE</span>
                            <span style="font-size: 0.75rem; opacity: 0.7;">Ostatnie 50 wpisów</span>
                        </div>
                        <div style="max-height: 500px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f8fafc; position: sticky; top: 0;">
                                    <tr>
                                        <th style="text-align: left; padding: 15px 32px; font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Data</th>
                                        <th style="text-align: left; padding: 15px 32px; font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Opis</th>
                                        <th style="text-align: right; padding: 15px 32px; font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Kwota</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logs && logs.length > 0 ? logs.map(log => `
                                        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                            <td style="padding: 16px 32px; color: #94a3b8; font-size: 0.85rem;">${new Date(log.created_at).toLocaleDateString()}</td>
                                            <td style="padding: 16px 32px; font-weight: 600; color: #1e293b;">${log.description}</td>
                                            <td style="padding: 16px 32px; text-align: right; color: ${log.amount > 0 ? '#10b981' : '#ef4444'}; font-weight: 700;">
                                                ${log.amount > 0 ? '+' : ''}${log.amount.toLocaleString()} $
                                            </td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="3" style="padding: 40px; text-align: center; color: #94a3b8;">Brak zarejestrowanych operacji</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN: MANAGEMENT -->
                <div style="display: flex; flex-direction: column; gap: 30px;">
                    
                    <!-- PRICING STRATEGY -->
                    <div style="background: #1e293b; color: white; border-radius: 24px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 20px 0; color: #f58426; font-size: 1.1rem;">Strategia Biletowa</h3>
                        
                        <div style="margin-top: 25px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px;">
                                <label style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Cena za bilet</label>
                                <span id="ticket-price-display" style="font-size: 1.5rem; font-weight: 800; color: #f58426;">$${teamData.ticket_price || 25}</span>
                            </div>
                            
                            <input type="range" min="10" max="250" value="${teamData.ticket_price || 25}" 
                                style="width: 100%; height: 6px; background: #334155; border-radius: 3px; appearance: none; cursor: pointer;"
                                oninput="document.getElementById('ticket-price-display').innerText = '$' + this.value"
                                onchange="updateTicketPrice('${teamData.id}', this.value)">
                            
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #64748b; margin-top: 10px; font-weight: 600;">
                                <span>POPOULARNOŚĆ</span>
                                <span>ZYSK / FAN</span>
                            </div>
                            
                            <div style="margin-top: 30px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; font-size: 0.8rem; line-height: 1.5; color: #cbd5e1;">
                                💡 <strong>Wskazówka:</strong> Przy obecnej sile składu, optymalna cena to <strong>$35 - $45</strong>.
                            </div>
                        </div>

                        <button onclick="handleArenaExpansion()" 
                            style="width: 100%; background: #f58426; color: white; border: none; padding: 18px; border-radius: 12px; margin-top: 30px; font-weight: 800; cursor: pointer; transition: transform 0.2s, background 0.2s;"
                            onmouseover="this.style.background='#e67616'; this.style.transform='translateY(-2px)'"
                            onmouseout="this.style.background='#f58426'; this.style.transform='translateY(0)'">
                            MODERNIZUJ ARENĘ
                        </button>
                    </div>

                    <!-- STAFF COSTS -->
                    <div style="background: white; border-radius: 24px; padding: 25px; border: 1px solid #e2e8f0;">
                        <h4 style="margin: 0 0 15px 0; color: #0f172a; font-size: 1rem;">Sztab & Administracja</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <span style="color: #64748b; font-size: 0.9rem;">Koszty stałe:</span>
                            <span style="font-weight: 700; color: #ef4444;">$12,500 / tydz.</span>
                        </div>
                        <button style="width: 100%; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; font-weight: 700; color: #475569; cursor: pointer;">
                            Zarządzaj Sztabem
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `;
}

// --- FUNKCJE POMOCNICZE ---

function renderStatCard(label, value, color, icon) {
    return `
        <div style="background: white; padding: 24px; border-radius: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; position: relative; overflow: hidden;">
            <div style="font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">${label}</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: ${color};">${value.toLocaleString()} $</div>
            <div style="position: absolute; right: 20px; bottom: 15px; font-size: 2rem; opacity: 0.1; color: ${color}; font-weight: 900;">${icon}</div>
        </div>
    `;
}

function renderFinancialBar(label, value, max, color) {
    const percentage = Math.max(5, Math.min(100, (Math.abs(value) / Math.abs(max)) * 100));
    return `
        <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; color: #475569;">
                <span>${label}</span>
                <span style="color: ${color}; font-weight: 800;">${value.toLocaleString()} $</span>
            </div>
            <div style="width: 100%; height: 10px; background: #f1f5f9; border-radius: 20px; overflow: hidden;">
                <div style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: 20px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
        </div>
    `;
}

function calculateDetailedStats(logs) {
    const stats = {
        income7d: 0, expense7d: 0,
        cat_tickets: 0, cat_merch: 0, cat_sponsors: 0, cat_transfers: 0,
        max_cat: 50000 
    };

    if (!logs) return stats;

    logs.forEach(log => {
        const val = Math.abs(log.amount);
        if (log.amount > 0) {
            stats.income7d += val;
            if (log.category === 'tickets') stats.cat_tickets += val;
            if (log.category === 'merch') stats.cat_merch += val;
            if (log.category === 'sponsors') stats.cat_sponsors += val;
        } else {
            stats.expense7d += val;
            if (log.category === 'transfers') stats.cat_transfers += val;
        }
    });

    stats.max_cat = Math.max(stats.cat_tickets, stats.cat_merch, stats.cat_sponsors, stats.cat_transfers, 50000);
    return stats;
}

async function calculateTotalSalaries(teamId) {
    const { data } = await supabaseClient.from('players').select('salary').eq('team_id', teamId);
    return data ? data.reduce((sum, p) => sum + (p.salary || 0), 0) : 0;
}

// --- AKCJE UŻYTKOWNIKA ---

window.updateTicketPrice = async (teamId, newPrice) => {
    try {
        const { error } = await supabaseClient
            .from('teams')
            .update({ ticket_price: parseInt(newPrice) })
            .eq('id', teamId);

        if (error) throw error;
        console.log("Cena biletów zaktualizowana pomyślnie.");
    } catch (err) {
        console.error("Błąd aktualizacji ceny:", err);
        alert("Nie udało się zaktualizować ceny biletów.");
    }
};

window.handleArenaExpansion = () => {
    alert("Funkcja rozbudowy areny zostanie odblokowana w następnej aktualizacji (V 2.2).");
};
