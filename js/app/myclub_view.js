// js/app/myclub_view.js
import { supabaseClient } from '../auth.js';
import { renderClubHistory } from './club_history.js';
import { renderClubCustomization } from './club_customization.js';
import { renderClubStatistics } from './club_statistics.js';
import { renderPlayerSettings } from './player_settings.js';

let currentClubData = null;
let clubHistory = [];
let clubTrophies = [];
let clubStats = {};
let fanComments = [];
let teamBalance = 0;

/**
 * Główna funkcja renderująca widok My Club
 */
export async function renderMyClubView(team, players) {
    console.log("[MY CLUB] Renderowanie widoku klubu...");
    
    const container = document.getElementById('m-myclub');
    if (!container) {
        console.error("[MY CLUB] Brak kontenera m-myclub!");
        return;
    }
    
    // Pokaż ładowanie
    container.innerHTML = `
        <div class="market-modern-wrapper" style="padding: 30px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 20px; color: #1a237e;">🏀</div>
            <h2 style="color: #1a237e; font-weight: 800;">Ładowanie danych klubu...</h2>
            <p style="color: #64748b; font-size: 0.95rem;">Przygotowywanie Twojego centrum klubu</p>
        </div>
    `;
    
    try {
        // Pobierz wszystkie dane klubu
        const [
            clubData, 
            historyData, 
            trophiesData, 
            statsData, 
            commentsData, 
            customizationData,
            transfersHistory
        ] = await Promise.all([
            fetchClubData(team.id),
            fetchClubHistory(team.id),
            fetchClubTrophies(team.id),
            fetchClubStatistics(team.id),
            fetchFanComments(team.id),
            fetchClubCustomization(team.id),
            fetchTransferHistory(team.id)
        ]);
        
        currentClubData = clubData;
        clubHistory = historyData;
        clubTrophies = trophiesData;
        clubStats = statsData || {};
        fanComments = commentsData;
        teamBalance = team.balance || 0;
        
        // Renderuj główny widok
        renderClubContent(
            container, 
            team, 
            players, 
            clubData, 
            historyData, 
            trophiesData, 
            statsData, 
            commentsData,
            customizationData,
            transfersHistory
        );
        
    } catch (error) {
        console.error("[MY CLUB] Błąd:", error);
        showError(container, error.message);
    }
}

/**
 * Renderuje główną zawartość widoku klubu
 */
