// js/app/market_view.js
import { supabaseClient } from '../auth.js';

let currentPage = 1;
const pageSize = 20;
let allMarketData = [];
let currentFilters = {
    position: '',
    minAge: '',
    maxAge: '',
    minSalary: '',
    maxSalary: '',
    minPrice: '',
    maxPrice: '',
    potential: [],
    offerType: 'all',
    lastMinute: false
};

// Licznik ofert według typu
let offerCounts = {
    all: 0,
    auction: 0,
    buy_now: 0
};

// Funkcje pomocnicze
function getFlagUrl(countryCode) {
    if (!countryCode) return '';
    const code = String(countryCode).toLowerCase().trim();
    const finalCode = (code === 'el') ? 'gr' : code;
    return `assets/flags/${finalCode}.png`;
}

function getPositionStyle(pos) {
    const styles = {
        'PG': { bg: '#1e40af', text: '#dbeafe', label: 'Point Guard' },
        'SG': { bg: '#5b21b6', text: '#f3e8ff', label: 'Shooting Guard' },
        'SF': { bg: '#065f46', text: '#d1fae5', label: 'Small Forward' },
        'PF': { bg: '#9a3412', text: '#ffedd5', label: 'Power Forward' },
        'C': { bg: '#F5AD27', text: '#92400e', label: 'Center' }
    };
    return styles[pos] || { bg: '#334155', text: '#f1f5f9', label: 'Unknown' };
}

