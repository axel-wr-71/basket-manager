// js/app/roster_view.js
import { supabaseClient } from '../auth.js';
import { renderPlayerRow } from './player_list_component.js';

/**
 * Symulacja ustawień z profilu Admina (Sekcja Teksty)
 * W docelowej wersji dane te powinny być pobrane z Supabase
 */
const adminSettings = {
    transferTexts: {
        auctionOnlyTitle: "ZAWODNIK DOSTĘPNY W SKŁADZIE",
        auctionOnlyDesc: "Standardowy tryb licytacji. Zawodnik pozostaje w rotacji i może grać w meczach do momentu zakończenia aukcji.",
        buyNowTitle: "ZAWODNIK ZOSTANIE ZABLOKOWANY",
        buyNowDesc: "Uwaga! Ustawienie ceny 'Kup Teraz' powoduje natychmiastowe wycofanie zawodnika ze składu, aby zapewnić gotowość do transferu."
    }
};

/**
 * Mapowanie liczbowego potencjału na prestiżowe rangi
 */
function getPotentialLabel(pot) {
    const p = parseInt(pot) || 0;
    if (p >= 96) return { label: 'G.O.A.T.', color: '#d4af37' };
    if (p >= 92) return { label: 'All-Time Great', color: '#b8860b' };
    if (p >= 88) return { label: 'Elite Franchise', color: '#3b82f6' };
    if (p >= 84) return { label: 'Star Performer', color: '#8b5cf6' };
    if (p >= 79) return { label: 'High Prospect', color: '#10b981' };
    if (p >= 74) return { label: 'Solid Starter', color: '#6366f1' };
    if (p >= 68) return { label: 'Reliable Bench', color: '#64748b' };
    if (p >= 60) return { label: 'Role Player', color: '#94a3b8' };
    if (p >= 50) return { label: 'Deep Bench', color: '#cbd5e1' };
    return { label: 'Project Player', color: '#94a3b8' };
}

export async function renderRosterView(teamData, players) {
    const container = document.getElementById('roster-view-container');
    if (!container) return;

    const safePlayers = Array.isArray(players) ? players : [];
    const sortedByOvr = [...safePlayers].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
    
    const teamLeader = sortedByOvr[0];
    const topProspect = safePlayers
        .filter(p => p.age <= 21)
        .sort((a, b) => (b.potential || 0) - (a.potential || 0))[0];

    container.innerHTML = `
        <div class="roster-container" style="padding: 30px; color: #333; font-family: 'Inter', sans-serif; background: #f4f7f6; min-height: 100vh;">
            <header style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="font-size: 2.2em; font-weight: 800; color: #1a237e; margin:0; letter-spacing: -1px;">ROSTER <span style="color: #e65100;">MANAGEMENT</span></h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Current squad: <strong style="color: #1a237e;">${teamData.team_name || "Twój Zespół"}</strong></p>
                </div>
                <div style="background: #1a237e; color: white; padding: 12px 24px; border-radius: 15px; font-weight: bold; font-size: 0.9em; box-shadow: 0 4px 10px rgba(26,35,126,0.2);">
                    🏀 SQUAD SIZE: ${safePlayers.length} / 12
                </div>
            </header>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; margin-bottom: 30px;">
                ${renderFeaturedPlayerCard('FRANCHISE STAR', teamLeader)}
                ${renderFeaturedPlayerCard('FUTURE PILLAR', topProspect || sortedByOvr[1])}
            </div>

            <div id="media-section-container" style="margin-bottom: 30px;">
                </div>

            <div style="background: white; border-radius: 20px; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead style="background: #f8f9fa; color: #94a3b8; font-size: 0.75em; text-transform: uppercase; letter-spacing: 1px;">
                        <tr>
                            <th style="padding: 15px 25px;">Player & Scouting Report</th>
                            <th style="padding: 15px;">Pos</th>
                            <th style="padding: 15px;">Age</th>
                            <th style="padding: 15px;">Height</th>
                            <th style="padding: 15px;">Salary</th>
                            <th style="padding: 15px;">Potential</th>
                            <th style="padding: 15px;">OVR</th>
                            <th style="padding: 15px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${safePlayers.map(player => {
                            const potLabel = getPotentialLabel(player.potential);
                            return renderPlayerRow(player, potLabel);
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderFeaturedPlayerCard(title, player) {
    if (!player) return '';
    const pot = getPotentialLabel(player.potential);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}&backgroundColor=b6e3f4`;
    
    return `
        <div style="background: #1a237e; padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; color: white;">
            <img src="${avatarUrl}" style="width: 80px; height: 80px; border-radius: 15px; background: white; border: 3px solid #e65100; object-fit: cover;">
            <div>
                <div style="font-size: 0.65em; color: #e65100; font-weight: 800; letter-spacing: 1.5px; margin-bottom: 5px; text-transform: uppercase;">${title}</div>
                <div style="font-size: 1.4em; font-weight: 800;">${player.first_name} ${player.last_name}</div>
                <div style="font-size: 0.85em; color: #a5b4fc; font-weight: 600;">${player.position} | <span style="color: ${pot.color}">${pot.label}</span></div>
            </div>
        </div>
    `;
}

