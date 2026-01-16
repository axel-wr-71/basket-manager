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
                    <h1>Transfer Market</h1>
                    <div class="market-budget">Available Funds: <span>$${teamData.balance.toLocaleString()}</span></div>
                </div>
                <div class="market-filters">
                    <select id="f-pos">
                        <option value="">All Positions</option>
                        <option value="PG">PG - Point Guard</option>
                        <option value="SG">SG - Shooting Guard</option>
                        <option value="SF">SF - Small Forward</option>
                        <option value="PF">PF - Power Forward</option>
                        <option value="C">C - Center</option>
                    </select>
                    <input type="number" id="f-min-ovr" placeholder="Min OVR">
                    <input type="number" id="f-max-age" placeholder="Max Age">
                    <button id="btn-search-market">APPLY FILTERS</button>
                </div>
            </div>

            <div id="market-listings" class="market-grid">
                </div>
        </div>
    `;

    document.getElementById('btn-search-market').onclick = () => loadMarketData();
    await loadMarketData();
}

async function loadMarketData() {
    const list = document.getElementById('market-listings');
    list.innerHTML = '<div class="loader">Scanning market...</div>';

    try {
        const { data, error } = await supabaseClient
            .from('transfer_market')
            .select('*, players(*)')
            .eq('status', 'active');

        if (error) throw error;

        const fPos = document.getElementById('f-pos').value;
        const fMinOvr = document.getElementById('f-min-ovr').value;
        const fMaxAge = document.getElementById('f-max-age').value;

        const filtered = data.filter(item => {
            const p = item.players;
            if (!p) return false;
            return (!fPos || p.position === fPos) &&
                   (!fMinOvr || p.overall_rating >= parseInt(fMinOvr)) &&
                   (!fMaxAge || p.age <= parseInt(fMaxAge));
        });

        if (filtered.length === 0) {
            list.innerHTML = '<div class="no-results">No players found matching criteria.</div>';
            return;
        }

        list.innerHTML = filtered.map(item => renderPlayerCard(item)).join('');

    } catch (err) {
        console.error("Market Load Error:", err);
        list.innerHTML = `<div class="error">Error loading market data.</div>`;
    }
}

function renderPlayerCard(item) {
    const p = item.players;
    const marketVal = calculateMarketValue(p);
    
    // Pobieramy kolor przypisany do pozycji
    const posColor = getPosColor(p.position);

    // Mapowanie skilli (dodano || 0 dla bezpieczeństwa przed undefined)
    const skills = [
        { label: 'JS', val: p.jump_shot || 0 },
        { label: 'JR', val: p.range || 0 },
        { label: 'OD', val: p.outside_def || 0 },
        { label: 'HA', val: p.handling || 0 },
        { label: 'DR', val: p.driving || 0 },
        { label: 'PA', val: p.passing || 0 },
        { label: 'IS', val: p.inside_shot || 0 },
        { label: 'ID', val: p.inside_def || 0 },
        { label: 'RE', val: p.rebounding || 0 },
        { label: 'BL', val: p.blocking || 0 }
    ];

    return `
        <div class="player-card">
            <div class="card-side-accent" style="background: ${posColor}"></div>
            <div class="card-main">
                <div class="card-header">
                    <div class="p-info">
                        <span class="p-pos" style="color: ${posColor}">${p.position}</span>
                        <h3>${p.first_name ? p.first_name[0] : ''}. ${p.last_name}</h3>
                        <span class="p-meta">Age: ${p.age} | Height: ${p.height}cm</span>
                    </div>
                    <div class="p-ovr" style="border-color: ${posColor}; color: ${posColor}">
                        ${p.overall_rating}
                    </div>
                </div>

                <div class="skills-grid-compact">
                    ${skills.map(s => `
                        <div class="skill-item">
                            <span class="s-label">${s.label}</span>
                            <div class="s-bar-bg">
                                <div class="s-bar-fill" style="width: ${(s.val/15)*100}%; background: ${posColor}"></div>
                            </div>
                            <span class="s-val">${s.val}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="card-footer">
                    <div class="price-section">
                        <div class="price-tag">$${item.current_price.toLocaleString()}</div>
                        <div class="valuation">Est. Value: $${marketVal.toLocaleString()}</div>
                    </div>
                    <button class="bid-btn" 
                        style="background: ${posColor}15; color: ${posColor}; border: 1px solid ${posColor}"
                        onclick="handleBid('${item.id}', ${item.current_price})">
                        BID
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Kolory zależne od pozycji zawodnika
function getPosColor(pos) {
    const colors = {
        'PG': '#3b82f6', // Blue
        'SG': '#60a5fa', // Light Blue
        'SF': '#f59e0b', // Orange
        'PF': '#fb923c', // Light Orange
        'C':  '#10b981'  // Green
    };
    return colors[pos] || '#94a3b8';
}

// Globalna funkcja licytacji (do podpięcia pod Supabase w kolejnym kroku)
window.handleBid = function(listingId, currentPrice) {
    console.log(`Bidding on ${listingId} starting from ${currentPrice}`);
    // Tu dodamy logikę zapisu do bazy
};