function renderClubContent(container, team, players, clubData, history, trophies, stats, comments, customization, transfers) {
    console.log("[MY CLUB] Renderowanie zawartości klubu...");
    
    // Parsuj statystyki klubu
    const clubStats = typeof team.club_stats === 'string' ? JSON.parse(team.club_stats) : (team.club_stats || {});
    const winRate = clubStats.total_wins + clubStats.total_losses > 0 
        ? (clubStats.total_wins / (clubStats.total_wins + clubStats.total_losses) * 100).toFixed(1) 
        : 0;
    
    container.innerHTML = `
        <div class="market-modern-wrapper">
            <!-- NAGŁÓWEK -->
            <div class="market-management-header" style="padding: 20px 0 30px 0; border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="margin:0; font-weight:900; color:#1a237e; text-transform:uppercase; font-family: 'Inter', sans-serif; font-size: 1.8rem;">
                            MY <span style="color:#e65100">CLUB</span>
                        </h1>
                        <p style="margin:10px 0 0 0; color:#64748b; font-size: 0.95rem;">
                            Centrum zarządzania klubem | 
                            <span style="color:#1a237e; font-weight:600;">${team.team_name}</span>
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="background:#1a237e; color:white; padding:12px 24px; border-radius:12px; font-weight:700; font-size:0.9rem; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 12px rgba(26,35,126,0.2);">
                            <span style="font-size: 1.2rem;">🏆</span>
                            ${clubStats.championships || 0} Mistrzostwa
                        </div>
                        <button id="player-settings-btn" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:12px; border-radius:10px; cursor:pointer; transition:all 0.2s;" 
                                onmouseover="this.style.background='#e2e8f0';"
                                onmouseout="this.style.background='#f1f5f9';">
                            <span style="font-size:1.2rem;">⚙️</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- STATYSTYKI KLUBU -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 25px 0;">
                <div style="background: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #0369a1; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Sezony</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #0c4a6e;">${clubStats.seasons_played || 1}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Rozegrane sezony</div>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #15803d; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Wygrane</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #166534;">${clubStats.total_wins || 0}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Wszystkie mecze</div>
                </div>
                <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #d97706; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Skuteczność</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #92400e;">${winRate}%</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Procent wygranych</div>
                </div>
                <div style="background: #fae8ff; border: 1px solid #f5d0fe; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #a21caf; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Kibice</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #86198f;">${(clubStats.fan_base || 1000).toLocaleString()}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Baza kibiców</div>
                </div>
                <div style="background: #fce7f3; border: 1px solid #fbcfe8; border-radius: 10px; padding: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #be185d; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Wartość</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #9d174d;">$${(clubStats.club_value || 1000000).toLocaleString()}</div>
                    <div style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">Wartość klubu</div>
                </div>
            </div>

            <!-- GŁÓWNA ZAWARTOŚĆ -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 25px; margin-top: 20px;">
                
                <!-- LEWA KOLUMNA -->
                <div>
                    <!-- HISTORIA KLUBU -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin:0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                                📜 Historia Klubu
                            </h2>
                            <button onclick="showFullHistory()" 
                                    style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 8px 16px; 
                                           border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;"
                                    onmouseover="this.style.background='#e2e8f0';"
                                    onmouseout="this.style.background='#f1f5f9';">
                                Pełna historia
                            </button>
                        </div>
                        
                        <div id="club-history-timeline">
                            ${renderClubHistoryTimeline(history)}
                        </div>
                    </div>
                    
                    <!-- HISTORIA TRANSFERÓW -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin:0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                                🔄 Historia Transferów
                            </h2>
                            <div style="font-size: 0.85rem; color: #64748b;">
                                ${transfers.length} transferów
                            </div>
                        </div>
                        
                        <div id="transfer-history-chart">
                            ${renderTransferHistoryChart(transfers)}
                        </div>
                        
                        <div id="transfer-history-table">
                            ${renderTransferHistoryTable(transfers.slice(0, 5))}
                        </div>
                    </div>
                </div>
                
                <!-- PRAWA KOLUMNA -->
                <div>
                    <!-- PERSONALIZACJA KLUBU -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                            🎨 Personalizacja
                        </h2>
                        
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div id="club-logo-preview" style="width: 120px; height: 120px; background: #f1f5f9; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; border: 3px solid #e2e8f0;">
                                ${customization?.logo_url ? 
                                    `<img src="${customization.logo_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                                    `<span style="font-size: 2rem;">🏀</span>`
                                }
                            </div>
                            <button onclick="changeClubLogo()" 
                                    style="background: #1a237e; color: white; border: none; padding: 10px 20px; 
                                           border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;"
                                    onmouseover="this.style.background='#283593';"
                                    onmouseout="this.style.background='#1a237e';">
                                Zmień logo
                            </button>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <div style="font-weight: 700; color: #1a237e; font-size: 0.9rem; margin-bottom: 10px;">Barwy klubu</div>
                            <div style="display: flex; gap: 10px;">
                                <div onclick="changeClubColor('primary')" 
                                     style="width: 40px; height: 40px; background: ${customization?.primary_color || '#1a237e'}; border-radius: 8px; cursor: pointer; border: 2px solid #e2e8f0;"></div>
                                <div onclick="changeClubColor('secondary')" 
                                     style="width: 40px; height: 40px; background: ${customization?.secondary_color || '#e65100'}; border-radius: 8px; cursor: pointer; border: 2px solid #e2e8f0;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- SKARBNICA TROFEÓW -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                            🏆 Skarbnica
                        </h2>
                        
                        <div id="trophies-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            ${renderTrophiesGrid(trophies.slice(0, 6))}
                        </div>
                        
                        ${trophies.length > 6 ? `
                            <div style="text-align: center; margin-top: 20px;">
                                <button onclick="showAllTrophies()" 
                                        style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 10px 20px; 
                                               border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;"
                                        onmouseover="this.style.background='#e2e8f0';"
                                        onmouseout="this.style.background='#f1f5f9';">
                                    Pokaż wszystkie (${trophies.length})
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- GŁOS KIBICÓW -->
                    <div style="background: #fff; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="margin:0 0 20px 0; font-size: 1.1rem; color:#1a237e; font-weight:800; text-transform:uppercase; letter-spacing: 0.5px;">
                            📢 Głos Kibiców
                        </h2>
                        
                        <div id="fan-comments">
                            ${renderFanComments(comments.slice(0, 3))}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- STOPKA -->
            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 700; color: #1a237e; font-size: 0.9rem;">${team.team_name} • My Club</div>
                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 5px;">Założenie: ${team.founded_date || '2023'} • ${clubStats.seasons_played || 1} sezony • Ostatnia aktualizacja: ${new Date().toLocaleDateString()}</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="exportClubData('${team.id}')" 
                                style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 10px 20px; 
                                       border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;"
                                onmouseover="this.style.background='#e2e8f0';"
                                onmouseout="this.style.background='#f1f5f9';">
                            📥 Eksportuj dane
                        </button>
                        <button onclick="window.switchTab('m-myclub')" 
                                style="background: #1a237e; color: white; border: none; padding: 10px 20px; 
                                       border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;"
                                onmouseover="this.style.background='#283593'; this.style.transform='translateY(-2px)';"
                                onmouseout="this.style.background='#1a237e'; this.style.transform='translateY(0)';">
                            🔄 Odśwież
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- MODAL USTAWIENIA GRACZA -->
        <div id="modal-player-settings" style="display: none;"></div>
        
        <!-- MODAL PERSONALIZACJI -->
        <div id="modal-club-customization" style="display: none;"></div>
        
        <!-- MODAL HISTORII -->
        <div id="modal-full-history" style="display: none;"></div>
        
        <!-- MODAL TROFEÓW -->
        <div id="modal-all-trophies" style="display: none;"></div>
    `;
    
    // Dodaj event listeners
    initMyClubEventListeners(team.id);
}