function getOvrStyle(ovr) {
    if (ovr >= 90) return { bg: '#fffbeb', border: '#f59e0b', color: '#92400e' };
    if (ovr >= 80) return { bg: '#f0fdf4', border: '#22c55e', color: '#166534' };
    if (ovr >= 70) return { bg: '#f0f9ff', border: '#3b82f6', color: '#1e3a8a' };
    if (ovr >= 60) return { bg: '#fff7ed', border: '#fdba74', color: '#9a3412' };
    return { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
}

function calculateOVR(p) {
    const skills = [
        p.skill_2pt, p.skill_3pt, p.skill_dunk, p.skill_ft, p.skill_passing, 
        p.skill_dribbling, p.skill_stamina, p.skill_rebound, p.skill_block, 
        p.skill_steal, p.skill_1on1_off, p.skill_1on1_def
    ];
    const sum = skills.reduce((a, b) => (a || 0) + (b || 0), 0);
    return Math.round((sum / 240) * 100);
}

function calculateMarketValue(player) {
    if (!player) return 0;
    const ovr = calculateOVR(player);
    const ageFactor = player.age <= 25 ? 1.5 : player.age <= 30 ? 1.0 : 0.7;
    return Math.round((ovr * 10000 + (player.salary || 0) * 2) * ageFactor);
}

// Pobieranie danych potencjału zgodnie z roster_actions.js
function getPotentialData(potentialId) {
    // Używamy funkcji z roster_actions.js jeśli jest dostępna
    if (window.getPotentialData) {
        return window.getPotentialData(potentialId);
    }
    
    // Fallback dla brakujących definicji
    const fallbackMap = {
        'GOAT': { label: 'G.O.A.T.', color: '#f59e0b', icon: '🐐' },
        'Elite Franchise': { label: 'Elite Franchise', color: '#8b5cf6', icon: '★' },
        'Franchise Player': { label: 'Franchise Player', color: '#3b82f6', icon: '★' },
        'All-Star Caliber': { label: 'All-Star', color: '#10b981', icon: '⭐' },
        'Starter': { label: 'Starter', color: '#059669', icon: '🏀' },
        'Sixth Man': { label: 'Sixth Man', color: '#d97706', icon: '🔥' },
        'Rotation Player': { label: 'Rotation', color: '#f59e0b', icon: '🔄' },
        'Deep Bench': { label: 'Deep Bench', color: '#6b7280', icon: '⏱️' },
        'Project Player': { label: 'Project', color: '#ef4444', icon: '🌱' },
        'High Prospect': { label: 'Prospect', color: '#ec4899', icon: '🎯' }
    };
    
    return fallbackMap[potentialId] || { label: 'Unknown', color: '#94a3b8', icon: '👤' };
}

// Generowanie opcji potencjału dla checkboxów
function generatePotentialCheckboxes() {
    const potentials = [
        { id: 'GOAT', label: 'G.O.A.T.', emoji: '🐐', color: '#f59e0b' },
        { id: 'Elite Franchise', label: 'Elite Franchise', emoji: '★', color: '#8b5cf6' },
        { id: 'Franchise Player', label: 'Franchise Player', emoji: '★', color: '#3b82f6' },
        { id: 'All-Star Caliber', label: 'All-Star', emoji: '⭐', color: '#10b981' },
        { id: 'Starter', label: 'Starter', emoji: '🏀', color: '#059669' },
        { id: 'Sixth Man', label: 'Sixth Man', emoji: '🔥', color: '#d97706' },
        { id: 'Rotation Player', label: 'Rotation', emoji: '🔄', color: '#f59e0b' },
        { id: 'Deep Bench', label: 'Deep Bench', emoji: '⏱️', color: '#6b7280' },
        { id: 'Project Player', label: 'Project', emoji: '🌱', color: '#ef4444' },
        { id: 'High Prospect', label: 'Prospect', emoji: '🎯', color: '#ec4899' }
    ];
    
    return potentials.map(pot => `
        <label class="potential-checkbox" style="
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 10px 14px;
            background: ${currentFilters.potential.includes(pot.id) ? pot.color + '20' : '#f8fafc'};
            border: 2px solid ${currentFilters.potential.includes(pot.id) ? pot.color : '#e2e8f0'};
            border-radius: 8px;
            transition: all 0.2s;
            user-select: none;
            flex: 1;
            min-width: 180px;
        ">
            <input type="checkbox" value="${pot.id}" 
                   ${currentFilters.potential.includes(pot.id) ? 'checked' : ''}
                   style="transform: scale(1.2); accent-color: ${pot.color};">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1rem;">${pot.emoji}</span>
                <span style="font-weight: 600; color: ${pot.color}; font-size: 0.85rem;">${pot.label}</span>
            </div>
        </label>
    `).join('');
}

// Funkcja do renderowania popupu Buy Now
function renderBuyNowModal(listingId, price, player) {
    return `
        <div id="buynow-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 20px;
        ">
            <div style="
                background: white;
                border-radius: 16px;
                max-width: 450px;
                width: 100%;
                box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
                position: relative;
            ">
                <!-- Nagłówek -->
                <div style="
                    background: linear-gradient(135deg, #059669 0%, #065f46 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 16px 16px 0 0;
                    position: relative;
                ">
                    <button onclick="closeBuyNowModal()" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        border: none;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        font-size: 0.9rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">✕</button>
                    
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 1.5rem;
                        ">🏀</div>
                        <div>
                            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 800;">BUY NOW</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 0.85rem;">
                                ${player.first_name} ${player.last_name}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Zawartość -->
                <div style="padding: 24px;">
                    <!-- Informacje o zakupie -->
                    <div style="
                        background: #d1fae5;
                        border: 2px solid #34d399;
                        border-radius: 10px;
                        padding: 16px;
                        margin-bottom: 20px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 0.75rem; color: #065f46; font-weight: 600; text-transform: uppercase;">Buy Now Price</div>
                                <div style="font-size: 1.8rem; font-weight: 900; color: #059669;">$${price.toLocaleString()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.75rem; color: #065f46; font-weight: 600; text-transform: uppercase;">Your Balance</div>
                                <div style="font-size: 1.4rem; font-weight: 900; color: #1a237e;">$${window.currentTeamBalance.toLocaleString()}</div>
                            </div>
                        </div>
                        <div style="
                            background: rgba(5, 150, 105, 0.1);
                            border-radius: 6px;
                            padding: 8px 12px;
                            font-size: 0.8rem;
                            color: #065f46;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            <span>💰</span>
                            <strong>Instant purchase:</strong> No bidding required
                        </div>
                    </div>
                    
                    <!-- Podgląd -->
                    <div id="buynow-preview" style="
                        background: #f0f9ff;
                        border: 2px solid #bae6fd;
                        border-radius: 10px;
                        padding: 16px;
                        margin-bottom: 20px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 0.75rem; color: #0369a1; font-weight: 600; text-transform: uppercase;">Purchase Amount</div>
                                <div id="preview-buynow-amount" style="font-size: 1.6rem; font-weight: 900; color: #0c4a6e;">$${price.toLocaleString()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.75rem; color: #0369a1; font-weight: 600; text-transform: uppercase;">New Balance</div>
                                <div id="preview-new-balance" style="font-size: 1.3rem; font-weight: 900; color: ${window.currentTeamBalance - price >= 0 ? '#059669' : '#ef4444'};">$${(window.currentTeamBalance - price).toLocaleString()}</div>
                            </div>
                        </div>
                        <div id="buynow-warning" style="
                            font-size: 0.8rem;
                            color: ${window.currentTeamBalance - price >= 0 ? '#059669' : '#ef4444'};
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            margin-top: 8px;
                        ">
                            ${window.currentTeamBalance - price >= 0 ? 
                                '✅ Sufficient funds available' : 
                                '❌ Insufficient funds'}
                        </div>
                    </div>
                    
                    <!-- Przyciski akcji -->
                    <div style="display: flex; gap: 12px;">
                        <button onclick="closeBuyNowModal()" style="
                            flex: 1;
                            background: #f1f5f9;
                            color: #64748b;
                            border: 2px solid #e2e8f0;
                            padding: 14px;
                            border-radius: 10px;
                            font-weight: 700;
                            cursor: pointer;
                            font-size: 0.9rem;
                            transition: all 0.2s;
                        ">
                            Cancel
                        </button>
                        <button onclick="confirmBuyNow('${listingId}', ${price})" id="confirm-buynow-btn" style="
                            flex: 1;
                            background: ${window.currentTeamBalance - price >= 0 ? 'linear-gradient(135deg, #059669 0%, #065f46 100%)' : '#94a3b8'};
                            color: white;
                            border: none;
                            padding: 14px;
                            border-radius: 10px;
                            font-weight: 800;
                            cursor: ${window.currentTeamBalance - price >= 0 ? 'pointer' : 'not-allowed'};
                            font-size: 0.9rem;
                            transition: all 0.2s;
                        ">
                            CONFIRM PURCHASE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Funkcja do renderowania popupu licytacji
function renderBidModal(listingId, currentPrice, player) {
    const minBid = currentPrice + 10000;
    
    return `
        <div id="bid-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 20px;
        ">
            <div style="
                background: white;
                border-radius: 16px;
                max-width: 450px;
                width: 100%;
                box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
                position: relative;
            ">
                <!-- Nagłówek -->
                <div style="
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 16px 16px 0 0;
                    position: relative;
                ">
                    <button onclick="closeBidModal()" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        border: none;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        font-size: 0.9rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">✕</button>
                    
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 1.5rem;
                        ">🏷️</div>
                        <div>
                            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 800;">PLACE A BID</h2>
                            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 0.85rem;">
                                ${player.first_name} ${player.last_name}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Zawartość -->
                <div style="padding: 24px;">
                    <!-- Informacje o aktualnej ofercie -->
                    <div style="
                        background: #fef3c7;
                        border: 2px solid #fcd34d;
                        border-radius: 10px;
                        padding: 16px;
                        margin-bottom: 20px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 0.75rem; color: #92400e; font-weight: 600; text-transform: uppercase;">Current Bid</div>
                                <div style="font-size: 1.8rem; font-weight: 900; color: #b45309;">$${currentPrice.toLocaleString()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.75rem; color: #92400e; font-weight: 600; text-transform: uppercase;">Your Balance</div>
                                <div style="font-size: 1.4rem; font-weight: 900; color: #1a237e;">$${window.currentTeamBalance.toLocaleString()}</div>
                            </div>
                        </div>
                        <div style="
                            background: rgba(180, 83, 9, 0.1);
                            border-radius: 6px;
                            padding: 8px 12px;
                            font-size: 0.8rem;
                            color: #92400e;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            <span>📈</span>
                            Minimum bid: <strong style="margin-left: 4px;">$${minBid.toLocaleString()}</strong>
                        </div>
                    </div>
                    
                    <!-- Formularz licytacji -->
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #475569; font-size: 0.9rem;">
                            Enter Your Bid Amount ($)
                        </label>
                        <div style="position: relative;">
                            <span style="
                                position: absolute;
                                left: 12px;
                                top: 50%;
                                transform: translateY(-50%);
                                color: #64748b;
                                font-weight: 700;
                            ">$</span>
                            <input type="number" id="bid-amount-input" 
                                   min="${minBid}" 
                                   value="${minBid}"
                                   step="1000"
                                   style="
                                        width: 100%;
                                        padding: 14px 14px 14px 32px;
                                        border: 2px solid #e2e8f0;
                                        border-radius: 10px;
                                        font-size: 1.1rem;
                                        font-weight: 700;
                                        color: #1a237e;
                                        box-sizing: border-box;
                                   "
                                   oninput="updateBidPreview(this.value)">
                        </div>
                        
                        <!-- Szybkie przyciski -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px;">
                            ${[10000, 25000, 50000, 100000].map(amount => `
                                <button onclick="setBidAmount(${currentPrice + amount})" style="
                                    background: #f1f5f9;
                                    color: #475569;
                                    border: 2px solid #e2e8f0;
                                    padding: 8px;
                                    border-radius: 6px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    font-size: 0.8rem;
                                    transition: all 0.2s;
                                ">
                                    +$${amount.toLocaleString()}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Podgląd -->
                    <div id="bid-preview" style="
                        background: #f0f9ff;
                        border: 2px solid #bae6fd;
                        border-radius: 10px;
                        padding: 16px;
                        margin-bottom: 20px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 0.75rem; color: #0369a1; font-weight: 600; text-transform: uppercase;">Your Bid</div>
                                <div id="preview-bid-amount" style="font-size: 1.6rem; font-weight: 900; color: #0c4a6e;">$${minBid.toLocaleString()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.75rem; color: #0369a1; font-weight: 600; text-transform: uppercase;">New Balance</div>
                                <div id="preview-new-balance" style="font-size: 1.3rem; font-weight: 900; color: ${window.currentTeamBalance - minBid >= 0 ? '#059669' : '#ef4444'};">$${(window.currentTeamBalance - minBid).toLocaleString()}</div>
                            </div>
                        </div>
                        <div id="bid-warning" style="
                            font-size: 0.8rem;
                            color: ${window.currentTeamBalance - minBid >= 0 ? '#059669' : '#ef4444'};
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            margin-top: 8px;
                        ">
                            ${window.currentTeamBalance - minBid >= 0 ? 
                                '✅ Sufficient funds available' : 
                                '❌ Insufficient funds'}
                        </div>
                    </div>
                    
                    <!-- Przyciski akcji -->
                    <div style="display: flex; gap: 12px;">
                        <button onclick="closeBidModal()" style="
                            flex: 1;
                            background: #f1f5f9;
                            color: #64748b;
                            border: 2px solid #e2e8f0;
                            padding: 14px;
                            border-radius: 10px;
                            font-weight: 700;
                            cursor: pointer;
                            font-size: 0.9rem;
                            transition: all 0.2s;
                        ">
                            Cancel
                        </button>
                        <button onclick="submitBid('${listingId}')" id="submit-bid-btn" style="
                            flex: 1;
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                            color: white;
                            border: none;
                            padding: 14px;
                            border-radius: 10px;
                            font-weight: 800;
                            cursor: pointer;
                            font-size: 0.9rem;
                            transition: all 0.2s;
                        ">
                            PLACE BID
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Funkcja do aktualizacji liczników ofert
function updateOfferCounts(data) {
    offerCounts = {
        all: data.length,
        auction: data.filter(item => item.type === 'auction' || item.type === 'both').length,
        buy_now: data.filter(item => item.type === 'buy_now' || item.type === 'both').length
    };
}

// Renderowanie głównego widoku
export async function renderMarketView(teamData, players = []) {
    const container = document.getElementById('market-view-container');
    
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
            <!-- Nagłówek w stylu Roster Management -->
            <div class="market-management-header" style="
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: white;
                padding: 18px 24px;
                margin-bottom: 24px;
                border-radius: 12px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="
                            font-size: 1.1rem;
                            font-weight: 800;
                            margin-bottom: 4px;
                            color: #cbd5e1;
                            letter-spacing: 0.5px;
                        ">
                            🏀 TRANSFER MARKET
                        </div>
                        <div style="
                            font-size: 0.85rem;
                            color: #94a3b8;
                            font-weight: 500;
                        ">
                            Scout and sign new talent for your franchise
                        </div>
                    </div>
                    <div style="
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        padding: 12px 20px;
                        border-radius: 8px;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        text-align: center;
                        min-width: 160px;
                    ">
                        <div style="font-size: 0.75rem; color: #cbd5e1; margin-bottom: 4px; font-weight: 600;">AVAILABLE FUNDS</div>
                        <div style="font-size: 1.4rem; font-weight: 900; color: white;">$${(teamData.balance || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <!-- Panel filtrów -->
            <div class="filters-panel" style="
                background: white;
                border-radius: 14px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
                border: 1px solid #e2e8f0;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin:0; font-size: 1rem; color:#1a237e; font-weight:800;">
                        🔍 PLAYER SEARCH FILTERS
                    </h3>
                    <button id="btn-reset-filters" style="
                        background: #f8fafc;
                        color: #64748b;
                        border: 1px solid #e2e8f0;
                        padding: 8px 16px;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.8rem;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        transition: all 0.2s;
                    ">
                        <span>🔄</span> Reset All
                    </button>
                </div>

                <!-- Filtry pozycji jako przyciski -->
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 0.75rem; color: #475569; margin-bottom: 10px; font-weight: 600; text-transform: uppercase;">
                        Position
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button type="button" class="position-btn ${currentFilters.position === '' ? 'active' : ''}" data-position="" style="
                            background: ${currentFilters.position === '' ? '#1a237e' : '#f8fafc'};
                            color: ${currentFilters.position === '' ? 'white' : '#64748b'};
                            border: 1px solid ${currentFilters.position === '' ? '#1a237e' : '#e2e8f0'};
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-weight: 700;
                            cursor: pointer;
                            font-size: 0.8rem;
                            transition: all 0.2s;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            <span>🌟</span> ALL
                        </button>
                        
                        <button type="button" class="position-btn ${currentFilters.position === 'PG' ? 'active' : ''}" data-position="PG" style="
                            background: ${currentFilters.position === 'PG' ? '#1e40af' : '#f8fafc'};
                            color: ${currentFilters.position === 'PG' ? '#dbeafe' : '#1e40af'};
                            border: 1px solid ${currentFilters.position === 'PG' ? '#1e40af' : '#e2e8f0'};
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-weight: 700;
                            cursor: pointer;
                            font-size: 0.8rem;
                            transition: all 0.2s;
                        ">PG</button>
                        
                        <button type="button" class="position-btn ${currentFilters.position === 'SG' ? 'active' : ''}" data-position="SG" style="
                            background: ${currentFilters.position === 'SG' ? '#5b21b6' : '#f8fafc'};
                            color: ${currentFilters.position === 'SG' ? '#f3e8ff' : '#5b21b6'};
                            border: 1px solid ${currentFilters.position === 'SG' ? '#5b21b6' : '#e2e8f0'};
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-weight: 700;
                            cursor: pointer;
                            font-size: 0.8rem;
                            transition: all 0.2s;
                        ">SG</button>
                        
                        <button type="button" class="position-btn ${currentFilters.position === 'SF' ? 'active' : ''}" data-position="SF" style="
                            background: ${currentFilters.position === 'SF' ? '#065f46' : '#f8fafc'};
                            color: ${currentFilters.position === 'SF' ? '#d1fae5' : '#065f46'};
                            border: 1px solid ${currentFilters.position === 'SF' ? '#065f46' : '#e2e8f0'};
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-weight: 700;
                            cursor: pointer;
                            font-size: 0.8rem;
                            transition: all 0.2s;
                        ">SF</button>
                        
                        <button type="button" class="position-btn ${currentFilters.position === 'PF' ? 'active' : ''}" data-position="PF" style="
                            background: ${currentFilters.position === 'PF' ? '#9a3412' : '#f8fafc'};
                            color: ${currentFilters.position === 'PF' ? '#ffedd5' : '#9a3412'};
                            border: 1px solid ${currentFilters.position === 'PF' ? '#9a3412' : '#e2e8f0'};
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-weight: 700;
                            cursor: pointer;
                            font-size: 0.8rem;
                            transition: all 0.2s;
                        ">PF</button>
                        
                        <button type="button" class="position-btn ${currentFilters.position === 'C' ? 'active' : ''}" data-position="C" style="
                            background: ${currentFilters.position === 'C' ? '#F5AD27' : '#f8fafc'};
                            color: ${currentFilters.position === 'C' ? '#92400e' : '#92400e'};
                            border: 1px solid ${currentFilters.position === 'C' ? '#F5AD27' : '#e2e8f0'};
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-weight: 700;
                            cursor: pointer;
                            font-size: 0.8rem;
                            transition: all 0.2s;
                        ">C</button>
                    </div>
                </div>

                <!-- Filtry potencjału jako checkboxy -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="font-size: 0.75rem; color: #475569; font-weight: 600; text-transform: uppercase;">
                            Potential
                        </div>
                        <button id="btn-select-all-potential" style="
                            background: #f8fafc;
                            color: #64748b;
                            border: 1px solid #e2e8f0;
                            padding: 6px 12px;
                            border-radius: 6px;
                            font-weight: 600;
                            cursor: pointer;
                            font-size: 0.7rem;
                            display: flex;
                            align-items: center;
                            gap: 4px;
                            transition: all 0.2s;
                        ">
                            <span>✓</span> Select All
                        </button>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 180px; overflow-y: auto; padding-right: 8px;">
                        ${generatePotentialCheckboxes()}
                    </div>
                </div>

                <!-- Grid filtrów numerycznych -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px;">
                    <!-- Wiek -->
                    <div class="filter-group">
                        <label style="display: block; font-size: 0.75rem; color: #475569; margin-bottom: 6px; font-weight: 600; text-transform: uppercase;">
                            Age Range
                        </label>
                        <div style="display: flex; gap: 8px;">
                            <input id="filter-min-age" type="number" min="18" max="40" placeholder="Min" value="${currentFilters.minAge || ''}" style="
                                flex: 1;
                                padding: 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 0.85rem;
                                text-align: center;
                            ">
                            <div style="color: #94a3b8; align-self: center; font-weight: 600; font-size: 0.9rem;">→</div>
                            <input id="filter-max-age" type="number" min="18" max="40" placeholder="Max" value="${currentFilters.maxAge || ''}" style="
                                flex: 1;
                                padding: 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 0.85rem;
                                text-align: center;
                            ">
                        </div>
                    </div>

                    <!-- Pensja -->
                    <div class="filter-group">
                        <label style="display: block; font-size: 0.75rem; color: #475569; margin-bottom: 6px; font-weight: 600; text-transform: uppercase;">
                            Salary Range ($)
                        </label>
                        <div style="display: flex; gap: 8px;">
                            <input id="filter-min-salary" type="number" min="0" placeholder="Min" value="${currentFilters.minSalary || ''}" style="
                                flex: 1;
                                padding: 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 0.85rem;
                                text-align: center;
                            ">
                            <div style="color: #94a3b8; align-self: center; font-weight: 600; font-size: 0.9rem;">→</div>
                            <input id="filter-max-salary" type="number" min="0" placeholder="Max" value="${currentFilters.maxSalary || ''}" style="
                                flex: 1;
                                padding: 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 0.85rem;
                                text-align: center;
                            ">
                        </div>
                    </div>

                    <!-- Cena -->
                    <div class="filter-group">
                        <label style="display: block; font-size: 0.75rem; color: #475569; margin-bottom: 6px; font-weight: 600; text-transform: uppercase;">
                            Price Range ($)
                        </label>
                        <div style="display: flex; gap: 8px;">
                            <input id="filter-min-price" type="number" min="0" placeholder="Min" value="${currentFilters.minPrice || ''}" style="
                                flex: 1;
                                padding: 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 0.85rem;
                                text-align: center;
                            ">
                            <div style="color: #94a3b8; align-self: center; font-weight: 600; font-size: 0.9rem;">→</div>
                            <input id="filter-max-price" type="number" min="0" placeholder="Max" value="${currentFilters.maxPrice || ''}" style="
                                flex: 1;
                                padding: 10px;
                                border: 1px solid #e2e8f0;
                                border-radius: 8px;
                                font-size: 0.85rem;
                                text-align: center;
                            ">
                        </div>
                    </div>
                </div>

                <!-- Filtry checkbox z ofertami -->
                <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    <div style="font-size: 0.8rem; color: #475569; margin-bottom: 12px; font-weight: 600;">
                        Offer Type
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                        <label class="checkbox-modern" style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            cursor: pointer;
                            padding: 10px 16px;
                            background: #f8fafc;
                            border-radius: 8px;
                            border: 1px solid #e2e8f0;
                            transition: all 0.2s;
                            user-select: none;
                            flex: 1;
                            min-width: 160px;
                        ">
                            <input type="radio" name="offerType" value="all" ${currentFilters.offerType === 'all' ? 'checked' : ''}
                                   style="transform: scale(1.2); accent-color: #1a237e;">
                            <div style="font-weight: 600; color: #475569; font-size: 0.85rem;">All Offers</div>
                            <div style="
                                margin-left: auto;
                                background: #e2e8f0;
                                color: #64748b;
                                font-size: 0.7rem;
                                padding: 3px 6px;
                                border-radius: 4px;
                                font-weight: 700;
                            ">(${offerCounts.all})</div>
                        </label>
                        
                        <label class="checkbox-modern" style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            cursor: pointer;
                            padding: 10px 16px;
                            background: #f8fafc;
                            border-radius: 8px;
                            border: 1px solid #e2e8f0;
                            transition: all 0.2s;
                            user-select: none;
                            flex: 1;
                            min-width: 160px;
                        ">
                            <input type="radio" name="offerType" value="auction" ${currentFilters.offerType === 'auction' ? 'checked' : ''}
                                   style="transform: scale(1.2); accent-color: #1a237e;">
                            <div style="font-weight: 600; color: #475569; font-size: 0.85rem;">Auction Only</div>
                            <div style="
                                margin-left: auto;
                                background: #fef3c7;
                                color: #92400e;
                                font-size: 0.7rem;
                                padding: 3px 6px;
                                border-radius: 4px;
                                font-weight: 700;
                            ">🏷️ (${offerCounts.auction})</div>
                        </label>
                        
                        <label class="checkbox-modern" style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            cursor: pointer;
                            padding: 10px 16px;
                            background: #f8fafc;
                            border-radius: 8px;
                            border: 1px solid #e2e8f0;
                            transition: all 0.2s;
                            user-select: none;
                            flex: 1;
                            min-width: 160px;
                        ">
                            <input type="radio" name="offerType" value="buy_now" ${currentFilters.offerType === 'buy_now' ? 'checked' : ''}
                                   style="transform: scale(1.2); accent-color: #1a237e;">
                            <div style="font-weight: 600; color: #475569; font-size: 0.85rem;">Buy Now Only</div>
                            <div style="
                                margin-left: auto;
                                background: #d1fae5;
                                color: #065f46;
                                font-size: 0.7rem;
                                padding: 3px 6px;
                                border-radius: 4px;
                                font-weight: 700;
                            ">(${offerCounts.buy_now})</div>
                        </label>
                    </div>
                    
                    <!-- Last Minute Filter -->
                    <div style="margin-top: 15px;">
                        <label class="lastminute-checkbox" style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            cursor: pointer;
                            padding: 12px 16px;
                            background: ${currentFilters.lastMinute ? '#fee2e2' : '#f8fafc'};
                            border: 2px solid ${currentFilters.lastMinute ? '#ef4444' : '#e2e8f0'};
                            border-radius: 8px;
                            transition: all 0.2s;
                            user-select: none;
                            width: fit-content;
                        ">
                            <input type="checkbox" id="filter-last-minute" ${currentFilters.lastMinute ? 'checked' : ''}
                                   style="transform: scale(1.2); accent-color: #ef4444;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="
                                    width: 32px;
                                    height: 32px;
                                    background: ${currentFilters.lastMinute ? '#ef4444' : '#e2e8f0'};
                                    color: ${currentFilters.lastMinute ? 'white' : '#64748b'};
                                    border-radius: 6px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 1rem;
                                ">⏰</div>
                                <div>
                                    <div style="font-weight: 700; color: #475569; font-size: 0.9rem;">Last Minute</div>
                                    <div style="font-size: 0.75rem; color: #64748b;">Offers ending in less than 1 hour</div>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Przycisk wyszukiwania -->
                <div style="margin-top: 24px; text-align: center;">
                    <button id="btn-search-market" style="
                        background: linear-gradient(135deg, #1a237e 0%, #303f9f 100%);
                        color: white;
                        border: none;
                        padding: 14px 32px;
                        border-radius: 10px;
                        font-weight: 800;
                        cursor: pointer;
                        font-size: 0.9rem;
                        display: inline-flex;
                        align-items: center;
                        gap: 10px;
                        box-shadow: 0 4px 12px rgba(26, 35, 126, 0.2);
                        transition: all 0.3s;
                    ">
                        <span style="font-size: 1rem;">🔍</span>
                        SEARCH PLAYERS
                    </button>
                </div>
            </div>

            <!-- Statystyki (6 boxów) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border: 1px solid #bae6fd;
                    border-radius: 10px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 0.75rem; color: #0369a1; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Total Players</div>
                    <div id="stat-total" style="font-size: 1.6rem; font-weight: 900; color: #0c4a6e;">0</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border: 1px solid #a7f3d0;
                    border-radius: 10px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 0.75rem; color: #15803d; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Avg Price</div>
                    <div id="stat-avg-price" style="font-size: 1.6rem; font-weight: 900; color: #166534;">$0</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    border: 1px solid #fcd34d;
                    border-radius: 10px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 0.75rem; color: #d97706; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Youngest</div>
                    <div id="stat-youngest" style="font-size: 1.6rem; font-weight: 900; color: #92400e;">18</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #fae8ff 0%, #f5d0fe 100%);
                    border: 1px solid #f0abfc;
                    border-radius: 10px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 0.75rem; color: #a21caf; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Highest OVR</div>
                    <div id="stat-highest-ovr" style="font-size: 1.6rem; font-weight: 900; color: #86198f;">0</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
                    border: 1px solid #fdba74;
                    border-radius: 10px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 0.75rem; color: #9a3412; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">G.O.A.T.</div>
                    <div id="stat-goat" style="font-size: 1.6rem; font-weight: 900; color: #92400e;">0</div>
                    <div style="font-size: 0.65rem; color: #b45309; margin-top: 4px;">Highest potential players</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
                    border: 1px solid #a5b4fc;
                    border-radius: 10px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 0.75rem; color: #3730a3; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Total Value</div>
                    <div id="stat-total-value" style="font-size: 1.6rem; font-weight: 900; color: #1e40af;">$0</div>
                    <div style="font-size: 0.65rem; color: #4f46e5; margin-top: 4px;">Market value sum</div>
                </div>
            </div>

            <!-- Lista ofert w grid 4 kolumny -->
            <div id="market-listings" style="
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-bottom: 32px;
            "></div>

            <!-- Paginacja -->
            <div class="market-pagination" style="
                margin-top: 32px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 12px;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 16px;
            ">
                <button id="prev-page" class="pag-btn" style="
                    background: white;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                ">
                    <span>←</span> Previous
                </button>
                <div id="page-info" style="
                    font-weight: 800;
                    color: #1a237e;
                    font-size: 0.9rem;
                    background: white;
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                "></div>
                <button id="next-page" class="pag-btn" style="
                    background: #1a237e;
                    color: white;
                    border: 1px solid #1a237e;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                ">
                    Next <span>→</span>
                </button>
            </div>
        </div>
    `;

    // Event Listeners
    document.getElementById('btn-search-market').onclick = (e) => {
        e.preventDefault();
        updateFilters();
        currentPage = 1;
        loadMarketData();
    };

    document.getElementById('btn-reset-filters').onclick = (e) => {
        e.preventDefault();
        resetFilters();
        currentPage = 1;
        loadMarketData();
    };

    document.getElementById('prev-page').onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
        }
    };

    document.getElementById('next-page').onclick = (e) => {
        e.preventDefault();
        if (currentPage * pageSize < allMarketData.length) {
            currentPage++;
            displayCurrentPage();
        }
    };

    // Event listener dla przycisku Select All (potencjał)
    document.getElementById('btn-select-all-potential').onclick = (e) => {
        e.preventDefault();
        const checkboxes = document.querySelectorAll('.potential-checkbox input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
            const potId = cb.value;
            const potData = getPotentialData(potId);
            const label = cb.closest('.potential-checkbox');
            
            if (cb.checked) {
                label.style.background = potData.color + '20';
                label.style.borderColor = potData.color;
            } else {
                label.style.background = '#f8fafc';
                label.style.borderColor = '#e2e8f0';
            }
        });
        
        updateFilters();
        currentPage = 1;
        loadMarketData();
    };

    // Event listeners dla checkboxów potencjału
    document.querySelectorAll('.potential-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const potId = checkbox.value;
            const potData = getPotentialData(potId);
            const label = checkbox.closest('.potential-checkbox');
            
            if (checkbox.checked) {
                label.style.background = potData.color + '20';
                label.style.borderColor = potData.color;
            } else {
                label.style.background = '#f8fafc';
                label.style.borderColor = '#e2e8f0';
            }
            
            updateFilters();
            currentPage = 1;
            loadMarketData();
        });
    });

    // Event listeners dla przycisków pozycji
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const position = btn.dataset.position;
            currentFilters.position = position;
            
            // Aktualizuj wygląd przycisków
            document.querySelectorAll('.position-btn').forEach(b => {
                const pos = b.dataset.position;
                const style = getPositionStyle(pos);
                b.style.background = currentFilters.position === pos ? style.bg : '#f8fafc';
                b.style.color = currentFilters.position === pos ? style.text : (pos ? style.bg : '#64748b');
                b.style.borderColor = currentFilters.position === pos ? style.bg : '#e2e8f0';
            });
            
            currentPage = 1;
            loadMarketData();
        });
    });

    // Event listener dla Last Minute filter
    const lastMinuteCheckbox = document.getElementById('filter-last-minute');
    if (lastMinuteCheckbox) {
        lastMinuteCheckbox.addEventListener('change', function() {
            currentFilters.lastMinute = this.checked;
            const label = this.closest('.lastminute-checkbox');
            
            if (this.checked) {
                label.style.background = '#fee2e2';
                label.style.borderColor = '#ef4444';
            } else {
                label.style.background = '#f8fafc';
                label.style.borderColor = '#e2e8f0';
            }
            
            currentPage = 1;
            loadMarketData();
        });
    }

    // Hover effects dla checkboxów
    document.querySelectorAll('.checkbox-modern').forEach(label => {
        const input = label.querySelector('input[type="radio"]');
        
        label.addEventListener('mouseenter', () => {
            if (!input.checked) {
                label.style.borderColor = '#c7d2fe';
                label.style.background = '#f1f5f9';
            }
        });
        
        label.addEventListener('mouseleave', () => {
            if (!input.checked) {
                label.style.borderColor = '#e2e8f0';
                label.style.background = '#f8fafc';
            }
        });
        
        input.addEventListener('change', () => {
            document.querySelectorAll('.checkbox-modern').forEach(l => {
                l.style.borderColor = '#e2e8f0';
                l.style.background = '#f8fafc';
            });
            
            if (input.checked) {
                label.style.borderColor = '#1a237e';
                label.style.background = '#e0e7ff';
            }
            
            currentFilters.offerType = input.value;
            currentPage = 1;
            loadMarketData();
        });
        
        if (input.checked) {
            label.style.borderColor = '#1a237e';
            label.style.background = '#e0e7ff';
        }
    });

    await loadMarketData();
}

