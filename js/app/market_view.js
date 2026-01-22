// js/app/market_view.js
import { supabaseClient } from '../auth.js';

let currentPage = 1;
const pageSize = 20;
let allMarketData = [];
let currentFilters = {
    position: '',
    minAge: '',
    maxAge: '',
    minPrice: '',
    maxPrice: '',
    potential: '',
    offerType: 'all'
};

// Tymczasowa funkcja obliczająca wartość rynkową (jeśli economy.js nie istnieje)
function calculateMarketValue(player) {
    if (!player) return 0;
    const ovr = calculatePlayerOVR(player);
    const ageFactor = player.age <= 25 ? 1.5 : player.age <= 30 ? 1.0 : 0.7;
    return Math.round((ovr * 10000 + (player.salary || 0) * 2) * ageFactor);
}

function calculatePlayerOVR(player) {
    if (!player) return 0;
    
    const skills = [
        player.skill_2pt, player.skill_3pt, player.skill_dunk, player.skill_ft,
        player.skill_passing, player.skill_dribbling, player.skill_stamina,
        player.skill_rebound, player.skill_block, player.skill_steal,
        player.skill_1on1_off, player.skill_1on1_def
    ];
    
    const sum = skills.reduce((a, b) => (a || 0) + (b || 0), 0);
    return Math.round((sum / 240) * 100);
}

