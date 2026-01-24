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
    nationality: '',
    offerType: 'all'
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

// Pobieranie danych potencjału zgodnie z roster_view.js
function getPotentialData(potentialId) {
    if (!potentialId) return { label: 'Unknown', color: '#94a3b8', icon: '👤' };
    
    // Sprawdź czy mamy globalne definicje potencjału
    if (window.potentialDefinitions && Object.keys(window.potentialDefinitions).length > 0) {
        // Szukaj po ID
        const def = Object.values(window.potentialDefinitions).find(d => d.id === potentialId);
        if (def) return def;
        
        // Szukaj po label
        const defByLabel = Object.values(window.potentialDefinitions).find(d => 
            d.label.toLowerCase() === potentialId.toLowerCase() ||
            d.id.toLowerCase() === potentialId.toLowerCase()
        );
        if (defByLabel) return defByLabel;
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
    
    return fallbackMap[potentialId] || { label: potentialId || 'Unknown', color: '#94a3b8', icon: '👤' };
}

// Generowanie opcji potencjału
function generatePotentialOptions() {
    if (window.potentialDefinitions && Object.keys(window.potentialDefinitions).length > 0) {
        const options = Object.values(window.potentialDefinitions)
            .sort((a, b) => b.order_index - a.order_index)
            .map(def => `<option value="${def.id}">${def.label} ${def.emoji || ''}</option>`)
            .join('');
        return `<option value="">All Potential Levels</option>${options}`;
    }
    
    // Fallback options
    return `
        <option value="">All Potential Levels</option>
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
    `;
}

// Funkcja do renderowania profilu zawodnika (jak w roster_view)
function renderPlayerProfile(player) {
    const potData = getPotentialData(player.potential);
    const ovr = calculateOVR(player);
    const ovrStyle = getOvrStyle(ovr);
    const posStyle = getPositionStyle(player.position);
    
    const heightCm = player.height || 0;
    const inchesTotal = heightCm * 0.393701;
    const ft = Math.floor(inchesTotal / 12);
    const inc = Math.round(inchesTotal % 12);
    const heightInFt = heightCm > 0 ? `${ft}'${inc}"` : '--';

    const countryCode = player.country || player.nationality || "";
    const flagUrl = getFlagUrl(countryCode);

    return `
        <div style="
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
                border-radius: 20px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                position: relative;
            ">
                <!-- Nagłówek -->
                <div style="
                    background: linear-gradient(135deg, #1a237e 0%, #303f9f 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 20px 20px 0 0;
                    position: relative;
                ">
                    <button onclick="closePlayerProfile()" style="
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        border: none;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        font-size: 1.2rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">✕</button>
                    
                    <div style="display: flex; align-items: center; gap: 25px;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.first_name}${player.last_name}" 
                             style="
                                width: 120px;
                                height: 120px;
                                background: white;
                                border-radius: 16px;
                                border: 4px solid rgba(255, 255, 255, 0.3);
                             ">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px; flex-wrap: wrap;">
                                <h1 style="margin: 0; font-size: 2rem; font-weight: 900;">
                                    ${player.first_name} ${player.last_name}
                                </h1>
                                ${flagUrl ? `
                                    <img src="${flagUrl}" style="
                                        width: 40px;
                                        height: auto;
                                        border-radius: 6px;
                                        border: 2px solid rgba(255, 255, 255, 0.3);
                                    ">
                                ` : ''}
                                ${player.is_rookie ? `
                                    <span style="
                                        background: #fef3c7;
                                        color: #92400e;
                                        font-size: 0.8rem;
                                        padding: 6px 14px;
                                        border-radius: 20px;
                                        font-weight: 900;
                                        border: 2px solid #fcd34d;
                                    ">ROOKIE</span>
                                ` : ''}
                            </div>
                            
                            <div style="display: flex; gap: 20px; margin-top: 15px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="
                                        background: ${posStyle.bg};
                                        color: ${posStyle.text};
                                        width: 50px;
                                        height: 50px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        border-radius: 12px;
                                        font-weight: 900;
                                        font-size: 1.2rem;
                                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                                    ">
                                        ${player.position}
                                    </div>
                                    <div>
                                        <div style="font-size: 0.8rem; opacity: 0.8;">POSITION</div>
                                        <div style="font-weight: 700;">${posStyle.label}</div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="
                                        width: 50px;
                                        height: 50px;
                                        background: ${ovrStyle.bg};
                                        border: 3px solid ${ovrStyle.border};
                                        border-radius: 12px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-weight: 900;
                                        color: ${ovrStyle.color};
                                        font-size: 1.4rem;
                                    ">
                                        ${ovr}
                                    </div>
                                    <div>
                                        <div style="font-size: 0.8rem; opacity: 0.8;">OVERALL</div>
                                        <div style="font-weight: 700;">${ovr}/100</div>
                                    </div>
                                </div>
                                
                                <div style="
                                    background: ${potData.color}20;
                                    border: 2px solid ${potData.color};
                                    border-radius: 12px;
                                    padding: 12px 20px;
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                ">
                                    <span style="font-size: 1.5rem;">${potData.icon}</span>
                                    <div>
                                        <div style="font-size: 0.8rem; opacity: 0.8;">POTENTIAL</div>
                                        <div style="font-weight: 700; color: ${potData.color};">${potData.label}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Główna zawartość -->
                <div style="padding: 30px;">
                    <!-- Informacje podstawowe -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                        <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px;">
                            <div style="font-size: 0.9rem; color: #64748b; margin-bottom: 8px;">AGE</div>
                            <div style="font-size: 2rem; font-weight: 900; color: #1a237e;">${player.age}</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px;">
                            <div style="font-size: 0.9rem; color: #64748b; margin-bottom: 8px;">HEIGHT</div>
                            <div style="font-size: 1.8rem; font-weight: 900; color: #1a237e;">${heightInFt}</div>
                            <div style="font-size: 0.8rem; color: #94a3b8;">${heightCm} cm</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px;">
                            <div style="font-size: 0.9rem; color: #64748b; margin-bottom: 8px;">SALARY</div>
                            <div style="font-size: 1.8rem; font-weight: 900; color: #059669;">$${(player.salary || 0).toLocaleString()}</div>
                            <div style="font-size: 0.8rem; color: #94a3b8;">per season</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px;">
                            <div style="font-size: 0.9rem; color: #64748b; margin-bottom: 8px;">MARKET VALUE</div>
                            <div style="font-size: 1.8rem; font-weight: 900; color: #059669;">$${calculateMarketValue(player).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <!-- Umiejętności -->
                    <h3 style="color: #1a237e; margin-bottom: 20px; font-size: 1.2rem; font-weight: 900;">SKILLS RATINGS</h3>
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 15px;
                        margin-bottom: 30px;
                    ">
                        ${[
                            { label: '2PT Shot', value: player.skill_2pt || 0 },
                            { label: '3PT Shot', value: player.skill_3pt || 0 },
                            { label: 'Dunking', value: player.skill_dunk || 0 },
                            { label: 'Free Throw', value: player.skill_ft || 0 },
                            { label: 'Passing', value: player.skill_passing || 0 },
                            { label: 'Dribbling', value: player.skill_dribbling || 0 },
                            { label: 'Stamina', value: player.skill_stamina || 0 },
                            { label: 'Rebounding', value: player.skill_rebound || 0 },
                            { label: 'Blocking', value: player.skill_block || 0 },
                            { label: 'Stealing', value: player.skill_steal || 0 },
                            { label: '1on1 Offense', value: player.skill_1on1_off || 0 },
                            { label: '1on1 Defense', value: player.skill_1on1_def || 0 }
                        ].map(skill => `
                            <div style="
                                background: ${skill.value >= 15 ? '#d1fae5' : skill.value >= 10 ? '#fef3c7' : '#f3f4f6'};
                                border: 2px solid ${skill.value >= 15 ? '#a7f3d0' : skill.value >= 10 ? '#fde68a' : '#e5e7eb'};
                                border-radius: 10px;
                                padding: 15px;
                            ">
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    margin-bottom: 8px;
                                ">
                                    <div style="
                                        font-weight: 700;
                                        color: ${skill.value >= 15 ? '#065f46' : skill.value >= 10 ? '#92400e' : '#475569'};
                                    ">${skill.label}</div>
                                    <div style="
                                        font-size: 1.4rem;
                                        font-weight: 900;
                                        color: ${skill.value >= 15 ? '#059669' : skill.value >= 10 ? '#d97706' : '#475569'};
                                    ">${skill.value}</div>
                                </div>
                                <div style="
                                    height: 8px;
                                    background: #e5e7eb;
                                    border-radius: 4px;
                                    overflow: hidden;
                                ">
                                    <div style="
                                        height: 100%;
                                        width: ${(skill.value / 20) * 100}%;
                                        background: ${skill.value >= 15 ? '#10b981' : skill.value >= 10 ? '#f59e0b' : '#94a3b8'};
                                    "></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Przycisk zamknięcia -->
                    <div style="text-align: center; margin-top: 30px;">
                        <button onclick="closePlayerProfile()" style="
                            background: #1a237e;
                            color: white;
                            border: none;
                            padding: 15px 40px;
                            border-radius: 12px;
                            font-weight: 800;
                            cursor: pointer;
                            font-size: 1rem;
                            display: inline-flex;
                            align-items: center;
                            gap: 10px;
                        ">
                            <span>←</span> Back to Market
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
                border-radius: 20px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                position: relative;
            ">
                <!-- Nagłówek -->
                <div style="
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    padding: 25px;
                    border-radius: 20px 20px 0 0;
                    position: relative;
                ">
                    <button onclick="closeBidModal()" style="
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        border: none;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        font-size: 1rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">✕</button>
                    
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="
                            width: 60px;
                            height: 60px;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 2rem;
                        ">🏷️</div>
                        <div>
                            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 900;">PLACE A BID</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.9rem;">
                                ${player.first_name} ${player.last_name}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Zawartość -->
                <div style="padding: 30px;">
                    <!-- Informacje o aktualnej ofercie -->
                    <div style="
                        background: #fef3c7;
                        border: 2px solid #fcd34d;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 25px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <div style="font-size: 0.8rem; color: #92400e; font-weight: 600; text-transform: uppercase;">Current Bid</div>
                                <div style="font-size: 2rem; font-weight: 900; color: #b45309;">$${currentPrice.toLocaleString()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.8rem; color: #92400e; font-weight: 600; text-transform: uppercase;">Your Balance</div>
                                <div style="font-size: 1.5rem; font-weight: 900; color: #1a237e;">$${window.currentTeamBalance.toLocaleString()}</div>
                            </div>
                        </div>
                        <div style="
                            background: rgba(180, 83, 9, 0.1);
                            border-radius: 8px;
                            padding: 10px 15px;
                            font-size: 0.85rem;
                            color: #92400e;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span>📈</span>
                            Minimum bid: <strong style="margin-left: 5px;">$${minBid.toLocaleString()}</strong>
                        </div>
                    </div>
                    
                    <!-- Formularz licytacji -->
                    <div style="margin-bottom: 30px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #475569;">
                            Enter Your Bid Amount ($)
                        </label>
                        <div style="position: relative;">
                            <span style="
                                position: absolute;
                                left: 15px;
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
                                        padding: 16px 16px 16px 40px;
                                        border: 2px solid #e2e8f0;
                                        border-radius: 12px;
                                        font-size: 1.2rem;
                                        font-weight: 700;
                                        color: #1a237e;
                                        box-sizing: border-box;
                                   "
                                   oninput="updateBidPreview(this.value)">
                        </div>
                        
                        <!-- Szybkie przyciski -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;">
                            ${[10000, 25000, 50000, 100000].map(amount => `
                                <button onclick="setBidAmount(${currentPrice + amount})" style="
                                    background: #f1f5f9;
                                    color: #475569;
                                    border: 2px solid #e2e8f0;
                                    padding: 10px;
                                    border-radius: 8px;
                                    font-weight: 700;
                                    cursor: pointer;
                                    font-size: 0.85rem;
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
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 25px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <div style="font-size: 0.8rem; color: #0369a1; font-weight: 600; text-transform: uppercase;">Your Bid</div>
                                <div id="preview-bid-amount" style="font-size: 1.8rem; font-weight: 900; color: #0c4a6e;">$${minBid.toLocaleString()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.8rem; color: #0369a1; font-weight: 600; text-transform: uppercase;">New Balance</div>
                                <div id="preview-new-balance" style="font-size: 1.5rem; font-weight: 900; color: ${window.currentTeamBalance - minBid >= 0 ? '#059669' : '#ef4444'};">$${(window.currentTeamBalance - minBid).toLocaleString()}</div>
                            </div>
                        </div>
                        <div id="bid-warning" style="
                            font-size: 0.85rem;
                            color: ${window.currentTeamBalance - minBid >= 0 ? '#059669' : '#ef4444'};
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            margin-top: 10px;
                        ">
                            ${window.currentTeamBalance - minBid >= 0 ? 
                                '✅ Sufficient funds available' : 
                                '❌ Insufficient funds'}
                        </div>
                    </div>
                    
                    <!-- Przyciski akcji -->
                    <div style="display: flex; gap: 15px;">
                        <button onclick="closeBidModal()" style="
                            flex: 1;
                            background: #f1f5f9;
                            color: #64748b;
                            border: 2px solid #e2e8f0;
                            padding: 16px;
                            border-radius: 12px;
                            font-weight: 800;
                            cursor: pointer;
                            font-size: 0.95rem;
                            transition: all 0.2s;
                        ">
                            Cancel
                        </button>
                        <button onclick="submitBid('${listingId}')" id="submit-bid-btn" style="
                            flex: 1;
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                            color: white;
                            border: none;
                            padding: 16px;
                            border-radius: 12px;
                            font-weight: 800;
                            cursor: pointer;
                            font-size: 0.95rem;
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
            <!-- Header z finansami -->
            <div class="market-management-header" style="
                background: linear-gradient(135deg, #1a237e 0%, #303f9f 100%);
                color: white;
                padding: 24px 32px;
                border-radius: 16px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 8px 24px rgba(26, 35, 126, 0.2);
            ">
                <div>
                    <h1 style="margin:0; font-weight:900; font-size: 2rem; letter-spacing: -0.5px;">
                        🏀 TRANSFER MARKET
                    </h1>
                    <p style="margin:8px 0 0 0; opacity: 0.9; font-size: 0.95rem;">
                        Scout and sign new talent for your franchise
                    </p>
                </div>
                <div style="
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(10px);
                    padding: 16px 28px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    text-align: center;
                ">
                    <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 4px;">AVAILABLE FUNDS</div>
                    <div style="font-size: 1.8rem; font-weight: 900;">$${(teamData.balance || 0).toLocaleString()}</div>
                </div>
            </div>

            <!-- Panel filtrów -->
            <div class="filters-panel" style="
                background: white;
                border-radius: 16px;
                padding: 28px;
                margin-bottom: 30px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
                border: 1px solid #e2e8f0;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin:0; font-size: 1.1rem; color:#1a237e; font-weight:800;">
                        🔍 PLAYER SEARCH FILTERS
                    </h3>
                    <button id="btn-reset-filters" style="
                        background: #f8fafc;
                        color: #64748b;
                        border: 1px solid #e2e8f0;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.85rem;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.2s;
                    ">
                        <span>🔄</span> Reset All
                    </button>
                </div>

                <!-- Grid filtrów - dodano narodowość -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
                    <!-- Pozycja -->
                    <div class="filter-group">
                        <label style="display: block; font-size: 0.8rem; color: #475569; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">
                            Position
                        </label>
                        <select id="filter-position" class="filter-select" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid #e2e8f0;
                            border-radius: 10px;
                            font-size: 0.9rem;
                            background: white;
                            color: #334155;
                            transition: all 0.2s;
                            cursor: pointer;
                        ">
                            <option value="">All Positions</option>
                            <option value="PG">PG - Point Guard</option>
                            <option value="SG">SG - Shooting Guard</option>
                            <option value="SF">SF - Small Forward</option>
                            <option value="PF">PF - Power Forward</option>
                            <option value="C">C - Center</option>
                        </select>
                    </div>

                    <!-- Wiek -->
                    <div class="filter-group">
                        <label style="display: block; font-size: 0.8rem; color: #475569; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">
                            Age Range
                        </label>
                        <div style="display: flex; gap: 10px;">
                            <input id="filter-min-age" type="number" min="18" max="40" placeholder="Min" style="
                                flex: 1;
                                padding: 12px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 0.9rem;
                                text-align: center;
                            ">
                            <div style="color: #94a3b8; align-self: center; font-weight: 600;">→</div>
                            <input id="filter-max-age" type="number" min="18" max="40" placeholder="Max" style="
                                flex: 1;
                                padding: 12px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 0.9rem;
                                text-align: center;
                            ">
                        </div>
                    </div>

                    <!-- Cena -->
                    <div class="filter-group">
                        <label style="display: block; font-size: 0.8rem; color: #475569; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">
                            Price Range ($)
                        </label>
                        <div style="display: flex; gap: 10px;">
                            <input id="filter-min-price" type="number" min="0" placeholder="Min" style="
                                flex: 1;
                                padding: 12px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 0.9rem;
                                text-align: center;
                            ">
                            <div style="color: #94a3b8; align-self: center; font-weight: 600;">→</div>
                            <input id="filter-max-price" type="number" min="0" placeholder="Max" style="
                                flex: 1;
                                padding: 12px;
                                border: 2px solid #e2e8f0;
                                border-radius: 10px;
                                font-size: 0.9rem;
                                text-align: center;
                            ">
                        </div>
                    </div>

                    <!-- Potencjał -->
                    <div class="filter-group">
                        <label style="display: block; font-size: 0.8rem; color: #475569; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">
                            Potential
                        </label>
                        <select id="filter-potential" class="filter-select" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid #e2e8f0;
                            border-radius: 10px;
                            font-size: 0.9rem;
                            background: white;
                            color: #334155;
                            transition: all 0.2s;
                            cursor: pointer;
                        ">
                            ${generatePotentialOptions()}
                        </select>
                    </div>

                    <!-- Narodowość -->
                    <div class="filter-group">
                        <label style="display: block; font-size: 0.8rem; color: #475569; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">
                            Nationality
                        </label>
                        <select id="filter-nationality" class="filter-select" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid #e2e8f0;
                            border-radius: 10px;
                            font-size: 0.9rem;
                            background: white;
                            color: #334155;
                            transition: all 0.2s;
                            cursor: pointer;
                        ">
                            <option value="">All Nationalities</option>
                            <option value="US">United States 🇺🇸</option>
                            <option value="GB">United Kingdom 🇬🇧</option>
                            <option value="ES">Spain 🇪🇸</option>
                            <option value="FR">France 🇫🇷</option>
                            <option value="DE">Germany 🇩🇪</option>
                            <option value="IT">Italy 🇮🇹</option>
                            <option value="GR">Greece 🇬🇷</option>
                            <option value="RS">Serbia 🇷🇸</option>
                            <option value="LT">Lithuania 🇱🇹</option>
                            <option value="HR">Croatia 🇭🇷</option>
                            <option value="SI">Slovenia 🇸🇮</option>
                            <option value="AU">Australia 🇦🇺</option>
                            <option value="CA">Canada 🇨🇦</option>
                            <option value="CN">China 🇨🇳</option>
                            <option value="BR">Brazil 🇧🇷</option>
                            <option value="AR">Argentina 🇦🇷</option>
                            <option value="TR">Turkey 🇹🇷</option>
                            <option value="PL">Poland 🇵🇱</option>
                        </select>
                    </div>
                </div>

                <!-- Filtry checkbox -->
                <div style="border-top: 2px solid #f1f5f9; padding-top: 25px;">
                    <div style="font-size: 0.85rem; color: #475569; margin-bottom: 15px; font-weight: 600;">
                        Offer Type
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                        <label class="checkbox-modern" style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            cursor: pointer;
                            padding: 12px 20px;
                            background: #f8fafc;
                            border-radius: 10px;
                            border: 2px solid #e2e8f0;
                            transition: all 0.2s;
                            user-select: none;
                            flex: 1;
                            min-width: 180px;
                        ">
                            <input type="radio" name="offerType" value="all" checked 
                                   style="transform: scale(1.2); accent-color: #1a237e;">
                            <div style="font-weight: 600; color: #475569;">All Offers</div>
                            <div style="
                                margin-left: auto;
                                background: #e2e8f0;
                                color: #64748b;
                                font-size: 0.75rem;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-weight: 700;
                            ">Default</div>
                        </label>
                        
                        <label class="checkbox-modern" style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            cursor: pointer;
                            padding: 12px 20px;
                            background: #f8fafc;
                            border-radius: 10px;
                            border: 2px solid #e2e8f0;
                            transition: all 0.2s;
                            user-select: none;
                            flex: 1;
                            min-width: 180px;
                        ">
                            <input type="radio" name="offerType" value="auction"
                                   style="transform: scale(1.2); accent-color: #1a237e;">
                            <div style="font-weight: 600; color: #475569;">Auction Only</div>
                            <div style="
                                margin-left: auto;
                                background: #fef3c7;
                                color: #92400e;
                                font-size: 0.75rem;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-weight: 700;
                            ">🏷️ Bid</div>
                        </label>
                        
                        <label class="checkbox-modern" style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            cursor: pointer;
                            padding: 12px 20px;
                            background: #f8fafc;
                            border-radius: 10px;
                            border: 2px solid #e2e8f0;
                            transition: all 0.2s;
                            user-select: none;
                            flex: 1;
                            min-width: 180px;
                        ">
                            <input type="radio" name="offerType" value="buy_now"
                                   style="transform: scale(1.2); accent-color: #1a237e;">
                            <div style="font-weight: 600; color: #475569;">Buy Now Only</div>
                            <div style="
                                margin-left: auto;
                                background: #d1fae5;
                                color: #065f46;
                                font-size: 0.75rem;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-weight: 700;
                            ">⚡ Instant</div>
                        </label>
                    </div>
                </div>

                <!-- Przycisk wyszukiwania -->
                <div style="margin-top: 30px; text-align: center;">
                    <button id="btn-search-market" style="
                        background: linear-gradient(135deg, #1a237e 0%, #303f9f 100%);
                        color: white;
                        border: none;
                        padding: 16px 40px;
                        border-radius: 12px;
                        font-weight: 800;
                        cursor: pointer;
                        font-size: 1rem;
                        display: inline-flex;
                        align-items: center;
                        gap: 12px;
                        box-shadow: 0 6px 20px rgba(26, 35, 126, 0.25);
                        transition: all 0.3s;
                    ">
                        <span style="font-size: 1.2rem;">🔍</span>
                        SEARCH PLAYERS
                    </button>
                </div>
            </div>

            <!-- Statystyki -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border: 2px solid #bae6fd;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                ">
                    <div style="font-size: 0.8rem; color: #0369a1; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">Total Players</div>
                    <div id="stat-total" style="font-size: 2rem; font-weight: 900; color: #0c4a6e;">0</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border: 2px solid #a7f3d0;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                ">
                    <div style="font-size: 0.8rem; color: #15803d; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">Avg Price</div>
                    <div id="stat-avg-price" style="font-size: 2rem; font-weight: 900; color: #166534;">$0</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    border: 2px solid #fcd34d;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                ">
                    <div style="font-size: 0.8rem; color: #d97706; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">Youngest</div>
                    <div id="stat-youngest" style="font-size: 2rem; font-weight: 900; color: #92400e;">18</div>
                </div>
                <div style="
                    background: linear-gradient(135deg, #fae8ff 0%, #f5d0fe 100%);
                    border: 2px solid #f0abfc;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                ">
                    <div style="font-size: 0.8rem; color: #a21caf; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">Highest OVR</div>
                    <div id="stat-highest-ovr" style="font-size: 2rem; font-weight: 900; color: #86198f;">0</div>
                </div>
            </div>

            <!-- Lista ofert w grid 4 kolumny -->
            <div id="market-listings" style="
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 25px;
                margin-bottom: 40px;
            "></div>

            <!-- Paginacja -->
            <div class="market-pagination" style="
                margin-top: 40px;
                padding: 25px;
                background: #f8fafc;
                border-radius: 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 20px;
            ">
                <button id="prev-page" class="pag-btn" style="
                    background: white;
                    color: #475569;
                    border: 2px solid #e2e8f0;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                ">
                    <span>←</span> Previous
                </button>
                <div id="page-info" style="
                    font-weight: 800;
                    color: #1a237e;
                    font-size: 0.95rem;
                    background: white;
                    padding: 10px 20px;
                    border-radius: 10px;
                    border: 2px solid #e2e8f0;
                "></div>
                <button id="next-page" class="pag-btn" style="
                    background: #1a237e;
                    color: white;
                    border: 2px solid #1a237e;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                ">
                    Next <span>→</span>
                </button>
            </div>
        </div>
    `;

    // Event Listeners
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
    currentFilters = {
        position: document.getElementById('filter-position').value,
        minAge: parseInt(document.getElementById('filter-min-age').value) || '',
        maxAge: parseInt(document.getElementById('filter-max-age').value) || '',
        minPrice: parseInt(document.getElementById('filter-min-price').value) || '',
        maxPrice: parseInt(document.getElementById('filter-max-price').value) || '',
        potential: document.getElementById('filter-potential').value,
        nationality: document.getElementById('filter-nationality').value,
        offerType: document.querySelector('input[name="offerType"]:checked').value
    };
    
    console.log('Updated filters:', currentFilters);
}

function resetFilters() {
    // Resetuj selecty
    document.getElementById('filter-position').value = '';
    document.getElementById('filter-potential').value = '';
    document.getElementById('filter-nationality').value = '';
    
    // Resetuj inputy numeryczne
    ['filter-min-age', 'filter-max-age', 'filter-min-price', 'filter-max-price'].forEach(id => {
        document.getElementById(id).value = '';
    });
    
    // Resetuj radio buttons
    document.querySelector('input[name="offerType"][value="all"]').checked = true;
    
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
        minPrice: '',
        maxPrice: '',
        potential: '',
        nationality: '',
        offerType: 'all'
    };
}

async function loadMarketData() {
    const list = document.getElementById('market-listings');
    list.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <div class="loader" style="
                display: inline-block;
                width: 50px;
                height: 50px;
                border: 4px solid #e2e8f0;
                border-top: 4px solid #1a237e;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <div style="color: #64748b; font-weight: 600; font-size: 1rem;">Loading market data...</div>
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
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="color: #ef4444; font-size: 2rem; margin-bottom: 15px;">⚠️</div>
                    <h3 style="margin: 0 0 10px 0; color: #ef4444; font-weight: 600;">Error loading data</h3>
                    <p style="margin: 0; color: #94a3b8; font-size: 0.9rem;">${error.message}</p>
                </div>
            `;
            return;
        }

        allMarketData = data || [];
        
        // Filtrowanie danych
        allMarketData = allMarketData.filter(item => {
            const player = item.players;
            
            // Filtruj pozycję
            if (currentFilters.position && player.position !== currentFilters.position) {
                return false;
            }
            
            // Filtruj wiek
            if (currentFilters.minAge && player.age < currentFilters.minAge) {
                return false;
            }
            if (currentFilters.maxAge && player.age > currentFilters.maxAge) {
                return false;
            }
            
            // Filtruj potencjał
            if (currentFilters.potential && player.potential !== currentFilters.potential) {
                return false;
            }
            
            // Filtruj narodowość
            if (currentFilters.nationality) {
                const playerCountry = player.country || player.nationality || "";
                if (playerCountry !== currentFilters.nationality) {
                    return false;
                }
            }
            
            // Filtruj typ oferty
            if (currentFilters.offerType !== 'all' && item.type !== currentFilters.offerType) {
                return false;
            }
            
            // Filtruj cenę
            let price;
            if (item.type === 'auction') {
                price = item.current_price;
            } else if (item.type === 'buy_now') {
                price = item.buy_now_price;
            } else if (item.type === 'both') {
                price = Math.min(item.current_price || Infinity, item.buy_now_price || Infinity);
                if (price === Infinity) price = 0;
            } else {
                price = 0;
            }

            if (currentFilters.minPrice && price < currentFilters.minPrice) return false;
            if (currentFilters.maxPrice && price > currentFilters.maxPrice) return false;
            
            return true;
        });
        
        console.log(`Filtered data: ${allMarketData.length} items`);
        updateMarketStats(allMarketData);
        displayCurrentPage();
        
    } catch (error) {
        console.error("Error loading market data:", error);
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="color: #ef4444; font-size: 2rem; margin-bottom: 15px;">⚠️</div>
                <h3 style="margin: 0 0 10px 0; color: #ef4444; font-weight: 600;">Unexpected error</h3>
                <p style="margin: 0; color: #94a3b8; font-size: 0.9rem;">Please try again later</p>
            </div>
        `;
    }
}

function updateMarketStats(data) {
    if (data.length === 0) {
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-avg-price').textContent = '$0';
        document.getElementById('stat-youngest').textContent = '0';
        document.getElementById('stat-highest-ovr').textContent = '0';
        return;
    }

    // Total players
    document.getElementById('stat-total').textContent = data.length.toLocaleString();

    // Average price
    const avgPrice = Math.round(data.reduce((sum, item) => {
        const price = item.current_price || item.buy_now_price || 0;
        return sum + price;
    }, 0) / data.length);
    document.getElementById('stat-avg-price').textContent = `$${avgPrice.toLocaleString()}`;

    // Youngest player
    const youngest = Math.min(...data.map(item => item.players.age || 0));
    document.getElementById('stat-youngest').textContent = youngest;

    // Highest OVR
    const highestOVR = Math.max(...data.map(item => calculateOVR(item.players) || 0));
    document.getElementById('stat-highest-ovr').textContent = highestOVR;
}

function displayCurrentPage() {
    const list = document.getElementById('market-listings');
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = allMarketData.slice(start, end);

    if (pageData.length === 0) {
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0;">
                <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.2;">🏀</div>
                <h3 style="margin: 0 0 10px 0; color: #475569; font-weight: 700; font-size: 1.3rem;">No players found</h3>
                <p style="margin: 0; color: #94a3b8; font-size: 0.95rem; max-width: 400px; margin: 0 auto;">Try adjusting your search filters or check back later</p>
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
        <span style="margin-left: 10px; color: #94a3b8;">•</span>
        <span style="margin-left: 10px; color: #475569; font-weight: 600;">${allMarketData.length} players</span>
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
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPlayerCard(item) {
    const p = item.players;
    if (!p) return '';

    const marketVal = calculateMarketValue(p);
    const ovr = calculateOVR(p);
    const posStyle = getPositionStyle(p.position);
    const potData = getPotentialData(p.potential);
    
    const rookieBadge = p.is_rookie ? `
        <span style="
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            color: #92400e;
            font-size: 0.7rem;
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: 900;
            display: inline-block;
            margin-left: 8px;
            border: 1px solid #fbbf24;
        ">ROOKIE</span>
    ` : '';
    
    // Konwersja wzrostu
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
        
        priceInfo += `
            <div style="
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px solid #fcd34d;
                border-radius: 12px;
                padding: 14px;
                margin-bottom: 15px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 0.75rem; color: #92400e; font-weight: 800; text-transform: uppercase;">Current Bid</span>
                    <span style="font-size: 1.4rem; font-weight: 900; color: #b45309;">$${bidPrice.toLocaleString()}</span>
                </div>
                <div style="font-size: 0.75rem; color: #b45309; display: flex; align-items: center; gap: 6px; font-weight: 600;">
                    <span>⏱️</span> Ends: ${bidEnds}
                </div>
            </div>
        `;
        actionButtons += `
            <button onclick="handleBid('${item.id}', ${bidPrice}, '${p.id}')" style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                font-weight: 900;
                cursor: pointer;
                font-size: 0.85rem;
                flex: 1;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
            ">BID NOW</button>
        `;
    }
    
    if (item.type === 'buy_now' || item.type === 'both') {
        const buyNowPrice = item.buy_now_price || 0;
        if (item.type === 'buy_now' || item.type === 'both') {
            priceInfo += `
                <div style="
                    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                    border: 2px solid #34d399;
                    border-radius: 12px;
                    padding: 14px;
                    margin-bottom: 15px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.75rem; color: #065f46; font-weight: 800; text-transform: uppercase;">Buy Now</span>
                        <span style="font-size: 1.4rem; font-weight: 900; color: #059669;">$${buyNowPrice.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }
        actionButtons += `
            <button onclick="handleBuyNow('${item.id}', ${buyNowPrice})" style="
                background: linear-gradient(135deg, #059669 0%, #065f46 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                font-weight: 900;
                cursor: pointer;
                font-size: 0.85rem;
                flex: 1;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
            ">BUY NOW ⚡</button>
        `;
    }

    const ovrPercentage = (ovr / 100) * 100;
    const ovrStyle = getOvrStyle(ovr);

    return `
        <div class="player-card" style="
            position: relative;
            overflow: hidden;
            background: white;
            border-radius: 18px;
            border: 2px solid #e2e8f0;
            box-shadow: 0 8px 24px rgba(0,0,0,0.06);
            transition: all 0.3s ease;
            height: 100%;
            display: flex;
            flex-direction: column;
        ">
            <!-- Badge typu oferty -->
            <div style="position: absolute; top: 15px; right: 15px; z-index: 10;">
                ${item.type === 'auction' ? `
                    <span style="
                        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                        color: #92400e;
                        font-size: 0.65rem;
                        padding: 6px 14px;
                        border-radius: 20px;
                        font-weight: 900;
                        border: 2px solid #fcd34d;
                    ">🏷️ AUCTION</span>
                ` : ''}
                ${item.type === 'buy_now' ? `
                    <span style="
                        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                        color: #065f46;
                        font-size: 0.65rem;
                        padding: 6px 14px;
                        border-radius: 20px;
                        font-weight: 900;
                        border: 2px solid #34d399;
                    ">⚡ BUY NOW</span>
                ` : ''}
                ${item.type === 'both' ? `
                    <span style="
                        background: linear-gradient(135deg, #dbeafe 0%, #a5b4fc 100%);
                        color: #1e40af;
                        font-size: 0.65rem;
                        padding: 6px 14px;
                        border-radius: 20px;
                        font-weight: 900;
                        border: 2px solid #818cf8;
                    ">🏷️⚡ BOTH</span>
                ` : ''}
            </div>

            <!-- Akcent pozycji -->
            <div style="
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 8px;
                background: ${posStyle.bg};
                border-radius: 18px 0 0 18px;
            "></div>

            <!-- Główna zawartość -->
            <div style="padding: 25px; padding-left: 35px; flex: 1; display: flex; flex-direction: column;">
                <!-- Nagłówek z avatarami -->
                <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <!-- Avatar i OVR -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; min-width: 100px;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.first_name}${p.last_name}" 
                             style="
                                width: 90px;
                                height: 90px;
                                background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
                                border-radius: 16px;
                                border: 4px solid white;
                                box-shadow: 0 6px 12px rgba(0,0,0,0.1);
                             ">
                        <div style="width: 100%; text-align: center;">
                            <div style="
                                height: 10px;
                                background: #e5e7eb;
                                border-radius: 5px;
                                overflow: hidden;
                                margin-bottom: 6px;
                            ">
                                <div style="height: 100%; width: ${ovrPercentage}%; background: ${ovrStyle.border};"></div>
                            </div>
                            <div style="
                                font-size: 0.85rem;
                                font-weight: 900;
                                color: ${ovrStyle.color};
                                background: ${ovrStyle.bg};
                                padding: 4px 12px;
                                border-radius: 20px;
                                display: inline-block;
                                border: 2px solid ${ovrStyle.border};
                            ">
                                OVR: ${ovr}
                            </div>
                        </div>
                    </div>

                    <!-- Informacje o graczu -->
                    <div style="flex: 1;">
                        <!-- Imię i nazwisko -->
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                            <h3 style="margin: 0; font-size: 1.5rem; font-weight: 900; color: #1a237e; line-height: 1.2;">
                                ${p.first_name} ${p.last_name}
                            </h3>
                            ${flagUrl ? `
                                <img src="${flagUrl}" style="
                                    width: 28px;
                                    height: auto;
                                    border-radius: 4px;
                                    border: 2px solid #e2e8f0;
                                ">
                            ` : ''}
                            ${rookieBadge}
                        </div>

                        <!-- Pozycja i potencjał -->
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                            <div style="
                                background: ${posStyle.bg};
                                color: ${posStyle.text};
                                width: 44px;
                                height: 44px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                border-radius: 12px;
                                font-weight: 900;
                                font-size: 1rem;
                                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                            ">
                                ${p.position}
                            </div>
                            <span style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                font-size: 0.95rem;
                                color: ${potData.color};
                                font-weight: 800;
                                background: ${potData.color}15;
                                padding: 8px 14px;
                                border-radius: 10px;
                                border: 2px solid ${potData.color}30;
                            ">
                                <span style="font-size: 1.2rem;">${potData.icon}</span>
                                ${potData.label}
                            </span>
                        </div>

                        <!-- Statystyki podstawowe -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                            <div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.75rem; margin-bottom: 4px;">AGE</div>
                                <div style="font-weight: 900; color: #1a237e; font-size: 1.2rem;">${p.age}</div>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.75rem; margin-bottom: 4px;">HEIGHT</div>
                                <div style="font-weight: 900; color: #1a237e; font-size: 1.2rem;">${heightInFt}</div>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.75rem; margin-bottom: 4px;">SALARY</div>
                                <div style="font-weight: 900; color: #1a237e; font-size: 1.1rem;">$${(p.salary || 0).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Umiejętności -->
                <div style="
                    margin: 20px 0;
                    padding: 18px;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-radius: 14px;
                    border: 2px solid #e2e8f0;
                    flex: 1;
                ">
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 12px;
                    ">
                        ${Object.entries(skills).map(([key, value]) => `
                            <div style="
                                text-align: center;
                                padding: 12px 8px;
                                background: ${value >= 15 ? '#d1fae5' : value >= 10 ? '#fef3c7' : '#f3f4f6'};
                                border-radius: 10px;
                                border: 2px solid ${value >= 15 ? '#a7f3d0' : value >= 10 ? '#fde68a' : '#e5e7eb'};
                                transition: transform 0.2s;
                            ">
                                <div style="
                                    font-size: 0.6rem;
                                    color: ${value >= 15 ? '#065f46' : value >= 10 ? '#92400e' : '#64748b'};
                                    font-weight: 900;
                                    margin-bottom: 6px;
                                    text-transform: uppercase;
                                    letter-spacing: 0.5px;
                                ">${key}</div>
                                <div style="
                                    font-size: 1.2rem;
                                    font-weight: 900;
                                    color: ${value >= 15 ? '#059669' : value >= 10 ? '#d97706' : '#475569'};
                                ">${value}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Stopka z ceną i akcjami -->
                <div style="margin-top: auto;">
                    ${priceInfo}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                        <!-- Wartość rynkowa -->
                        <div>
                            <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">MARKET VALUE</div>
                            <div style="font-size: 1.4rem; font-weight: 900; color: #059669;">$${marketVal.toLocaleString()}</div>
                        </div>
                        
                        <!-- Przyciski akcji -->
                        <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end;">
                            ${actionButtons}
                            <button onclick="showPlayerProfile('${p.id}')" style="
                                background: #f8fafc;
                                color: #475569;
                                border: 2px solid #e2e8f0;
                                padding: 12px 20px;
                                border-radius: 10px;
                                font-weight: 700;
                                cursor: pointer;
                                font-size: 0.85rem;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                transition: all 0.2s;
                                min-width: 100px;
                                justify-content: center;
                            ">
                                <span style="font-size: 1rem;">👁️</span> Profile
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

window.handleBuyNow = async (listingId, price) => {
    if (price > window.currentTeamBalance) {
        alert(`💰 Insufficient funds!\nYou have: $${window.currentTeamBalance.toLocaleString()}\nRequired: $${price.toLocaleString()}`);
        return;
    }
    
    const confirmBuy = confirm(`🏀 Purchase Player\n\nBuy this player immediately for $${price.toLocaleString()}?\n\nYour balance will be: $${(window.currentTeamBalance - price).toLocaleString()}`);
    if (!confirmBuy) return;

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
        location.reload();

    } catch (err) {
        console.error("Purchase Error:", err.message);
        alert("❌ Transaction failed: " + err.message);
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
        
        // Renderuj profil
        const profileHtml = renderPlayerProfile(player);
        document.body.insertAdjacentHTML('beforeend', profileHtml);
        
    } catch (error) {
        console.error("Error loading player profile:", error);
        alert("❌ Could not load player profile");
    }
};

// Funkcje pomocnicze dla modali
window.closePlayerProfile = () => {
    const modal = document.getElementById('player-profile-modal');
    if (modal) modal.remove();
};

window.closeBidModal = () => {
    const modal = document.getElementById('bid-modal');
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
        transform: translateY(-5px);
        box-shadow: 0 16px 32px rgba(0,0,0,0.1) !important;
        border-color: #c7d2fe !important;
    }
    
    button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important;
    }
    
    #player-profile-modal {
        animation: fadeIn 0.3s ease;
    }
    
    #bid-modal {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @media (max-width: 1600px) {
        #market-listings {
            grid-template-columns: repeat(3, 1fr) !important;
        }
    }
    
    @media (max-width: 1200px) {
        #market-listings {
            grid-template-columns: repeat(2, 1fr) !important;
        }
    }
    
    @media (max-width: 768px) {
        #market-listings {
            grid-template-columns: 1fr !important;
        }
        
        .market-modern-wrapper {
            padding: 10px !important;
        }
    }
`;
document.head.appendChild(style);