function updateFilters() {
    // Zbierz zaznaczone potencjały
    const potentialCheckboxes = document.querySelectorAll('.potential-checkbox input[type="checkbox"]:checked');
    const selectedPotentials = Array.from(potentialCheckboxes).map(cb => cb.value);
    
    // Pobierz wartości z inputów - POPRAWIONE: nie parsuj jako int jeśli puste
    const minAge = document.getElementById('filter-min-age').value;
    const maxAge = document.getElementById('filter-max-age').value;
    const minSalary = document.getElementById('filter-min-salary').value;
    const maxSalary = document.getElementById('filter-max-salary').value;
    const minPrice = document.getElementById('filter-min-price').value;
    const maxPrice = document.getElementById('filter-max-price').value;
    
    currentFilters = {
        position: currentFilters.position,
        minAge: minAge !== '' ? parseInt(minAge) : '',
        maxAge: maxAge !== '' ? parseInt(maxAge) : '',
        minSalary: minSalary !== '' ? parseInt(minSalary) : '',
        maxSalary: maxSalary !== '' ? parseInt(maxSalary) : '',
        minPrice: minPrice !== '' ? parseInt(minPrice) : '',
        maxPrice: maxPrice !== '' ? parseInt(maxPrice) : '',
        potential: selectedPotentials,
        offerType: document.querySelector('input[name="offerType"]:checked').value,
        lastMinute: currentFilters.lastMinute
    };
    
    console.log('Updated filters:', currentFilters);
}

