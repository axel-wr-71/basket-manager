// js/app/finances_view.js
import { supabaseClient } from '../auth.js';

export async function renderFinancesView(teamData) {
    const container = document.getElementById('finances-container');
    if (!container) return;

    // Pobieramy logi finansowe z podziałem na kategorie
    const { data: logs } = await supabaseClient
        .from('financial_logs')
        .select('*')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false });

    const stats = calculateDetailedStats(logs);
    const weeklySalaries = await calculateTotalSalaries(teamData.id);

    container.innerHTML = `
        <div style="padding: 30px; font-family: 'Inter', sans-serif; background: #f4f7f6; min-height: 100vh;">
            <header style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h1 style="font-size: 2em; font-weight: 800; color: #1a237e; margin:0;">FINANCIAL <span style="color: #e65100;">REPORT</span></h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Sezon 2026 | Raport bieżący dla <strong>${teamData.team_name}</strong></p>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.8em; font-weight: 800; color: #999; text-transform: uppercase;">Dostępne środki</span>
                    <div style="font-size: 2.2em; font-weight: 900; color: #2e7d32;">$${teamData.balance.toLocaleString()}</div>
                </div>
            </header>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                ${renderStatCard('PRZYCHODY (7D)', stats.income7d, '#2e7d32')}
                ${renderStatCard('WYDATKI (7D)', stats.expense7d, '#d32f2f')}
                ${renderStatCard('BILANS NETTO', stats.income7d - stats.expense7d, '#1a237e')}
                ${renderStatCard('PENSJE / TYDZIEŃ', weeklySalaries, '#e65100')}
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
                
                <div>
                    <div style="background: white; border-radius: 20px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e0e0e0;">
                        <h3 style="margin-top: 0; color: #1a237e; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px;">Struktura Dochodów i Wydatków</h3>
                        
                        <div style="margin-top: 20px;">
                            ${renderFinancialBar('Bilety & Arena', stats.cat_tickets, stats.max_cat)}
                            ${renderFinancialBar('Merchandising', stats.cat_merch, stats.max_cat)}
                            ${renderFinancialBar('Sponsorzy', stats.cat_sponsors, stats.max_cat)}
                            ${renderFinancialBar('Transfery', stats.cat_transfers, stats.max_cat)}
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            ${renderFinancialBar('Pensje Zawodników', -weeklySalaries, stats.max_cat, '#d32f2f')}
                        </div>
                    </div>

                    <div style="background: white; border-radius: 20px; margin-top: 30px; border: 1px solid #e0e0e0; overflow: hidden;">
                        <div style="padding: 20px; background: #1a237e; color: white; font-weight: 800;">REJESTR TRANSAKCJI</div>
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                ${logs && logs.length > 0 ? logs.map(log => `
                                    <tr style="border-bottom: 1px solid #f8f9fa;">
                                        <td style="padding: 15px; color: #999; font-size: 0.85em;">${new Date(log.created_at).toLocaleDateString()}</td>
                                        <td style="padding: 15px; font-weight: 600;">${log.description}</td>
                                        <td style="padding: 15px; text-align: right; color: ${log.amount > 0 ? '#2e7d32' : '#d32f2f'}; font-weight: 800;">
                                            ${log.amount > 0 ? '+' : ''}${log.amount.toLocaleString()} $
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="3" style="padding: 30px; text-align: center; color: #999;">Brak danych finansowych</td></tr>'}
                            </table>
                        </div>
                    </div>
                </div>

                <div>
                    <div style="background: #1a237e; color: white; border-radius: 20px; padding: 25px; box-shadow: 0 10px 20px rgba(26,35,126,0.2);">
                        <h3 style="margin-top: 0; color: #ffca28;">Centrum Zarządzania</h3>
                        
                        <div style="margin-top: 20px;">
                            <label style="font-size: 0.8em; font-weight: 700;">CENA BILETU ($)</label>
                            <input type="range" min="10" max="200" value="${teamData.ticket_price || 25}" 
                                style="width: 100%; margin: 10px 0;" onchange="updateTicketPrice(this.value)">
                            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1em;">
                                <span>$10</span>
                                <span style="color: #ffca28;">$${teamData.ticket_price || 25}</span>
                                <span>$200</span>
                            </div>
                            <p style="font-size: 0.75em; opacity: 0.8; margin-top: 10px;">Wyższa cena zmniejsza frekwencję, ale zwiększa zysk z jednego fana.</p>
                        </div>

                        <button onclick="alert('Inwestycja w halę w budowie...')" 
                            style="width: 100%; background: #e65100; color: white; border: none; padding: 15px; border-radius: 10px; margin-top: 30px; font-weight: 800; cursor: pointer;">
                            ROZBUDUJ ARENĘ
                        </button>
                    </div>

                    <div style="background: white; border-radius: 20px; padding: 25px; margin-top: 30px; border: 1px solid #e0e0e0;">
                        <h4 style="margin: 0 0 15px 0; color: #1a237e;">Sztab Szkoleniowy</h4>
                        <p style="font-size: 0.85em; color: #666;">Koszty personelu pomocniczego: <strong>$12,500 / tydz.</strong></p>
                        <button style="width: 100%; background: #f0f2f5; border: 1px solid #ddd; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">Zarządzaj Sztabem</button>
                    </div>
                </div>

            </div>
        </div>
    `;
}

// FUNKCJE POMOCNICZE DO RENDEROWANIA

function renderStatCard(label, value, color) {
    return `
        <div style="background: white; padding: 20px; border-radius: 15px; border-bottom: 4px solid ${color}; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <div style="font-size: 0.7em; font-weight: 800; color: #999; margin-bottom: 5px;">${label}</div>
            <div style="font-size: 1.4em; font-weight: 800; color: ${color};">${value.toLocaleString()} $</div>
        </div>
    `;
}

function renderFinancialBar(label, value, max, color = '#1a237e') {
    const percentage = Math.abs(max) > 0 ? (Math.abs(value) / Math.abs(max)) * 100 : 0;
    return `
        <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85em; font-weight: 700; margin-bottom: 5px;">
                <span>${label}</span>
                <span style="color: ${color}">${value.toLocaleString()} $</span>
            </div>
            <div style="width: 100%; height: 8px; background: #f0f2f5; border-radius: 4px; overflow: hidden;">
                <div style="width: ${percentage}%; height: 100%; background: ${color}; transition: 0.5s;"></div>
            </div>
        </div>
    `;
}

function calculateDetailedStats(logs) {
    const stats = {
        income7d: 0, expense7d: 0,
        cat_tickets: 0, cat_merch: 0, cat_sponsors: 0, cat_transfers: 0,
        max_cat: 50000 // Punkt odniesienia dla pasków postępu
    };

    if (!logs) return stats;

    logs.forEach(log => {
        if (log.amount > 0) {
            stats.income7d += log.amount;
            if (log.category === 'tickets') stats.cat_tickets += log.amount;
            if (log.category === 'merch') stats.cat_merch += log.amount;
            if (log.category === 'sponsors') stats.cat_sponsors += log.amount;
        } else {
            stats.expense7d += Math.abs(log.amount);
            if (log.category === 'transfers') stats.cat_transfers += Math.abs(log.amount);
        }
    });

    stats.max_cat = Math.max(stats.cat_tickets, stats.cat_merch, stats.cat_sponsors, stats.expense7d, 50000);
    return stats;
}

async function calculateTotalSalaries(teamId) {
    const { data } = await supabaseClient.from('players').select('salary').eq('team_id', teamId);
    return data ? data.reduce((sum, p) => sum + (p.salary || 0), 0) : 0;
}

window.updateTicketPrice = async (newPrice) => {
    console.log("Aktualizacja ceny biletów na:", newPrice);
    // Tutaj dodamy update do Supabase
};