/**
 * Pobiera dane klubu
 */
async function fetchClubData(teamId) {
    const { data, error } = await supabaseClient
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Pobiera historię klubu
 */
async function fetchClubHistory(teamId) {
    const { data, error } = await supabaseClient
        .from('club_history')
        .select('*')
        .eq('team_id', teamId)
        .order('event_date', { ascending: false })
        .limit(10);
    
    if (error) throw error;
    return data || [];
}

/**
 * Pobiera trofea klubu
 */
async function fetchClubTrophies(teamId) {
    const { data, error } = await supabaseClient
        .from('club_trophies')
        .select('*')
        .eq('team_id', teamId)
        .order('obtained_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

/**
 * Pobiera statystyki klubu
 */
async function fetchClubStatistics(teamId) {
    const { data, error } = await supabaseClient
        .from('team_stats')
        .select('*')
        .eq('team_id', teamId)
        .single();
    
    if (error) return null;
    return data;
}

/**
 * Pobiera komentarze fanów
 */
async function fetchFanComments(teamId) {
    const { data, error } = await supabaseClient
        .from('fan_comments')
        .select('*')
        .eq('team_id', teamId)
        .order('comment_date', { ascending: false })
        .limit(5);
    
    if (error) throw error;
    return data || [];
}

/**
 * Pobiera personalizację klubu
 */
async function fetchClubCustomization(teamId) {
    const { data, error } = await supabaseClient
        .from('club_customization')
        .select('*')
        .eq('team_id', teamId)
        .single();
    
    if (error) return null;
    return data;
}

/**
 * Pobiera historię transferów
 */
async function fetchTransferHistory(teamId) {
    const { data, error } = await supabaseClient
        .from('transfers')
        .select('*, players:player_id(name, position), from_team:from_team_id(team_name), to_team:to_team_id(team_name)')
        .or(`from_team_id.eq.${teamId},to_team_id.eq.${teamId}`)
        .order('transfer_date', { ascending: false })
        .limit(20);
    
    if (error) throw error;
    return data || [];
}

/**
 * Renderuje oś czasu historii klubu
 */
function renderClubHistoryTimeline(history) {
    if (!history || history.length === 0) {
        return `
            <div style="text-align: center; padding: 30px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📜</div>
                <p>Brak zapisanej historii klubu</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">Twórz historię swoimi decyzjami!</p>
            </div>
        `;
    }
    
    const eventIcons = {
        'championship': '🏆',
        'transfer': '🔄',
        'achievement': '⭐',
        'promotion': '📈',
        'other': '📝'
    };
    
    const eventColors = {
        'championship': '#f59e0b',
        'transfer': '#3b82f6',
        'achievement': '#8b5cf6',
        'promotion': '#10b981',
        'other': '#64748b'
    };
    
    return history.map(event => {
        const eventDate = new Date(event.event_date);
        return `
            <div style="display: flex; gap: 15px; padding: 15px 0; border-bottom: 1px solid #f1f5f9;">
                <div style="flex-shrink: 0; width: 40px; height: 40px; background: ${eventColors[event.event_type] || '#64748b'}; 
                            color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                            font-size: 1.2rem; font-weight: 700;">
                    ${eventIcons[event.event_type] || '📝'}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #1a237e; margin-bottom: 5px;">${event.title}</div>
                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 8px;">${eventDate.toLocaleDateString('pl-PL')}</div>
                    <div style="font-size: 0.9rem; color: #475569; line-height: 1.4;">${event.description || 'Brak opisu'}</div>
                </div>
                <div style="flex-shrink: 0; display: flex; gap: 3px;">
                    ${Array.from({length: event.importance_level || 1}).map(() => '⭐').join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Renderuje wykres historii transferów
 */
function renderTransferHistoryChart(transfers) {
    if (!transfers || transfers.length === 0) {
        return `
            <div style="text-align: center; padding: 20px; color: #64748b;">
                <p>Brak danych o transferach</p>
            </div>
        `;
    }
    
    // Grupuj transfery według typu
    const transfersIn = transfers.filter(t => t.to_team_id === window.userTeamId);
    const transfersOut = transfers.filter(t => t.from_team_id === window.userTeamId);
    
    return `
        <div style="display: flex; justify-content: space-around; margin-bottom: 25px;">
            <div style="text-align: center;">
                <div style="font-size: 2rem; color: #10b981; font-weight: 800;">${transfersIn.length}</div>
                <div style="font-size: 0.8rem; color: #64748b;">Transfery przychodzące</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; color: #ef4444; font-weight: 800;">${transfersOut.length}</div>
                <div style="font-size: 0.8rem; color: #64748b;">Transfery wychodzące</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; color: #f59e0b; font-weight: 800;">${transfersIn.length + transfersOut.length}</div>
                <div style="font-size: 0.8rem; color: #64748b;">Wszystkie transfery</div>
            </div>
        </div>
        
        <div style="height: 100px; display: flex; align-items: flex-end; gap: 5px;">
            ${transfers.slice(0, 8).map(transfer => {
                const transferDate = new Date(transfer.transfer_date);
                const month = transferDate.getMonth();
                const height = 30 + Math.random() * 70; // Symulacja danych
                
                return `
                    <div style="flex: 1; text-align: center;">
                        <div style="height: ${height}px; background: ${transfer.to_team_id === window.userTeamId ? '#10b981' : '#ef4444'}; 
                                border-radius: 4px 4px 0 0; margin-bottom: 5px;"></div>
                        <div style="font-size: 0.7rem; color: #64748b;">${['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie'][month]}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Renderuje tabelę historii transferów
 */
function renderTransferHistoryTable(transfers) {
    if (!transfers || transfers.length === 0) return '';
    
    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 20px;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">Data</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">Gracz</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">Typ</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #64748b;">Kwota</th>
                </tr>
            </thead>
            <tbody>
                ${transfers.map(transfer => {
                    const transferDate = new Date(transfer.transfer_date);
                    const isIncoming = transfer.to_team_id === window.userTeamId;
                    const playerName = transfer.players?.name || 'Unknown Player';
                    const otherTeam = isIncoming ? transfer.from_team?.team_name : transfer.to_team?.team_name;
                    
                    return `
                        <tr style="border-bottom: 1px solid #f1f5f9;" 
                            onmouseover="this.style.background='#f8fafc'" 
                            onmouseout="this.style.background='white'">
                            <td style="padding: 12px 15px; color: #475569;">${transferDate.toLocaleDateString('pl-PL')}</td>
                            <td style="padding: 12px 15px;">
                                <div style="font-weight: 600; color: #1a237e;">${playerName}</div>
                                <div style="font-size: 0.8rem; color: #64748b;">${isIncoming ? 'Z ' : 'Do '}${otherTeam}</div>
                            </td>
                            <td style="padding: 12px 15px;">
                                <span style="padding: 4px 8px; background: ${isIncoming ? '#d1fae5' : '#fee2e2'}; 
                                      color: ${isIncoming ? '#065f46' : '#991b1b'}; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                                    ${isIncoming ? 'Przychodzący' : 'Wychodzący'}
                                </span>
                            </td>
                            <td style="padding: 12px 15px; font-weight: 700; color: #e65100;">
                                ${transfer.transfer_fee ? `$${transfer.transfer_fee.toLocaleString()}` : 'Wolny transfer'}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        
        ${transfers.length > 5 ? `
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="showAllTransfers()" 
                        style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 8px 16px; 
                               border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;"
                        onmouseover="this.style.background='#e2e8f0';"
                        onmouseout="this.style.background='#f1f5f9';">
                    Pokaż wszystkie transfery
                </button>
            </div>
        ` : ''}
    `;
}

/**
 * Renderuje siatkę trofeów
 */
function renderTrophiesGrid(trophies) {
    if (!trophies || trophies.length === 0) {
        return `
            <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🏆</div>
                <p>Brak trofeów</p>
                <p style="font-size: 0.85rem;">Zdobywaj trofea w rozgrywkach!</p>
            </div>
        `;
    }
    
    const trophyIcons = {
        'league': '🏆',
        'cup': '🥇',
        'playoff': '🎖️',
        'individual': '⭐'
    };
    
    return trophies.map(trophy => {
        return `
            <div style="text-align: center; cursor: pointer;" onclick="showTrophyDetail('${trophy.id}')"
                 onmouseover="this.style.transform='scale(1.1)'; this.style.transition='transform 0.2s';"
                 onmouseout="this.style.transform='scale(1)';">
                <div style="width: 60px; height: 60px; background: #fef3c7; border-radius: 50%; margin: 0 auto 5px; 
                            display: flex; align-items: center; justify-content: center; font-size: 1.8rem; 
                            border: 2px solid #f59e0b;">
                    ${trophyIcons[trophy.trophy_type] || '🏆'}
                </div>
                <div style="font-size: 0.75rem; color: #475569; font-weight: 600;">${trophy.season}</div>
            </div>
        `;
    }).join('');
}

/**
 * Renderuje komentarze fanów
 */
function renderFanComments(comments) {
    if (!comments || comments.length === 0) {
        // Symuluj komentarze jeśli brak
        return `
            <div style="text-align: center; padding: 20px; color: #64748b;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📢</div>
                <p>Brak komentarzy fanów</p>
                <p style="font-size: 0.85rem;">Zagraj kilka meczów aby pojawiły się opinie!</p>
            </div>
        `;
    }
    
    const sentimentColors = {
        'positive': '#d1fae5',
        'neutral': '#f1f5f9',
        'negative': '#fee2e2'
    };
    
    return comments.map(comment => {
        const commentDate = new Date(comment.comment_date);
        return `
            <div style="background: ${sentimentColors[comment.sentiment]}; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div style="font-weight: 600; color: #1a237e;">${comment.fan_name}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${commentDate.toLocaleDateString('pl-PL')}</div>
                </div>
                <div style="font-size: 0.85rem; color: #475569; line-height: 1.4;">${comment.comment_text}</div>
                ${comment.likes > 0 ? `
                    <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                        <span style="font-size: 0.8rem; color: #64748b;">❤️ ${comment.likes}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Inicjalizuje event listeners
 */
function initMyClubEventListeners(teamId) {
    console.log("[MY CLUB] Inicjalizacja event listeners");
    
    // Event listener dla przycisku ustawień gracza
    const settingsBtn = document.getElementById('player-settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.openPlayerSettingsModal();
        });
    }
}

/**
 * Pokazuje błąd
 */
function showError(container, message) {
    container.innerHTML = `
        <div class="market-modern-wrapper" style="padding: 30px; text-align: center;">
            <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 12px; padding: 40px; margin-bottom: 20px;">
                <div style="font-size: 3rem; margin-bottom: 20px; color: #ef4444;">❌</div>
                <h3 style="margin: 0 0 10px 0; color: #7c2d12; font-weight: 800;">Błąd ładowania klubu</h3>
                <p style="color: #92400e; margin-bottom: 20px;">${message}</p>
                <button onclick="window.switchTab('m-myclub')" 
                        style="background: #1a237e; color: white; border: none; padding: 12px 30px; 
                               border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.95rem; transition: all 0.2s;"
                        onmouseover="this.style.background='#283593'; this.style.transform='translateY(-2px)';"
                        onmouseout="this.style.background='#1a237e'; this.style.transform='translateY(0)';">
                    🔄 Spróbuj ponownie
                </button>
            </div>
        </div>
    `;
}

/**
 * Globalne funkcje dla akcji użytkownika
 */
window.showFullHistory = function() {
    alert("Pełna historia klubu - w budowie!");
};

window.showAllTransfers = function() {
    alert("Pełna historia transferów - w budowie!");
};

window.showAllTrophies = function() {
    alert("Wszystkie trofea - w budowie!");
};

window.showTrophyDetail = function(trophyId) {
    alert(`Szczegóły trofeum ${trophyId} - w budowie!`);
};

window.changeClubLogo = async function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Tutaj logika uploadu do Supabase Storage
        alert("Zmiana logo - funkcja w budowie!");
    };
    
    input.click();
};

window.changeClubColor = function(colorType) {
    const color = prompt(`Podaj nowy kolor ${colorType === 'primary' ? 'podstawowy' : 'drugorzędny'} (w formacie HEX):`, 
                        colorType === 'primary' ? '#1a237e' : '#e65100');
    
    if (color && /^#[0-9A-F]{6}$/i.test(color)) {
        alert(`Kolor ${colorType} zmieniony na ${color}!`);
        // Tutaj logika aktualizacji w bazie
    } else if (color) {
        alert("Nieprawidłowy format koloru! Użyj formatu HEX (#RRGGBB)");
    }
};

window.exportClubData = function(teamId) {
    const data = {
        team: currentClubData,
        history: clubHistory,
        trophies: clubTrophies,
        stats: clubStats,
        comments: fanComments
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `club-data-${teamId}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    alert("Dane klubu zostały wyeksportowane!");
};

window.openPlayerSettingsModal = function() {
    alert("Modal ustawień gracza - w budowie!");
};
