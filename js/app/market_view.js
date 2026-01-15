// js/app/market_view.js
import { supabaseClient } from '../auth.js';
import { calculatePlayerDynamicWage } from '../core/economy.js';

export async function renderMarketView(teamData) {
    const container = document.getElementById('market-container');
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 20px; font-family: 'Inter', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="color: #1a237e; font-weight: 800; margin: 0;">RYNEK <span style="color: #e65100;">TRANSFEROWY</span></h2>
                <div style="background: #fff; padding: 10px 20px; border-radius: 10px; border: 1px solid #ddd; font-weight: 800;">
                    TWOJA GOTÓWKA: <span style="color: #2e7d32;">$${teamData.balance.toLocaleString()}</span>
                </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 30px;">
                <select id="filter-pos" style="padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                    <option value="">Wszystkie Pozycje</option>
                    <option value="PG">Rozgrywający (PG)</option>
                    <option value="SG">Rzucający Obrońca (SG)</option>
                    <option value="SF">Niski Skrzydłowy (SF)</option>
                    <option value="PF">Silny Skrzydłowy (PF)</option>
                    <option value="C">Środkowy (C)</option>
                </select>
                <input type="number" id="filter-ovr" placeholder="Min OVR" style="width: 100px; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                <input type="number" id="filter-age" placeholder="Max Wiek" style="width: 100px; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                <select id="filter-type" style="padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                    <option value="">Wszystkie Typy</option>
                    <option value="auction">Licytacja</option>
                    <option value="buy_now">Kup Teraz</option>
                </select>
                <button onclick="applyMarketFilters()" style="background: #1a237e; color: white; border: none; padding: 10px 25px; border-radius: 8px; font-weight: 700; cursor: pointer;">SZUKAJ</button>
            </div>

            <div id="market-listings" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
                </div>
        </div>
    `;

    loadMarketData();
}

async function loadMarketData(filters = {}) {
    const listContainer = document.getElementById('market-listings');
    listContainer.innerHTML = "Ładowanie ofert...";

    // Pobieramy oferty z bazy wraz z danymi zawodników
    let query = supabaseClient
        .from('transfer_market')
        .select(`*, players(*)`)
        .eq('status', 'active');

    const { data: listings, error } = await query;

    if (error || !listings) {
        listContainer.innerHTML = "Brak aktywnych ofert na rynku.";
        return;
    }

    listContainer.innerHTML = listings.map(item => renderPlayerMarketCard(item)).join('');
}

function renderPlayerMarketCard(item) {
    const p = item.players;
    const isAuction = item.type === 'auction';
    const wage = calculatePlayerDynamicWage(p);
    
    return `
        <div style="background: white; border-radius: 15px; border: 1px solid #e0e0e0; overflow: hidden; position: relative; transition: 0.3s;" onmouseover="this.style.borderColor='#e65100'" onmouseout="this.style.borderColor='#e0e0e0'">
            <div style="background: ${isAuction ? '#1a237e' : '#2e7d32'}; color: white; padding: 5px 15px; font-size: 0.7em; font-weight: 800; text-transform: uppercase;">
                ${isAuction ? 'Licytacja' : 'Kup Teraz'}
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.2em;">${p.first_name} ${p.last_name}</h3>
                        <span style="color: #666; font-size: 0.85em;">${p.position} | Wiek: ${p.age}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5em; font-weight: 900; color: #1a237e;">${p.overall_rating} <small style="font-size: 0.5em; color: #999;">OVR</small></div>
                        <div style="font-size: 0.8em; font-weight: 700; color: #e65100;">POT: ${p.potential}</div>
                    </div>
                </div>

                <div style="margin: 15px 0; background: #f8f9fa; padding: 10px; border-radius: 8px; font-size: 0.85em;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Oczekiwania:</span>
                        <strong style="color: #d32f2f;">$${wage.toLocaleString()} / tydz.</strong>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <div>
                        <span style="font-size: 0.7em; color: #999; text-transform: uppercase; display: block;">
                            ${isAuction ? 'Aktualna oferta' : 'Cena zakupu'}
                        </span>
                        <span style="font-size: 1.3em; font-weight: 800;">$${item.current_price.toLocaleString()}</span>
                    </div>
                    <button onclick="${isAuction ? `bidPlayer('${item.id}')` : `buyPlayerNow('${item.id}')`}" 
                        style="background: ${isAuction ? '#1a237e' : '#2e7d32'}; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; cursor: pointer;">
                        ${isAuction ? 'LICYTUJ' : 'KUP TERAZ'}
                    </button>
                </div>
                <div style="font-size: 0.7em; color: #f44336; margin-top: 10px; text-align: center; font-weight: 700;">
                    Koniec: ${new Date(item.end_time).toLocaleString()}
                </div>
            </div>
        </div>
    `;
}
