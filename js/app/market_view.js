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
                    <select id="f-pos"><option value="">All Positions</option><option value="PG">PG</option><option value="SG">SG</option><option value="SF">SF</option><option value="PF">PF</option><option value="C">C</option></select>
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

    const { data, error } = await supabaseClient.from('transfer_market').select('*, players(*)').eq('status', 'active');
    if (error) return;

    list.innerHTML = data.map(item => renderPlayerCard(item)).join('');
}

function renderPlayerCard(item) {
    const p = item.players;
    const marketVal = calculateMarketValue(p);

    // Mapowanie skilli na format angielski
    const skills = [
        { label: 'JS', val: p.jump_shot, name: 'Jump Shot' },
        { label: 'JR', val: p.range, name: 'Jump Range' },
        { label: 'OD', val: p.outside_def, name: 'Outside Def.' },
        { label: 'HA', val: p.handling, name: 'Handling' },
        { label: 'DR', val: p.driving, name: 'Driving' },
        { label: 'PA', val: p.passing, name: 'Passing' },
        { label: 'IS', val: p.inside_shot, name: 'Inside Shot' },
        { label: 'ID', val: p.inside_def, name: 'Inside Def.' },
        { label: 'RE', val: p.rebounding, name: 'Rebounding' },
        { label: 'BL', val: p.blocking, name: 'Blocking' }
    ];

    return `
        <div class="player-card">
            <div class="card-side-accent" style="background: ${getOvrColor(p.overall_rating)}"></div>
            <div class="card-main">
                <div class="card-header">
                    <div class="p-info">
                        <span class="p-pos">${p.position}</span>
                        <h3>${p.first_name[0]}. ${p.last_name}</h3>
                        <span class="p-meta">Age: ${p.age} | Height: ${p.height}cm</span>
                    </div>
                    <div class="p-ovr" style="border-color: ${getOvrColor(p.overall_rating)}">
                        ${p.overall_rating}
                    </div>
                </div>

                <div class="skills-graph">
                    ${skills.map(s => `
                        <div class="skill-bar-wrapper">
                            <span class="skill-label">${s.label}</span>
                            <div class="bar-bg">
                                <div class="bar-fill" style="width: ${(s.val/15)*100}%; background: ${getSkillColor(s.val)}"></div>
                            </div>
                            <span class="skill-val">${s.val}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="card-footer">
                    <div class="price-section">
                        <div class="price-tag">$${item.current_price.toLocaleString()}</div>
                        <div class="valuation">Est. Value: $${marketVal.toLocaleString()}</div>
                    </div>
                    <button class="bid-btn" onclick="handleBid('${item.id}', ${item.current_price})">BID</button>
                </div>
            </div>
        </div>
    `;
}

function getSkillColor(v) {
    if (v >= 12) return '#f59e0b'; // Gold
    if (v >= 9) return '#10b981';  // Green
    if (v >= 6) return '#3b82f6';  // Blue
    return '#94a3b8';              // Grey
}

function getOvrColor(ovr) {
    if (ovr >= 80) return '#f59e0b';
    if (ovr >= 70) return '#10b981';
    return '#3b82f6';
}
