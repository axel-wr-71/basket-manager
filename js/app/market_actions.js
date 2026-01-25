// js/app/market_actions.js
import { supabaseClient } from '../auth.js';

// Funkcja do renderowania popupu Buy Now
export function renderBuyNowModal(listingId, price, player) {
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
export function renderBidModal(listingId, currentPrice, player) {
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

// Globalne funkcje dla przycisków
export async function handleBid(listingId, currentPrice, playerId) {
    // Znajdź zawodnika
    const listing = window.allMarketData?.find(item => item.id === listingId);
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
}

export async function handleBuyNow(listingId, price, playerId) {
    // Znajdź zawodnika
    const listing = window.allMarketData?.find(item => item.id === listingId);
    if (!listing) {
        alert("❌ Player listing not found!");
        return;
    }
    
    const player = listing.players;
    
    // Renderuj modal Buy Now
    const modalHtml = renderBuyNowModal(listingId, price, player);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

export async function confirmBuyNow(listingId, price) {
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
}

export async function showPlayerProfile(playerId) {
    try {
        // Znajdź zawodnika w danych rynku
        const listing = window.allMarketData?.find(item => item.players.id === playerId);
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
}

// Funkcje pomocnicze dla modali
export function closeBidModal() {
    const modal = document.getElementById('bid-modal');
    if (modal) modal.remove();
}

export function closeBuyNowModal() {
    const modal = document.getElementById('buynow-modal');
    if (modal) modal.remove();
}

export function setBidAmount(amount) {
    const input = document.getElementById('bid-amount-input');
    if (input) {
        input.value = amount;
        updateBidPreview(amount);
    }
}

export function updateBidPreview(amount) {
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
}

export async function submitBid(listingId) {
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
            if (window.loadMarketData) {
                window.loadMarketData();
            }
        }, 1000);
        
    } catch (error) {
        alert(`❌ Failed to place bid: ${error.message}`);
    }
}
