// js/app/market_view.js
import { supabaseClient } from '../auth.js';
import { calculateMarketValue } from '../core/economy.js';

let currentPage = 1;
const pageSize = 20;
let allMarketData = [];

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
                        <option value="PG">PG</option><option value="SG">SG</option>
                        <option value="SF">SF</option><option value="PF">PF</option>
                        <option value="C">C</option>
                    </select>
                    <button id="btn-search-market">REFRESH</button>
                </div>
            </div>
            
            <div id="market-listings" class="market-grid"></div>

            <div class="market-pagination">
                <button id="prev-page" class="pag-btn">← Previous</button>
                <span id="page-info">Page 1</span>
                <button id="next-page" class="pag-btn">Next →</button>
            </div>
        </div>
    `;

    document.getElementById('btn-search-market').onclick = () => {
        currentPage = 1;
        loadMarketData();
    };

    document.getElementById('prev-page').onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
        }
    };

    document.getElementById('next-page').onclick = () => {
        if (currentPage * pageSize < allMarketData.length) {
            currentPage++;
            displayCurrentPage();
        }
    };

    await loadMarketData();
}

async function loadMarketData() {
    const list = document.getElementById('market-listings');
    list.innerHTML = '<div class="loader">Analyzing prospects...</div>';

    const { data, error } = await supabaseClient
        .from('transfer_market')
        .select('*, players(*)')
        .eq('status', 'active');
    
    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    allMarketData = data || [];
    displayCurrentPage();
}

function displayCurrentPage() {
    const list = document.getElementById('market-listings');
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = allMarketData.slice(start, end);

    if (pageData.length === 0) {
        list.innerHTML = '<div class="no-results">No players found.</div>';
    } else {
        list.innerHTML = pageData.map(item => renderPlayerCard(item)).join('');
    }

    document.getElementById('page-info').innerText = `Page ${currentPage} of ${Math.ceil(allMarketData.length / pageSize) || 1}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = end >= allMarketData.length;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPlayerCard(item) {
    const p = item.players;
    if (!p) return '';

    const marketVal = calculateMarketValue(p);
    const accentColor = getPosColor(p.position);

    const scoutingReport = {
        attack: [
            { label: 'Jump Shot (2PT)', val: p.skill_2pt },
            { label: 'Range (3PT)', val: p.skill_3pt },
            { label: 'Dunk/Inside', val: p.skill_dunk },
            { label: 'Passing', val: p.skill_passing }
        ],
        defense: [
            { label: '1on1 Defense', val: p.skill_1on1_def },
            { label: 'Rebounding', val: p.skill_rebound },
            { label: 'Blocking', val: p.skill_block },
            { label: 'Stealing', val: p.skill_steal }
        ],
        general: [
            { label: 'Handling', val: p.skill_dribbling },
            { label: '1on1 Offense', val: p.skill_1on1_off },
            { label: 'Stamina', val: p.skill_stamina },
            { label: 'Free Throw', val: p.skill_ft }
        ]
    };

    const renderRows = (skills) => skills.map(s => `
        <div class="skill-row-numeric">
            <span class="s-name">${s.label}</span>
            <span class="s-dots"></span>
            <span class="s-value" style="color: ${accentColor}">${s.val ?? 0}</span>
        </div>
    `).join('');

    return `
        <div class="player-card">
            <div class="card-side-accent" style="background: ${accentColor}"></div>
            <div class="card-main">
                <div class="card-header">
                    <div class="p-info">
                        <h3>${p.first_name} ${p.last_name}</h3>
                        <div class="p-sub-header">
                            <span class="p-pos-tag" style="background: ${accentColor}">${p.position}</span>
                            <span class="p-salary">Salary: <strong>$${(p.salary || 0).toLocaleString()}</strong></span>
                        </div>
                        <p class="p-meta">Age: ${p.age} | Height: ${p.height || '---'} cm</p>
                    </div>
                    <div class="p-ovr" style="border-color: ${accentColor}; color: ${accentColor}">${p.overall_rating}</div>
                </div>

                <div class="scouting-report-numeric">
                    <div class="report-section">
                        <h4>ATTACK</h4>
                        ${renderRows(scoutingReport.attack)}
                    </div>
                    <div class="report-section">
                        <h4>DEFENSE</h4>
                        ${renderRows(scoutingReport.defense)}
                    </div>
                    <div class="report-section">
                        <h4>GENERAL</h4>
                        ${renderRows(scoutingReport.general)}
                    </div>
                </div>

                <div class="card-footer">
                    <div class="price-box">
                        <span class="price-val">$${item.current_price.toLocaleString()}</span>
                        <span class="price-est">Valuation: $${marketVal.toLocaleString()}</span>
                    </div>
                    <button class="bid-btn" style="background: ${accentColor}" onclick="handleBid('${item.id}', ${item.current_price})">BID</button>
                </div>
            </div>
        </div>
    `;
}

function getPosColor(pos) {
    const colors = { 'PG': '#3b82f6', 'SG': '#60a5fa', 'SF': '#f59e0b', 'PF': '#fb923c', 'C': '#10b981' };
    return colors[pos] || '#94a3b8';
}

window.handleBid = async (marketId, currentPrice) => {
    console.log(`Bidding for ${marketId} at ${currentPrice}`);
};