/**
 * Dynamiczna aktualizacja UI pop-upu na podstawie wpisanej kwoty
 */
window.updateSaleLogicUI = () => {
    const buyNowInput = document.getElementById('bn-price-input');
    const warningBox = document.getElementById('sale-warning-box');
    const texts = adminSettings.transferTexts;
    
    if (buyNowInput.value && parseInt(buyNowInput.value) > 0) {
        warningBox.style.background = '#fff1f2';
        warningBox.style.borderLeft = '5px solid #be123c';
        warningBox.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center;">
                <span style="font-size: 1.2em;">🚫</span>
                <span style="font-weight: 800; color: #be123c; font-size: 0.85em; text-transform: uppercase;">${texts.buyNowTitle}</span>
            </div>
            <p style="margin: 5px 0 0 0; font-size: 0.82em; color: #9f1239; line-height: 1.5;">${texts.buyNowDesc}</p>
        `;
    } else {
        warningBox.style.background = '#f0f9ff';
        warningBox.style.borderLeft = '5px solid #0ea5e9';
        warningBox.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center;">
                <span style="font-size: 1.2em;">🏀</span>
                <span style="font-weight: 800; color: #075985; font-size: 0.85em; text-transform: uppercase;">${texts.auctionOnlyTitle}</span>
            </div>
            <p style="margin: 5px 0 0 0; font-size: 0.82em; color: #0c4a6e; line-height: 1.5;">${texts.auctionOnlyDesc}</p>
        `;
    }
};

window.sellPlayer = (playerId) => {
    const texts = adminSettings.transferTexts;

    const modalHtml = `
        <div id="sell-player-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(10px);">
            <div style="background: white; width: 450px; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); animation: modalFadeIn 0.3s ease-out;">
                
                <div style="background: #1a237e; padding: 25px; color: white; position: relative;">
                    <h2 style="margin: 0; font-size: 1.3em; font-weight: 800;">TRANSFER LISTING</h2>
                    <p style="margin: 5px 0 0 0; font-size: 0.8em; opacity: 0.7;">Player ID: ${playerId}</p>
                    <button onclick="document.getElementById('sell-player-modal').remove()" style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 1.5em; cursor: pointer;">&times;</button>
                </div>

                <div id="sale-warning-box" style="margin: 20px; padding: 18px; border-radius: 14px; transition: 0.3s; background: #f0f9ff; border-left: 5px solid #0ea5e9;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span style="font-size: 1.2em;">🏀</span>
                        <span style="font-weight: 800; color: #075985; font-size: 0.85em; text-transform: uppercase;">${texts.auctionOnlyTitle}</span>
                    </div>
                    <p style="margin: 5px 0 0 0; font-size: 0.82em; color: #0c4a6e; line-height: 1.5;">${texts.auctionOnlyDesc}</p>
                </div>

                <div style="padding: 0 25px 30px 25px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.75em; font-weight: 800; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase;">Buy Now Price ($)</label>
                        <input type="number" id="bn-price-input" oninput="window.updateSaleLogicUI()" placeholder="Zostaw puste dla licytacji" style="width: 100%; padding: 15px; border-radius: 14px; border: 2px solid #e2e8f0; font-family: 'JetBrains Mono'; font-weight: 700; font-size: 1.1em; box-sizing: border-box; outline: none;">
                    </div>

                    <div style="margin-bottom: 25px;">
                        <label style="display: block; font-size: 0.75em; font-weight: 800; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase;">Auction Duration</label>
                        <select id="auction-duration-select" style="width: 100%; padding: 15px; border-radius: 14px; border: 2px solid #e2e8f0; font-weight: 600; background: #fff; cursor: pointer;">
                            <option value="12">12 Hours</option>
                            <option value="24" selected>24 Hours</option>
                            <option value="48">48 Hours</option>
                        </select>
                    </div>

                    <button onclick="confirmListing('${playerId}')" style="width: 100%; padding: 18px; border-radius: 16px; border: none; background: #1a237e; color: white; font-weight: 800; cursor: pointer; transition: 0.2s; box-shadow: 0 10px 15px -3px rgba(26,35,126,0.3);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        CONFIRM & LIST PLAYER
                    </button>
                </div>
            </div>
        </div>
        <style>
            @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.confirmListing = (playerId) => {
    const buyNow = document.getElementById('bn-price-input').value;
    const duration = document.getElementById('auction-duration-select').value;
    
    console.log(`Action: List player ${playerId}. BN: ${buyNow || 'NONE'}, Dur: ${duration}h`);
    alert("Player has been listed on the market!");
    document.getElementById('sell-player-modal').remove();
};

window.showPlayerProfile = (playerId) => {
    console.log("Opening Profile Hub for player:", playerId);
};
