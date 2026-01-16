// js/app/market_view.js
import { supabaseClient } from '../auth.js';
import { calculateMarketValue } from '../core/economy.js';

export async function renderMarketView(teamData) {
    const container = document.getElementById('market-container');
    if (!container) return;

    container.innerHTML = `
        <div class="market-modern-wrapper">
            <div class="market-top-bar">
                <div class="market-title">
                    <h1>Scouting & Market</h1>
                    <div class="market-budget">Budget: <span>$${teamData.balance.toLocaleString()}</span></div>
                </div>
                <div class="market-filters">
                    <select id="f-pos"><option value="">All Positions</option><option value="PG">PG</option><option value="SG">SG</option><option value="SF">SF</option><option value="PF">PF</option><option value="C">C</option></select>
                    <button id="btn-search-market">REFRESH LIST</button>
                </div>
            </div>
            <div id="market-listings" class="market-grid"></div>
        </div>
    `;

    document.getElementById('btn-search-market').onclick = () => loadMarketData();
    await loadMarketData();
}

async function loadMarketData() {
    const list = document.getElementById('market-listings');
    list.innerHTML = '<div class="loader">Analyzing prospects...</div>';

    const { data, error } = await supabaseClient.from('transfer_market').select('*, players(*)').eq('status', 'active');
    
    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    list.innerHTML = data.map(item => renderPlayerCard(item)).join('');
}

// Funkcja rysująca mały wykres liniowy SVG
function generateSparkline(values, color) {
    const width = 100;
    const height = 30;
    const maxVal = 15; // Max skill level
    const step = width / (values.length - 1);
    
    const points = values.map((v, i) => {
        const x = i * step;
        const y = height - (v / maxVal * height);
        return `${x},${y}`;
    }).join(' ');

    return `
        <svg viewBox="0 0 ${width} ${height}" class="sparkline">
            <polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" />
        </svg>
    `;
}

function renderPlayerCard(item) {
    const p = item.players;
    const marketVal = calculateMarketValue(p);
    const accentColor = getPosColor(p.position);

    // KATEGORIE (Upewnij się, że nazwy p.nazwa są identyczne z Twoją bazą!)
    const offSkills = [p.jump_shot || 0, p.range || 0, p.inside_shot || 0, p.passing || 0];
    const defSkills = [p.outside_def || 0, p.inside_def || 0, p.rebounding || 0, p.blocking || 0];
    const genSkills = [p.handling || 0, p.driving || 0, p.stamina || 5, p.experience || 2];

    return `
        <div class="player-card">
            <div class="card-side-accent" style="background: ${accentColor}"></div>
            <div class="card-main">
                <div class="card-header">
                    <div class="p-info">
                        <span class="p-pos" style="background: ${accentColor}20; color: ${accentColor}">${p.position}</span>
                        <h3>${p.first_name[0]}. ${p.last_name}</h3>
                        <p class="p-meta">Age: ${p.age} | ${p.height}cm</p>
                    </div>
                    <div class="p-ovr" style="border-color: ${accentColor}">${p.overall_rating}</div>
                </div>

                <div class="scouting-report">
                    <div class="report-segment">
                        <div class="segment-label">ATTACK</div>
                        ${generateSparkline(offSkills, accentColor)}
                    </div>
                    <div class="report-segment">
                        <div class="segment-label">DEFENSE</div>
                        ${generateSparkline(defSkills, accentColor)}
                    </div>
                    <div class="report-segment">
                        <div class="segment-label">GENERAL</div>
                        ${generateSparkline(genSkills, '#94a3b8')}
                    </div>
                </div>

                <div class="card-footer">
                    <div class="price-box">
                        <span class="price-val">$${item.current_price.toLocaleString()}</span>
                        <span class="price-est">Valuation: $${marketVal.toLocaleString()}</span>
                    </div>
                    <button class="bid-btn" style="background: ${accentColor}" onclick="handleBid('${item.id}')">BID</button>
                </div>
            </div>
        </div>
    `;
}

function getPosColor(pos) {
    const colors = { 'PG': '#3b82f6', 'SG': '#60a5fa', 'SF': '#f59e0b', 'PF': '#fb923c', 'C': '#10b981' };
    return colors[pos] || '#94a3b8';
}