export async function renderMarketView(teamData, players = []) {
    const container = document.getElementById('market-view-container');
    
    console.log("[MARKET] Container:", container);
    console.log("[MARKET] Team data:", teamData);
    
    if (!container) {
        console.error("[MARKET] Container #market-view-container not found!");
        return;
    }

    if (!teamData || !teamData.id) {
        console.error("[MARKET] Invalid team data:", teamData);
        container.innerHTML = '<div style="padding: 50px; text-align: center; color: red;">Error: Team data missing</div>';
        return;
    }

    window.currentTeamId = teamData.id;
    window.currentTeamBalance = teamData.balance || 0;

    container.innerHTML = `
        <div class="market-modern-wrapper">
            <div class="market-management-header" style="padding: 20px 0 30px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
                <div>
                    <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase; font-family: 'Inter', sans-serif; font-size: 1.8rem;">
                        TRANSFER <span style="color:#e65100">MARKET</span>
                    </h1>
                    <p style="margin:10px 0 0 0; color:#64748b; font-size: 0.95rem;">
                        Manage your team's finances and sign new talent | 
                        <span style="color:#1a237e; font-weight:600;">Available funds: $${(teamData.balance || 0).toLocaleString()}</span>
                    </p>
                </div>
                <div style="background:#1a237e; color:white; padding:12px 24px; border-radius:12px; font-weight:700; font-size:0.9rem; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 12px rgba(26,35,126,0.2);">
                    <span style="font-size: 1.2rem;">💰</span>
                    $${(teamData.balance || 0).toLocaleString()}
                </div>
            </div>

            <div class="filters-panel" style="background: #fff; border-radius: 12px; padding: 24px; margin: 25px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin:0; font-size: 1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                        Player Search Filters
                    </h3>
                    <button id="btn-reset-filters" style="background: #f1f5f9; color: #64748b; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">
                        Reset All Filters
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr) 2fr; gap: 15px; align-items: end;">
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 6px; font-weight: 600;">Position</label>
                        <select id="filter-position" class="filter-select">
                            <option value="">All Positions</option>
                            <option value="PG">Point Guard (PG)</option>
                            <option value="SG">Shooting Guard (SG)</option>
                            <option value="SF">Small Forward (SF)</option>
                            <option value="PF">Power Forward (PF)</option>
                            <option value="C">Center (C)</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 6px; font-weight: 600;">Age Range</label>
                        <div style="display: flex; gap: 8px;">
                            <input id="filter-min-age" type="number" min="18" max="35" placeholder="Min" 
                                   style="width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem;">
                            <span style="color: #94a3b8; align-self: center;">-</span>
                            <input id="filter-max-age" type="number" min="18" max="35" placeholder="Max" 
                                   style="width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem;">
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 6px; font-weight: 600;">Price Range ($)</label>
                        <div style="display: flex; gap: 8px;">
                            <input id="filter-min-price" type="number" min="0" placeholder="Min" 
                                   style="width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem;">
                            <span style="color: #94a3b8; align-self: center;">-</span>
                            <input id="filter-max-price" type="number" min="0" placeholder="Max" 
                                   style="width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem;">
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 6px; font-weight: 600;">Potential</label>
                        <select id="filter-potential" class="filter-select">
                            <option value="">All Levels</option>
                            <option value="GOAT">G.O.A.T. 🐐</option>
                            <option value="Elite Franchise">Elite Franchise ★</option>
                            <option value="Franchise Player">Franchise Player ★</option>
                            <option value="All-Star Caliber">All-Star Caliber</option>
                            <option value="Starter">Starter</option>
                            <option value="Sixth Man">Sixth Man</option>
                            <option value="Rotation Player">Rotation Player</option>
                            <option value="Deep Bench">Deep Bench</option>
                            <option value="Project Player">Project Player</option>
                            <option value="High Prospect">High Prospect</option>
                        </select>
                    </div>

                    <div style="display: flex; gap: 10px; align-items: end;">
                        <button id="btn-search-market" 
                                style="background: #1a237e; color: white; border: none; padding: 10px 24px; border-radius: 8px; 
                                       font-weight: 700; cursor: pointer; font-size: 0.9rem; flex: 1; transition: all 0.2s;">
                            🔍 Search Players
                        </button>
                        <button id="btn-advanced-search" 
                                style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 8px; 
                                       font-weight: 600; cursor: pointer; font-size: 0.85rem;">
                            ⚙️
                        </button>
                    </div>
                </div>

                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                    <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 8px; font-weight: 600;">Offer Type</div>
                    <div style="display: flex; gap: 15px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="radio" name="offerType" value="all" checked style="accent-color: #1a237e;">
                            <span style="font-size: 0.85rem;">All Offers</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="radio" name="offerType" value="auction" style="accent-color: #1a237e;">
                            <span style="font-size: 0.85rem;">Auction Only 🏷️</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="radio" name="offerType" value="buy_now" style="accent-color: #1a237e;">
                            <span style="font-size: 0.85rem;">Buy Now Only ⚡</span>
                        </label>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 10px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #0369a1; font-weight: 600; margin-bottom: 5px;">Total Players</div>
                    <div id="stat-total" style="font-size: 1.5rem; font-weight: 800; color: #0c4a6e;">0</div>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 10px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #15803d; font-weight: 600; margin-bottom: 5px;">Average Price</div>
                    <div id="stat-avg-price" style="font-size: 1.5rem; font-weight: 800; color: #166534;">$0</div>
                </div>
                <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #d97706; font-weight: 600; margin-bottom: 5px;">Youngest</div>
                    <div id="stat-youngest" style="font-size: 1.5rem; font-weight: 800; color: #92400e;">18</div>
                </div>
                <div style="background: #fae8ff; border: 1px solid #f5d0fe; border-radius: 10px; padding: 15px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #a21caf; font-weight: 600; margin-bottom: 5px;">Highest OVR</div>
                    <div id="stat-highest-ovr" style="font-size: 1.5rem; font-weight: 800; color: #86198f;">0</div>
                </div>
            </div>

            <div id="market-listings" class="market-grid"></div>

            <div class="market-pagination" style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                <button id="prev-page" class="pag-btn">← Previous Page</button>
                <div id="page-info" style="font-weight: 600; color: #64748b; font-size: 0.9rem;"></div>
                <button id="next-page" class="pag-btn">Next Page →</button>
            </div>
        </div>
    `;

    document.getElementById('btn-search-market').onclick = () => {
        updateFilters();
        currentPage = 1;
        loadMarketData();
    };

    document.getElementById('btn-reset-filters').onclick = () => {
        resetFilters();
        currentPage = 1;
        loadMarketData();
    };

    document.getElementById('btn-advanced-search').onclick = () => {
        alert('Advanced search options coming soon!');
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

    document.querySelectorAll('input[name="offerType"]').forEach(radio => {
        radio.onchange = () => {
            currentFilters.offerType = document.querySelector('input[name="offerType"]:checked').value;
            currentPage = 1;
            loadMarketData();
        };
    });

    await loadMarketData();
}

function updateFilters() {
    currentFilters = {
        position: document.getElementById('filter-position').value,
        minAge: document.getElementById('filter-min-age').value,
        maxAge: document.getElementById('filter-max-age').value,
        minPrice: document.getElementById('filter-min-price').value,
        maxPrice: document.getElementById('filter-max-price').value,
        potential: document.getElementById('filter-potential').value,
        offerType: document.querySelector('input[name="offerType"]:checked').value
    };
}

function resetFilters() {
    document.getElementById('filter-position').value = '';
    document.getElementById('filter-min-age').value = '';
    document.getElementById('filter-max-age').value = '';
    document.getElementById('filter-min-price').value = '';
    document.getElementById('filter-max-price').value = '';
    document.getElementById('filter-potential').value = '';
    document.querySelector('input[name="offerType"][value="all"]').checked = true;
    
    currentFilters = {
        position: '',
        minAge: '',
        maxAge: '',
        minPrice: '',
        maxPrice: '',
        potential: '',
        offerType: 'all'
    };
}

async function loadMarketData() {
    const list = document.getElementById('market-listings');
    list.innerHTML = '<div class="loader" style="grid-column: 1/-1; text-align: center; padding: 60px; color: #64748b; font-weight: 500;">Analyzing market prospects...</div>';

    let query = supabaseClient
        .from('transfer_market')
        .select('*, players(*, potential_definitions(*))')
        .eq('status', 'active');

    if (currentFilters.position) {
        query = query.eq('players.position', currentFilters.position);
    }

    if (currentFilters.minAge) {
        query = query.gte('players.age', currentFilters.minAge);
    }

    if (currentFilters.maxAge) {
        query = query.lte('players.age', currentFilters.maxAge);
    }

    if (currentFilters.potential) {
        query = query.eq('players.potential_definitions.label', currentFilters.potential);
    }

    if (currentFilters.offerType !== 'all') {
        query = query.eq('type', currentFilters.offerType);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) {
        console.error("Supabase Error:", error);
        list.innerHTML = `<div class="error" style="grid-column: 1/-1; text-align: center; padding: 60px; color: #ef4444; font-weight: 500;">Error: ${error.message}</div>`;
        return;
    }

    allMarketData = data || [];
    
    updateMarketStats(allMarketData);
    
    displayCurrentPage();
}

function updateMarketStats(data) {
    if (data.length === 0) {
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-avg-price').textContent = '$0';
        document.getElementById('stat-youngest').textContent = '0';
        document.getElementById('stat-highest-ovr').textContent = '0';
        return;
    }

    document.getElementById('stat-total').textContent = data.length;

    const avgPrice = Math.round(data.reduce((sum, item) => {
        const price = item.current_price || item.buy_now_price || 0;
        return sum + price;
    }, 0) / data.length);
    document.getElementById('stat-avg-price').textContent = `$${avgPrice.toLocaleString()}`;

    const youngest = Math.min(...data.map(item => item.players.age || 0));
    document.getElementById('stat-youngest').textContent = youngest;

    const highestOVR = Math.max(...data.map(item => calculatePlayerOVR(item.players) || 0));
    document.getElementById('stat-highest-ovr').textContent = highestOVR;
}

function displayCurrentPage() {
    const list = document.getElementById('market-listings');
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = allMarketData.slice(start, end);

    if (pageData.length === 0) {
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #e2e8f0;">
                <div style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;">🏀</div>
                <h3 style="margin: 0 0 10px 0; color: #64748b; font-weight: 600;">No players found</h3>
                <p style="margin: 0; color: #94a3b8; font-size: 0.9rem;">Try adjusting your search filters</p>
            </div>
        `;
    } else {
        list.innerHTML = pageData.map(item => renderPlayerCard(item)).join('');
    }

    const totalPages = Math.ceil(allMarketData.length / pageSize) || 1;
    document.getElementById('page-info').innerText = `Page ${currentPage} of ${totalPages} • ${allMarketData.length} players`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = end >= allMarketData.length;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPlayerCard(item) {
    const p = item.players;
    if (!p) return '';

    const marketVal = calculateMarketValue(p);
    const ovr = calculatePlayerOVR(p);
    const accentColor = getPosColor(p.position);
    const potData = p.potential_definitions || { label: 'Unknown', color: '#94a3b8', icon: '👤' };
    
    const rookieBadge = p.is_rookie ? `<span class="rookie-tag">ROOKIE</span>` : '';
    
    const heightCm = p.height || 0;
    const inchesTotal = heightCm * 0.393701;
    const ft = Math.floor(inchesTotal / 12);
    const inc = Math.round(inchesTotal % 12);
    const heightInFt = heightCm > 0 ? `${ft}'${inc}"` : '--';

    const skills = {
        '2PT': p.skill_2pt || 0,
        '3PT': p.skill_3pt || 0,
        'DUNK': p.skill_dunk || 0,
        'PASS': p.skill_passing || 0,
        'DRIB': p.skill_dribbling || 0,
        'REB': p.skill_rebound || 0,
        'BLK': p.skill_block || 0,
        'STL': p.skill_steal || 0,
        'STAM': p.skill_stamina || 0,
        '1v1O': p.skill_1on1_off || 0,
        '1v1D': p.skill_1on1_def || 0,
        'FT': p.skill_ft || 0
    };

    let actionButtons = '';
    let priceInfo = '';
    
    if (item.type === 'auction' || item.type === 'both') {
        const bidPrice = item.current_price || 0;
        const bidEnds = item.auction_ends ? new Date(item.auction_ends).toLocaleDateString() : 'Soon';
        priceInfo = `
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-size: 0.75rem; color: #92400e; font-weight: 600;">Auction Price</span>
                    <span style="font-size: 1.1rem; font-weight: 800; color: #d97706;">$${bidPrice.toLocaleString()}</span>
                </div>
                <div style="font-size: 0.7rem; color: #b45309; display: flex; align-items: center; gap: 4px;">
                    <span>⏱️</span> Ends: ${bidEnds}
                </div>
            </div>
        `;
        actionButtons += `<button class="bid-btn" onclick="handleBid('${item.id}', ${bidPrice})" style="background: ${accentColor}">BID NOW</button>`;
    }
    
    if (item.type === 'buy_now' || item.type === 'both') {
        const buyNowPrice = item.buy_now_price || 0;
        if (item.type === 'buy_now') {
            priceInfo = `
                <div style="background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; color: #065f46; font-weight: 600;">Buy Now Price</span>
                        <span style="font-size: 1.1rem; font-weight: 800; color: #059669;">$${buyNowPrice.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }
        actionButtons += `<button class="buy-btn" onclick="handleBuyNow('${item.id}', ${buyNowPrice})" style="background: #10b981">BUY NOW</button>`;
    }

    const ovrPercentage = (ovr / 100) * 100;
    const ovrStyle = getOvrStyle(ovr);

    return `
        <div class="player-card" style="position: relative; overflow: hidden;">
            <div style="position: absolute; top: 15px; right: 15px; z-index: 10;">
                ${item.type === 'auction' ? '<span style="background: #fef3c7; color: #92400e; font-size: 0.6rem; padding: 3px 8px; border-radius: 4px; font-weight: 800;">AUCTION</span>' : ''}
                ${item.type === 'buy_now' ? '<span style="background: #d1fae5; color: #065f46; font-size: 0.6rem; padding: 3px 8px; border-radius: 4px; font-weight: 800;">BUY NOW</span>' : ''}
                ${item.type === 'both' ? '<span style="background: #dbeafe; color: #1e40af; font-size: 0.6rem; padding: 3px 8px; border-radius: 4px; font-weight: 800;">BOTH</span>' : ''}
            </div>

            <div class="card-side-accent" style="background: ${accentColor}"></div>
            <div class="card-main">
                <div class="card-header" style="display: flex; gap: 15px; align-items: flex-start; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" 
                                 style="width: 70px; height: 70px; background: linear-gradient(135deg, #f3f4f6, #e5e7eb); border-radius: 12px; border: 3px solid #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="width: 100%;">
                                <div style="height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
                                    <div style="height: 100%; width: ${ovrPercentage}%; background: ${ovrStyle.border};"></div>
                                </div>
                                <div style="text-align: center; font-size: 0.7rem; font-weight: 700; color: ${ovrStyle.color}; margin-top: 4px;">
                                    OVR: ${ovr}
                                </div>
                            </div>
                        </div>
                        
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #1a237e;">
                                    ${p.first_name} ${p.last_name}
                                </h3>
                                ${rookieBadge}
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                                <span class="p-pos-tag" style="background: ${accentColor}">${p.position}</span>
                                <span style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: #475569; font-weight: 600;">
                                    <span style="color: ${potData.color};">${potData.icon}</span>
                                    ${potData.label}
                                </span>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.8rem; color: #64748b;">
                                <div>
                                    <div style="font-weight: 600; color: #475569;">Age</div>
                                    <div style="font-weight: 800; color: #1a237e;">${p.age}</div>
                                </div>
                                <div>
                                    <div style="font-weight: 600; color: #475569;">Height</div>
                                    <div style="font-weight: 800; color: #1a237e;">${heightInFt}</div>
                                </div>
                                <div>
                                    <div style="font-weight: 600; color: #475569;">Salary</div>
                                    <div style="font-weight: 800; color: #1a237e;">$${(p.salary || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                        ${Object.entries(skills).map(([key, value]) => `
                            <div style="text-align: center; padding: 8px; background: ${value >= 15 ? '#d1fae5' : value >= 10 ? '#fef3c7' : '#f3f4f6'}; border-radius: 6px;">
                                <div style="font-size: 0.6rem; color: #64748b; font-weight: 600; margin-bottom: 2px;">${key}</div>
                                <div style="font-size: 1rem; font-weight: 800; color: #1a237e;">${value}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card-footer">
                    ${priceInfo}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <div>
                            <div style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Market Value</div>
                            <div style="font-size: 1.1rem; font-weight: 800; color: #059669;">$${marketVal.toLocaleString()}</div>
                        </div>
                        
                        <div class="action-container" style="display: flex; gap: 10px;">
                            ${actionButtons}
                            <button onclick="showPlayerDetails('${p.id}')" 
                                    style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.8rem;">
                                👁️ Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getPosColor(pos) {
    const colors = { 
        'PG': '#3b82f6', 
        'SG': '#60a5fa', 
        'SF': '#f59e0b', 
        'PF': '#fb923c', 
        'C': '#10b981' 
    };
    return colors[pos] || '#94a3b8';
}

function getOvrStyle(ovr) {
    if (ovr >= 90) return { bg: '#fffbeb', border: '#f59e0b', color: '#92400e' };
    if (ovr >= 80) return { bg: '#f0fdf4', border: '#22c55e', color: '#166534' };
    if (ovr >= 70) return { bg: '#f0f9ff', border: '#3b82f6', color: '#1e3a8a' };
    if (ovr >= 60) return { bg: '#fff7ed', border: '#fdba74', color: '#9a3412' };
    if (ovr >= 50) return { bg: '#f0fdf4', border: '#22c55e', color: '#5b21b6' };
    if (ovr >= 40) return { bg: '#f0f9ff', border: '#3b82f6', color: '#065f46' };
    if (ovr >= 30) return { bg: '#fff7ed', border: '#fdba74', color: '#1e40af' };
    return { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
}

window.handleBid = (listingId, currentPrice) => {
    const bidAmount = prompt(`Current bid: $${currentPrice.toLocaleString()}\n\nEnter your bid amount:`, currentPrice + 10000);
    
    if (!bidAmount) return;
    
    const bid = parseInt(bidAmount);
    if (isNaN(bid) || bid <= currentPrice) {
        alert(`Bid must be higher than current price ($${currentPrice.toLocaleString()})`);
        return;
    }
    
    if (bid > window.currentTeamBalance) {
        alert(`Insufficient funds! You have $${window.currentTeamBalance.toLocaleString()}, but bid requires $${bid.toLocaleString()}`);
        return;
    }
    
    alert(`Bid placed successfully! Your bid: $${bid.toLocaleString()}\n\n(Full auction system coming soon!)`);
};

window.handleBuyNow = async (listingId, price) => {
    if (price > window.currentTeamBalance) {
        alert(`Insufficient funds! You have $${window.currentTeamBalance.toLocaleString()}, but purchase requires $${price.toLocaleString()}`);
        return;
    }
    
    const confirmBuy = confirm(`Do you want to buy this player immediately for $${price.toLocaleString()}?\n\nYour balance will be: $${(window.currentTeamBalance - price).toLocaleString()}`);
    if (!confirmBuy) return;

    if (!window.currentTeamId) {
        alert("Error: Team ID not found. Please refresh the page.");
        return;
    }

    try {
        const { error } = await supabaseClient.rpc('buy_player_now', {
            p_listing_id: listingId,
            p_buyer_team_id: window.currentTeamId
        });

        if (error) throw error;

        alert(`Congratulations! The player has joined your team.\n\nNew balance: $${(window.currentTeamBalance - price).toLocaleString()}`);
        location.reload();

    } catch (err) {
        console.error("Purchase Error:", err.message);
        alert("Transaction failed: " + err.message);
    }
};

window.showPlayerDetails = (playerId) => {
    alert(`Player details modal for player ${playerId}\n\n(Player profile modal coming soon!)`);
};