function resetFilters() {
    // Resetuj przyciski pozycji
    currentFilters.position = '';
    document.querySelectorAll('.position-btn').forEach(btn => {
        const pos = btn.dataset.position;
        if (pos === '') {
            btn.style.background = '#1a237e';
            btn.style.color = 'white';
            btn.style.borderColor = '#1a237e';
        } else {
            const style = getPositionStyle(pos);
            btn.style.background = '#f8fafc';
            btn.style.color = style.bg;
            btn.style.borderColor = '#e2e8f0';
        }
    });
    
    // Resetuj checkboxy potencjału
    currentFilters.potential = [];
    document.querySelectorAll('.potential-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
        const label = checkbox.closest('.potential-checkbox');
        label.style.background = '#f8fafc';
        label.style.borderColor = '#e2e8f0';
    });
    
    // Resetuj inputy numeryczne
    ['filter-min-age', 'filter-max-age', 'filter-min-salary', 'filter-max-salary', 'filter-min-price', 'filter-max-price'].forEach(id => {
        document.getElementById(id).value = '';
    });
    
    // Resetuj radio buttons
    document.querySelector('input[name="offerType"][value="all"]').checked = true;
    
    // Resetuj Last Minute filter
    currentFilters.lastMinute = false;
    const lastMinuteCheckbox = document.getElementById('filter-last-minute');
    if (lastMinuteCheckbox) {
        lastMinuteCheckbox.checked = false;
        const label = lastMinuteCheckbox.closest('.lastminute-checkbox');
        if (label) {
            label.style.background = '#f8fafc';
            label.style.borderColor = '#e2e8f0';
        }
    }
    
    // Zaktualizuj wygląd checkboxów
    document.querySelectorAll('.checkbox-modern').forEach(label => {
        label.style.borderColor = '#e2e8f0';
        label.style.background = '#f8fafc';
    });
    
    // Wyróżnij domyślny
    const defaultLabel = document.querySelector('input[name="offerType"][value="all"]').closest('.checkbox-modern');
    if (defaultLabel) {
        defaultLabel.style.borderColor = '#1a237e';
        defaultLabel.style.background = '#e0e7ff';
    }
    
    currentFilters = {
        position: '',
        minAge: '',
        maxAge: '',
        minSalary: '',
        maxSalary: '',
        minPrice: '',
        maxPrice: '',
        potential: [],
        offerType: 'all',
        lastMinute: false
    };
}

