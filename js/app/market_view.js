// js/app/market_view.js
import { supabaseClient } from '../auth.js';
import { calculateMarketValue } from '../core/economy.js';

const skillNames = {
    1: "okropny", 2: "żałosny", 3: "tragiczny", 4: "słaby", 5: "przeciętny",
    6: "ponadprzeciętny", 7: "porządny", 8: "solidny", 9: "sprawny", 10: "znaczący",
    11: "wybitny", 12: "wspaniały", 13: "świetny", 14: "niesamowity", 15: "cudowny"
};

export async function renderMarketView(teamData) {
    const container = document.getElementById('market-container');
    if (!container) return;

    container.innerHTML = `
        <div class="market-modern-container">
            <header class="market-header">
                <div>
                    <h1>Rynek Transferowy</h1>
                    <p class="budget-display">Twój budżet: <strong>$${teamData.balance.toLocaleString()}</strong></p>
                </div>
            </header>

            <section class="filter-section">
                <div class="filter-group">
                    <select id="f-pos"><option value="">Wszystkie pozycje</option><option value="PG">PG</option><option value="SG">SG</option><option value="SF">SF</option><option value="PF">PF</option><option value="C">C</option></select>
                    <input type="number" id="f-max-ovr" placeholder="Max OVR">
                    <input type="number" id="f-min-age" placeholder="Min Wiek">
                    <input type="number" id="f-max-price" placeholder="Max Cena">
                    <button id="btn-search-market" class="btn-primary">Filtruj Zawodników</button>
                </div>
            </section>

            <div id="market-listings" class="listings-grid">
                </div>
        </div>
    `;

    document.getElementById('btn-search-market').onclick = loadMarketData;
    loadMarketData();
}

async function loadMarketData() {
    const list = document.getElementById('market-listings');
    list.innerHTML = '<div class="loader">Szukanie ofert...</div>';

    const { data, error } = await supabaseClient.from('transfer_market').select('*, players(*)').eq('status', 'active');
    if (error) return;

    const fPos = document.getElementById('f-pos').value;
    const fMaxOvr = document.getElementById('f-max-ovr').value;
    const fMinAge = document.getElementById('f-min-age').value;
    const fMaxPrice = document.getElementById('f-max-price').value;

    const filtered = data.filter(item => {
        const p = item.players;
        return (!fPos || p.position === fPos) &&
               (!fMaxOvr || p.overall_rating <= fMaxOvr) &&
               (!fMinAge || p.age >= fMinAge) &&
               (!fMaxPrice || item.current_price <= fMaxPrice);
    });

    list.innerHTML = filtered.map(item => renderPlayerCard(item)).join('');
}

function renderPlayerCard(item) {
    const p = item.players;
    const marketVal = calculateMarketValue(p);
    
    const getSkillLabel = (val) => `<span class="skill-label level-${val}">${skillNames[val] || 'nieznany'} (${val})</span>`;

    return `
        <div class="player-card-modern">
            <div class="card-header">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${p.last_name}" class="player-avatar">
                <div class="player-main-info">
                    <h3>${p.first_name} ${p.last_name} (${p.id})</h3>
                    <p>${p.position} | Wiek: ${p.age} | Wzrost: ${p.height} cm | Potencjał: <span class="pot-tag">${p.potential}</span></p>
                </div>
                <div class="player-ovr-box">${p.overall_rating}</div>
            </div>

            <div class="card-skills-grid">
                <div class="skill-col">
                    <p>Rzut z wyskoku: ${getSkillLabel(p.jump_shot)}</p>
                    <p>Zasięg rzutu: ${getSkillLabel(p.range)}</p>
                    <p>Obr. na obwodzie: ${getSkillLabel(p.outside_def)}</p>
                    <p>Kozłowanie: ${getSkillLabel(p.handling)}</p>
                    <p>Jeden na jeden: ${getSkillLabel(p.driving)}</p>
                </div>
                <div class="skill-col">
                    <p>Podania: ${getSkillLabel(p.passing)}</p>
                    <p>Rzut z bliska: ${getSkillLabel(p.inside_shot)}</p>
                    <p>Obr. pod koszem: ${getSkillLabel(p.inside_def)}</p>
                    <p>Zbieranie: ${getSkillLabel(p.rebounding)}</p>
                    <p>Blokowanie: ${getSkillLabel(p.blocking)}</p>
                </div>
            </div>

            <div class="card-footer">
                <div class="price-info">
                    <span class="label">Cena aktualna:</span>
                    <span class="price">$${item.current_price.toLocaleString()}</span>
                    <span class="valuation">Wycena: $${marketVal.toLocaleString()}</span>
                </div>
                <button class="btn-bid" onclick="handleBid('${item.id}')">Licytuj</button>
            </div>
        </div>
    `;
}