async function loadMarketData() {
    const list = document.getElementById('market-listings');
    list.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
            <div class="loader" style="
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 3px solid #e2e8f0;
                border-top: 3px solid #1a237e;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            "></div>
            <div style="color: #64748b; font-weight: 600; font-size: 0.9rem;">Loading market data...</div>
        </div>
    `;

    try {
        // Pobierz dane z Supabase
        let query = supabaseClient
            .from('transfer_market')
            .select('*, players!inner(*)')
            .eq('status', 'active');

        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
            console.error("Supabase Error:", error);
            list.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                    <div style="color: #ef4444; font-size: 1.5rem; margin-bottom: 10px;">⚠️</div>
                    <h3 style="margin: 0 0 8px 0; color: #ef4444; font-weight: 600; font-size: 1rem;">Error loading data</h3>
                    <p style="margin: 0; color: #94a3b8; font-size: 0.8rem;">${error.message}</p>
                </div>
            `;
            return;
        }

        allMarketData = data || [];
        
        // Aktualizuj liczniki ofert
        updateOfferCounts(allMarketData);
        
        // Aktualizuj liczniki w interfejsie
        updateOfferCountsInUI();
        
        // Filtrowanie danych - POPRAWIONE filtrowanie po potencjale
        allMarketData = allMarketData.filter(item => {
            const player = item.players;
            
            // Filtruj pozycję
            if (currentFilters.position && player.position !== currentFilters.position) {
                return false;
            }
            
            // Filtruj wiek
            if (currentFilters.minAge !== '' && player.age < currentFilters.minAge) {
                return false;
            }
            if (currentFilters.maxAge !== '' && player.age > currentFilters.maxAge) {
                return false;
            }
            
            // Filtruj pensję
            const salary = player.salary || 0;
            if (currentFilters.minSalary !== '' && salary < currentFilters.minSalary) {
                return false;
            }
            if (currentFilters.maxSalary !== '' && salary > currentFilters.maxSalary) {
                return false;
            }
            
            // Filtruj potencjał - POPRAWIONE: sprawdzanie czy tablica ma elementy
            if (currentFilters.potential && currentFilters.potential.length > 0) {
                if (!player.potential || !currentFilters.potential.includes(player.potential)) {
                    return false;
                }
            }
            
            // Filtruj typ oferty
            if (currentFilters.offerType !== 'all') {
                if (currentFilters.offerType === 'auction' && item.type !== 'auction' && item.type !== 'both') {
                    return false;
                }
                if (currentFilters.offerType === 'buy_now' && item.type !== 'buy_now' && item.type !== 'both') {
                    return false;
                }
            }
            
            // Filtruj Last Minute (mniej niż 1h do końca)
            if (currentFilters.lastMinute && item.auction_ends) {
                const now = new Date();
                const endsAt = new Date(item.auction_ends);
                const timeLeft = endsAt - now;
                const oneHour = 60 * 60 * 1000;
                
                if (timeLeft > oneHour || timeLeft < 0) {
                    return false;
                }
            }
            
            // Filtruj cenę
            let price;
            if (item.type === 'auction' || item.type === 'both') {
                price = item.current_price || 0;
            } else if (item.type === 'buy_now') {
                price = item.buy_now_price || 0;
            } else {
                price = 0;
            }

            if (currentFilters.minPrice !== '' && price < currentFilters.minPrice) return false;
            if (currentFilters.maxPrice !== '' && price > currentFilters.maxPrice) return false;
            
            return true;
        });
        
        console.log(`Filtered data: ${allMarketData.length} items`);
        updateMarketStats(allMarketData);
        displayCurrentPage();
        
    } catch (error) {
        console.error("Error loading market data:", error);
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <div style="color: #ef4444; font-size: 1.5rem; margin-bottom: 10px;">⚠️</div>
                <h3 style="margin: 0 0 8px 0; color: #ef4444; font-weight: 600; font-size: 1rem;">Unexpected error</h3>
                <p style="margin: 0; color: #94a3b8; font-size: 0.8rem;">Please try again later</p>
            </div>
        `;
    }
}

function updateOfferCountsInUI() {
    // Aktualizuj liczniki w przyciskach
    const allCount = document.querySelector('input[name="offerType"][value="all"]')?.closest('.checkbox-modern')?.querySelector('div:last-child');
    const auctionCount = document.querySelector('input[name="offerType"][value="auction"]')?.closest('.checkbox-modern')?.querySelector('div:last-child');
    const buyNowCount = document.querySelector('input[name="offerType"][value="buy_now"]')?.closest('.checkbox-modern')?.querySelector('div:last-child');
    
    if (allCount) allCount.textContent = `(${offerCounts.all})`;
    if (auctionCount) auctionCount.textContent = `🏷️ (${offerCounts.auction})`;
    if (buyNowCount) buyNowCount.textContent = `(${offerCounts.buy_now})`;
}

function updateMarketStats(data) {
    if (data.length === 0) {
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-avg-price').textContent = '$0';
        document.getElementById('stat-youngest').textContent = '0';
        document.getElementById('stat-highest-ovr').textContent = '0';
        document.getElementById('stat-goat').textContent = '0';
        document.getElementById('stat-total-value').textContent = '$0';
        return;
    }

    // Total players
    document.getElementById('stat-total').textContent = data.length.toLocaleString();

    // Average price
    const totalPrice = data.reduce((sum, item) => {
        const price = item.current_price || item.buy_now_price || 0;
        return sum + price;
    }, 0);
    const avgPrice = Math.round(totalPrice / data.length);
    document.getElementById('stat-avg-price').textContent = `$${avgPrice.toLocaleString()}`;

    // Youngest player
    const youngest = Math.min(...data.map(item => item.players.age || 0));
    document.getElementById('stat-youngest').textContent = youngest;

    // Highest OVR
    const highestOVR = Math.max(...data.map(item => calculateOVR(item.players) || 0));
    document.getElementById('stat-highest-ovr').textContent = highestOVR;

    // G.O.A.T. count
    const goatCount = data.filter(item => item.players.potential === 'GOAT').length;
    document.getElementById('stat-goat').textContent = goatCount;

    // Total market value
    const totalValue = data.reduce((sum, item) => {
        return sum + calculateMarketValue(item.players);
    }, 0);
    document.getElementById('stat-total-value').textContent = `$${Math.round(totalValue / 1000)}K`;
}

function displayCurrentPage() {
    const list = document.getElementById('market-listings');
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = allMarketData.slice(start, end);

    if (pageData.length === 0) {
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                <div style="font-size: 2.5rem; margin-bottom: 15px; opacity: 0.2;">🏀</div>
                <h3 style="margin: 0 0 8px 0; color: #475569; font-weight: 700; font-size: 1.1rem;">No players found</h3>
                <p style="margin: 0; color: #94a3b8; font-size: 0.85rem; max-width: 350px; margin: 0 auto;">Try adjusting your search filters or check back later</p>
            </div>
        `;
    } else {
        list.innerHTML = pageData.map(item => renderPlayerCard(item)).join('');
    }

    const totalPages = Math.ceil(allMarketData.length / pageSize) || 1;
    document.getElementById('page-info').innerHTML = `
        <span style="color: #1a237e;">${currentPage}</span>
        <span style="color: #94a3b8;">/</span>
        <span style="color: #64748b;">${totalPages}</span>
        <span style="margin-left: 8px; color: #94a3b8;">•</span>
        <span style="margin-left: 8px; color: #475569; font-weight: 600;">${allMarketData.length} players</span>
    `;
    
    // Aktualizuj przyciski paginacji
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (currentPage === 1) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }
    
    if (end >= allMarketData.length) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
        nextBtn.style.background = '#c7d2fe';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
        nextBtn.style.background = '#1a237e';
    }
}

function renderPlayerCard(item) {
    const p = item.players;
    if (!p) return '';

    const marketVal = calculateMarketValue(p);
    const ovr = calculateOVR(p);
    const posStyle = getPositionStyle(p.position);
    const potData = getPotentialData(p.potential);
    
    // Etykieta Rookie - ZMIENIONE NA CZERWONY
    const rookieBadge = p.is_rookie ? `
        <span style="
            background: linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%);
            color: #dc2626;
            font-size: 0.55rem;
            padding: 2px 5px;
            border-radius: 6px;
            font-weight: 700;
            border: 1px solid #f87171;
            white-space: nowrap;
        ">ROOKIE</span>
    ` : '';
    
    // Etykieta typu oferty
    let offerTypeBadge = '';
    if (item.type === 'auction') {
        offerTypeBadge = `
            <span style="
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                color: #92400e;
                font-size: 0.55rem;
                padding: 2px 5px;
                border-radius: 6px;
                font-weight: 700;
                border: 1px solid #fcd34d;
                white-space: nowrap;
            ">🏷️ AUCTION</span>
        `;
    } else if (item.type === 'buy_now') {
        offerTypeBadge = `
            <span style="
                background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                color: #065f46;
                font-size: 0.55rem;
                padding: 2px 5px;
                border-radius: 6px;
                font-weight: 700;
                border: 1px solid #34d399;
                white-space: nowrap;
            ">BUY NOW</span>
        `;
    } else if (item.type === 'both') {
        offerTypeBadge = `
            <span style="
                background: linear-gradient(135deg, #dbeafe 0%, #a5b4fc 100%);
                color: #1e40af;
                font-size: 0.55rem;
                padding: 2px 5px;
                border-radius: 6px;
                font-weight: 700;
                border: 1px solid #818cf8;
                white-space: nowrap;
            ">🏷️ BUY NOW</span>
        `;
    }
    
    // Konwersja wzrostu na cm i stopy
    const heightCm = p.height || 0;
    const inchesTotal = heightCm * 0.393701;
    const ft = Math.floor(inchesTotal / 12);
    const inc = Math.round(inchesTotal % 12);
    const heightDisplay = heightCm > 0 ? `${heightCm}cm / ${ft}'${inc}"` : '--';

    // Grupowanie umiejętności według kategorii
    const attackSkills = [
        { key: '2PT', value: p.skill_2pt || 0, label: '2PT Shot' },
        { key: '3PT', value: p.skill_3pt || 0, label: '3PT Shot' },
        { key: 'DUNK', value: p.skill_dunk || 0, label: 'Dunking' },
        { key: '1v1O', value: p.skill_1on1_off || 0, label: '1on1 Off' }
    ];
    
    const defenseSkills = [
        { key: '1v1D', value: p.skill_1on1_def || 0, label: '1on1 Def' },
        { key: 'BLK', value: p.skill_block || 0, label: 'Blocking' },
        { key: 'STL', value: p.skill_steal || 0, label: 'Stealing' },
        { key: 'REB', value: p.skill_rebound || 0, label: 'Rebound' }
    ];
    
    const generalSkills = [
        { key: 'PASS', value: p.skill_passing || 0, label: 'Passing' },
        { key: 'DRIB', value: p.skill_dribbling || 0, label: 'Dribbling' },
        { key: 'STAM', value: p.skill_stamina || 0, label: 'Stamina' },
        { key: 'FT', value: p.skill_ft || 0, label: 'Free Th.' }
    ];

    const countryCode = p.country || p.nationality || "";
    const flagUrl = getFlagUrl(countryCode);

    // Generowanie akcji i ceny
    let actionButtons = '';
    let priceInfo = '';
    
    if (item.type === 'auction' || item.type === 'both') {
        const bidPrice = item.current_price || 0;
        const bidEnds = item.auction_ends ? new Date(item.auction_ends).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Soon';
        
        // Sprawdź czy oferta kończy się w ciągu godziny (Last Minute)
        const isLastMinute = item.auction_ends ? (new Date(item.auction_ends) - new Date()) < (60 * 60 * 1000) : false;
        const lastMinuteBadge = isLastMinute ? `
            <div style="
                background: #fee2e2;
                color: #dc2626;
                font-size: 0.6rem;
                padding: 1px 4px;
                border-radius: 4px;
                font-weight: 700;
                border: 1px solid #fca5a5;
                display: inline-block;
                margin-left: 6px;
            ">⏰ LAST MINUTE</div>
        ` : '';
        
        priceInfo += `
            <div style="
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 1px solid #fcd34d;
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 10px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 0.65rem; color: #92400e; font-weight: 700; text-transform: uppercase;">Current Bid</span>
                        ${lastMinuteBadge}
                    </div>
                    <span style="font-size: 1rem; font-weight: 900; color: #b45309;">$${bidPrice.toLocaleString()}</span>
                </div>
                <div style="font-size: 0.65rem; color: #b45309; display: flex; align-items: center; gap: 4px; font-weight: 600;">
                    <span>⏱️</span> Ends: ${bidEnds}
                </div>
            </div>
        `;
        actionButtons += `
            <button onclick="handleBid('${item.id}', ${bidPrice}, '${p.id}')" style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                font-weight: 700;
                cursor: pointer;
                font-size: 0.75rem;
                flex: 1;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
            ">BID NOW</button>
        `;
    }
    
    if (item.type === 'buy_now' || item.type === 'both') {
        const buyNowPrice = item.buy_now_price || 0;
        if (item.type === 'buy_now' || item.type === 'both') {
            priceInfo += `
                <div style="
                    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                    border: 1px solid #34d399;
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 10px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.65rem; color: #065f46; font-weight: 700; text-transform: uppercase;">Buy Now</span>
                        <span style="font-size: 1rem; font-weight: 900; color: #059669;">$${buyNowPrice.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }
        actionButtons += `
            <button onclick="handleBuyNow('${item.id}', ${buyNowPrice}, '${p.id}')" style="
                background: linear-gradient(135deg, #059669 0%, #065f46 100%);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                font-weight: 700;
                cursor: pointer;
                font-size: 0.75rem;
                flex: 1;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
            ">BUY NOW</button>
        `;
    }

    const ovrPercentage = (ovr / 100) * 100;
    const ovrStyle = getOvrStyle(ovr);

    return `
        <div class="player-card" style="
            position: relative;
            overflow: hidden;
            background: white;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            transition: all 0.3s ease;
            height: 100%;
            display: flex;
            flex-direction: column;
        ">
            <!-- Akcent pozycji -->
            <div style="
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: ${posStyle.bg};
                border-radius: 12px 0 0 12px;
            "></div>

            <!-- Główna zawartość -->
            <div style="padding: 16px; padding-left: 20px; flex: 1; display: flex; flex-direction: column;">
                <!-- Nagłówek z avatarami -->
                <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                    <!-- Avatar i OVR z etykietami -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 70px;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.first_name}${p.last_name}" 
                             style="
                                width: 60px;
                                height: 60px;
                                background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
                                border-radius: 10px;
                                border: 2px solid white;
                                box-shadow: 0 2px 6px rgba(0,0,0,0.06);
                             ">
                        <div style="width: 100%; text-align: center;">
                            <!-- Pasek OVR -->
                            <div style="
                                height: 6px;
                                background: #e5e7eb;
                                border-radius: 3px;
                                overflow: hidden;
                                margin-bottom: 4px;
                            ">
                                <div style="height: 100%; width: ${ovrPercentage}%; background: ${ovrStyle.border};"></div>
                            </div>
                            <!-- Wartość OVR -->
                            <div style="
                                font-size: 0.7rem;
                                font-weight: 900;
                                color: ${ovrStyle.color};
                                background: ${ovrStyle.bg};
                                padding: 2px 8px;
                                border-radius: 12px;
                                display: inline-block;
                                border: 1px solid ${ovrStyle.border};
                                margin-bottom: 4px;
                            ">
                                OVR: ${ovr}
                            </div>
                            <!-- Etykiety Rookie i typu oferty -->
                            <div style="display: flex; justify-content: center; gap: 3px; flex-wrap: wrap;">
                                ${rookieBadge}
                                ${offerTypeBadge}
                            </div>
                        </div>
                    </div>

                    <!-- Informacje o graczu -->
                    <div style="flex: 1;">
                        <!-- Imię i nazwisko -->
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap;">
                            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 900; color: #1a237e; line-height: 1.2;">
                                ${p.first_name} ${p.last_name}
                            </h3>
                            ${flagUrl ? `
                                <img src="${flagUrl}" style="
                                    width: 18px;
                                    height: auto;
                                    border-radius: 2px;
                                    border: 1px solid #e2e8f0;
                                ">
                            ` : ''}
                        </div>

                        <!-- Pozycja i potencjał -->
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                            <div style="
                                background: ${posStyle.bg};
                                color: ${posStyle.text};
                                width: 28px;
                                height: 28px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                border-radius: 6px;
                                font-weight: 900;
                                font-size: 0.8rem;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                            ">
                                ${p.position}
                            </div>
                            <span style="
                                display: flex;
                                align-items: center;
                                gap: 4px;
                                font-size: 0.75rem;
                                color: ${potData.color};
                                font-weight: 800;
                                background: ${potData.color}15;
                                padding: 4px 8px;
                                border-radius: 6px;
                                border: 1px solid ${potData.color}30;
                            ">
                                <span style="font-size: 0.9rem;">${potData.icon}</span>
                                ${potData.label}
                            </span>
                        </div>

                        <!-- Statystyki podstawowe -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.65rem; margin-bottom: 2px;">AGE</div>
                                <div style="font-weight: 900; color: #1a237e; font-size: 0.9rem;">${p.age}</div>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.65rem; margin-bottom: 2px;">HEIGHT</div>
                                <div style="font-weight: 900; color: #1a237e; font-size: 0.8rem;">${heightDisplay}</div>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.65rem; margin-bottom: 2px;">SALARY</div>
                                <div style="font-weight: 900; color: #1a237e; font-size: 0.8rem;">$${(p.salary || 0).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Umiejętności pogrupowane - skrócona wersja -->
                <div style="
                    margin: 10px 0;
                    padding: 10px;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    flex: 1;
                ">
                    <!-- ATTACK -->
                    <div style="margin-bottom: 10px;">
                        <div style="font-size: 0.65rem; color: #dc2626; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;">
                            ⚔️ ATTACK
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                            ${attackSkills.map(skill => `
                                <div style="
                                    text-align: center;
                                    padding: 6px 3px;
                                    background: ${skill.value >= 15 ? '#fee2e2' : skill.value >= 10 ? '#fef3c7' : '#f3f4f6'};
                                    border-radius: 6px;
                                    border: 1px solid ${skill.value >= 15 ? '#fca5a5' : skill.value >= 10 ? '#fde68a' : '#e5e7eb'};
                                ">
                                    <div style="
                                        font-size: 0.6rem;
                                        color: ${skill.value >= 15 ? '#dc2626' : skill.value >= 10 ? '#92400e' : '#64748b'};
                                        font-weight: 800;
                                        margin-bottom: 3px;
                                        text-transform: uppercase;
                                        letter-spacing: 0.1px;
                                    ">${skill.key}</div>
                                    <div style="
                                        font-size: 0.9rem;
                                        font-weight: 900;
                                        color: ${skill.value >= 15 ? '#dc2626' : skill.value >= 10 ? '#d97706' : '#475569'};
                                    ">${skill.value}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- DEFENSE -->
                    <div style="margin-bottom: 10px;">
                        <div style="font-size: 0.65rem; color: #1d4ed8; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;">
                            🛡️ DEFENSE
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                            ${defenseSkills.map(skill => `
                                <div style="
                                    text-align: center;
                                    padding: 6px 3px;
                                    background: ${skill.value >= 15 ? '#dbeafe' : skill.value >= 10 ? '#fef3c7' : '#f3f4f6'};
                                    border-radius: 6px;
                                    border: 1px solid ${skill.value >= 15 ? '#93c5fd' : skill.value >= 10 ? '#fde68a' : '#e5e7eb'};
                                ">
                                    <div style="
                                        font-size: 0.6rem;
                                        color: ${skill.value >= 15 ? '#1d4ed8' : skill.value >= 10 ? '#92400e' : '#64748b'};
                                        font-weight: 800;
                                        margin-bottom: 3px;
                                        text-transform: uppercase;
                                        letter-spacing: 0.1px;
                                    ">${skill.key}</div>
                                    <div style="
                                        font-size: 0.9rem;
                                        font-weight: 900;
                                        color: ${skill.value >= 15 ? '#1d4ed8' : skill.value >= 10 ? '#d97706' : '#475569'};
                                    ">${skill.value}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- GENERAL -->
                    <div>
                        <div style="font-size: 0.65rem; color: #059669; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;">
                            ⚙️ GENERAL
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                            ${generalSkills.map(skill => `
                                <div style="
                                    text-align: center;
                                    padding: 6px 3px;
                                    background: ${skill.value >= 15 ? '#d1fae5' : skill.value >= 10 ? '#fef3c7' : '#f3f4f6'};
                                    border-radius: 6px;
                                    border: 1px solid ${skill.value >= 15 ? '#a7f3d0' : skill.value >= 10 ? '#fde68a' : '#e5e7eb'};
                                ">
                                    <div style="
                                        font-size: 0.6rem;
                                        color: ${skill.value >= 15 ? '#059669' : skill.value >= 10 ? '#92400e' : '#64748b'};
                                        font-weight: 800;
                                        margin-bottom: 3px;
                                        text-transform: uppercase;
                                        letter-spacing: 0.1px;
                                    ">${skill.key}</div>
                                    <div style="
                                        font-size: 0.9rem;
                                        font-weight: 900;
                                        color: ${skill.value >= 15 ? '#059669' : skill.value >= 10 ? '#d97706' : '#475569'};
                                    ">${skill.value}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Stopka z ceną i akcjami -->
                <div style="margin-top: auto;">
                    ${priceInfo}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <!-- Wartość rynkowa -->
                        <div>
                            <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; margin-bottom: 2px;">MARKET VALUE</div>
                            <div style="font-size: 1rem; font-weight: 900; color: #059669;">$${marketVal.toLocaleString()}</div>
                        </div>
                        
                        <!-- Przyciski akcji -->
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
                            ${actionButtons}
                            <button onclick="showPlayerProfile('${p.id}')" style="
                                background: #f8fafc;
                                color: #475569;
                                border: 1px solid #e2e8f0;
                                padding: 6px 10px;
                                border-radius: 6px;
                                font-weight: 700;
                                cursor: pointer;
                                font-size: 0.75rem;
                                display: flex;
                                align-items: center;
                                gap: 4px;
                                transition: all 0.2s;
                                min-width: 70px;
                                justify-content: center;
                            ">
                                <span style="font-size: 0.8rem;">👁️</span> Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Globalne funkcje dla przycisków
window.handleBid = async (listingId, currentPrice, playerId) => {
    // Znajdź zawodnika
    const listing = allMarketData.find(item => item.id === listingId);
    if (!listing) {
        alert("❌ Player listing not found!");
        return;
    }
    
    const player = listing.players;
    
    // Renderuj modal licytacji
    const modalHtml = renderBidModal(listingId, currentPrice, player);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Inicjalizuj podgląd
    updateBidPreview(currentPrice + 10000);
};

window.handleBuyNow = async (listingId, price, playerId) => {
    // Znajdź zawodnika
    const listing = allMarketData.find(item => item.id === listingId);
    if (!listing) {
        alert("❌ Player listing not found!");
        return;
    }
    
    const player = listing.players;
    
    // Renderuj modal Buy Now
    const modalHtml = renderBuyNowModal(listingId, price, player);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.confirmBuyNow = async (listingId, price) => {
    if (price > window.currentTeamBalance) {
        alert(`💰 Insufficient funds!\nYou have: $${window.currentTeamBalance.toLocaleString()}\nRequired: $${price.toLocaleString()}`);
        return;
    }
    
    if (!window.currentTeamId) {
        alert("❌ Error: Team ID not found. Please refresh the page.");
        return;
    }

    try {
        const { error } = await supabaseClient.rpc('buy_player_now', {
            p_listing_id: listingId,
            p_buyer_team_id: window.currentTeamId
        });

        if (error) throw error;

        alert(`🎉 Congratulations!\nThe player has joined your team.\n\nNew balance: $${(window.currentTeamBalance - price).toLocaleString()}`);
        closeBuyNowModal();
        location.reload();

    } catch (err) {
        console.error("Purchase Error:", err.message);
        alert("❌ Transaction failed: " + err.message);
        closeBuyNowModal();
    }
};

window.showPlayerProfile = async (playerId) => {
    try {
        // Znajdź zawodnika w danych rynku
        const listing = allMarketData.find(item => item.players.id === playerId);
        if (!listing) {
            alert("❌ Player not found!");
            return;
        }
        
        const player = listing.players;
        
        // Użyj funkcji z roster_actions.js
        if (window.RosterActions && window.RosterActions.showProfile) {
            window.RosterActions.showProfile(player, {
                hideSections: ['season-focus', 'development-history']
            });
        } else {
            alert("❌ Profile viewer not available. Please make sure roster_actions.js is loaded.");
        }
        
    } catch (error) {
        console.error("Error loading player profile:", error);
        alert("❌ Could not load player profile");
    }
};

// Funkcje pomocnicze dla modali
window.closeBidModal = () => {
    const modal = document.getElementById('bid-modal');
    if (modal) modal.remove();
};

window.closeBuyNowModal = () => {
    const modal = document.getElementById('buynow-modal');
    if (modal) modal.remove();
};

window.setBidAmount = (amount) => {
    const input = document.getElementById('bid-amount-input');
    if (input) {
        input.value = amount;
        updateBidPreview(amount);
    }
};

window.updateBidPreview = (amount) => {
    const bidAmount = parseInt(amount) || 0;
    const currentPrice = parseInt(document.querySelector('#bid-amount-input')?.min || 0) - 10000 || 0;
    const minBid = currentPrice + 10000;
    
    // Aktualizuj podgląd kwoty
    const previewAmount = document.getElementById('preview-bid-amount');
    const previewBalance = document.getElementById('preview-new-balance');
    const warning = document.getElementById('bid-warning');
    const submitBtn = document.getElementById('submit-bid-btn');
    
    if (previewAmount) {
        previewAmount.textContent = `$${bidAmount.toLocaleString()}`;
    }
    
    if (previewBalance) {
        const newBalance = window.currentTeamBalance - bidAmount;
        previewBalance.textContent = `$${newBalance.toLocaleString()}`;
        previewBalance.style.color = newBalance >= 0 ? '#059669' : '#ef4444';
    }
    
    if (warning) {
        const isValid = bidAmount >= minBid && window.currentTeamBalance - bidAmount >= 0;
        const isBelowMin = bidAmount < minBid;
        const insufficientFunds = window.currentTeamBalance - bidAmount < 0;
        
        if (isValid) {
            warning.innerHTML = '✅ Valid bid amount';
            warning.style.color = '#059669';
        } else if (isBelowMin) {
            warning.innerHTML = `❌ Minimum bid: $${minBid.toLocaleString()}`;
            warning.style.color = '#ef4444';
        } else if (insufficientFunds) {
            warning.innerHTML = '❌ Insufficient funds';
            warning.style.color = '#ef4444';
        }
    }
    
    if (submitBtn) {
        const isValid = bidAmount >= minBid && window.currentTeamBalance - bidAmount >= 0;
        submitBtn.disabled = !isValid;
        submitBtn.style.opacity = isValid ? '1' : '0.5';
        submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
};

window.submitBid = async (listingId) => {
    const input = document.getElementById('bid-amount-input');
    if (!input) return;
    
    const bidAmount = parseInt(input.value);
    const currentPrice = parseInt(input.min) - 10000;
    
    if (bidAmount <= currentPrice) {
        alert(`❌ Bid must be higher than current price ($${currentPrice.toLocaleString()})`);
        return;
    }
    
    if (bidAmount > window.currentTeamBalance) {
        alert(`💰 Insufficient funds!\nYou have: $${window.currentTeamBalance.toLocaleString()}\nRequired: $${bidAmount.toLocaleString()}`);
        return;
    }
    
    // TODO: Implementuj rzeczywiste API do składania ofert
    try {
        // Symulacja udanej licytacji
        console.log(`Placing bid: $${bidAmount} on listing ${listingId}`);
        
        // Zamknij modal
        closeBidModal();
        
        // Pokaz potwierdzenie
        setTimeout(() => {
            alert(`✅ Bid placed successfully!\n\nYour bid: $${bidAmount.toLocaleString()}\n\nThe auction will be updated shortly.`);
        }, 300);
        
        // Odśwież dane po chwili
        setTimeout(() => {
            loadMarketData();
        }, 1000);
        
    } catch (error) {
        alert(`❌ Failed to place bid: ${error.message}`);
    }
};

// Dodaj styl animacji dla loadera
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .filter-select:focus, input:focus {
        outline: none;
        border-color: #1a237e !important;
        box-shadow: 0 0 0 3px rgba(26, 35, 126, 0.1) !important;
    }
    
    .player-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
        border-color: #c7d2fe !important;
    }
    
    button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 3px 6px rgba(0,0,0,0.1) !important;
    }
    
    .position-btn:hover:not(.active) {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.08) !important;
    }
    
    .potential-checkbox:hover, .lastminute-checkbox:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.08) !important;
    }
    
    #bid-modal, #buynow-modal {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    /* Dla bardzo dużych ekranów (5 kolumn) */
    @media (min-width: 2200px) {
        #market-listings {
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 18px !important;
        }
    }
    
    /* Dla ekranów 1600px+ (4 kolumny - domyślne) */
    @media (max-width: 1600px) {
        #market-listings {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 14px !important;
        }
    }
    
    /* Dla tabletów (3 kolumny) */
    @media (max-width: 1200px) {
        #market-listings {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
        }
        
        .filters-panel .checkbox-modern {
            min-width: 140px !important;
        }
        
        .market-management-header {
            flex-direction: column;
            gap: 12px;
            text-align: center;
        }
        
        .market-management-header > div:first-child {
            text-align: center;
        }
    }
    
    /* Dla mniejszych tabletów (2 kolumny) */
    @media (max-width: 900px) {
        #market-listings {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
        }
    }
    
    /* Dla telefonów (1 kolumna) */
    @media (max-width: 768px) {
        #market-listings {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
        }
        
        .market-modern-wrapper {
            padding: 8px !important;
        }
        
        .filters-panel {
            padding: 16px !important;
        }
        
        .market-management-header {
            padding: 16px !important;
        }
        
        .filters-panel .checkbox-modern {
            min-width: 100% !important;
        }
        
        .position-btn, .potential-checkbox {
            padding: 6px 10px !important;
            font-size: 0.75rem !important;
        }
        
        .market-pagination {
            flex-direction: column;
            gap: 12px;
        }
        
        #page-info {
            order: -1;
        }
    }
    
    /* Dla bardzo małych telefonów */
    @media (max-width: 480px) {
        .filters-panel {
            padding: 12px !important;
        }
        
        .player-card {
            padding: 12px !important;
            padding-left: 16px !important;
        }
        
        .position-btn, .potential-checkbox {
            padding: 5px 8px !important;
            font-size: 0.7rem !important;
        }
        
        #btn-search-market {
            padding: 12px 24px !important;
            font-size: 0.85rem !important;
        }
        
        .potential-checkbox {
            min-width: 100% !important;
        }
    }
`;
document.head.appendChild(style);
