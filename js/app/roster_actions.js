// js/app/roster_actions.js
import { supabaseClient } from '../auth.js';

/**
 * Funkcje pomocnicze dla UI
 */
window.getPotentialData = (val) => {
    const p = parseInt(val) || 0;
    if (p >= 96) return { label: 'G.O.A.T.', color: '#ff4500', icon: '👑' };
    if (p >= 92) return { label: 'All-Time Great', color: '#b8860b', icon: '🏆' };
    if (p >= 88) return { label: 'Elite Franchise', color: '#d4af37', icon: '⭐' };
    if (p >= 84) return { label: 'Star Performer', color: '#8b5cf6', icon: '🌟' };
    if (p >= 79) return { label: 'High Prospect', color: '#10b981', icon: '🚀' };
    if (p >= 74) return { label: 'Solid Starter', color: '#6366f1', icon: '🏀' };
    if (p >= 68) return { label: 'Reliable Bench', color: '#64748b', icon: '📋' };
    if (p >= 60) return { label: 'Role Player', color: '#94a3b8', icon: '👤' };
    if (p >= 50) return { label: 'Deep Bench', color: '#cbd5e1', icon: '🪑' };
    return { label: 'Project Player', color: '#94a3b8', icon: '🛠️' };
};

const getSkillColor = (val) => {
    const v = parseInt(val) || 0;
    if (v >= 19) return '#d4af37'; 
    if (v >= 17) return '#8b5cf6'; 
    if (v >= 15) return '#10b981'; 
    if (v >= 13) return '#06b6d4'; 
    if (v >= 11) return '#3b82f6'; 
    return '#64748b';               
};

function cmToFtIn(cm) {
    if (!cm) return '--';
    const inchesTotal = cm * 0.393701;
    const feet = Math.floor(inchesTotal / 12);
    const inches = Math.round(inchesTotal % 12);
    return `${feet}'${inches}"`;
}

// Mapa czytelnych nazw dla wszystkich 12 umiejętności
const SKILL_LABELS = {
    '2pt': 'Jump Shot', '3pt': '3PT Range', 'dunk': 'Dunking', 'passing': 'Passing',
    '1on1_def': '1on1 Def', 'rebound': 'Rebound', 'block': 'Blocking', 'steal': 'Stealing',
    'dribbling': 'Handling', '1on1_off': '1on1 Off', 'stamina': 'Stamina', 'ft': 'Free Throw'
};

export const RosterActions = {
    closeModal: () => {
        const modal = document.getElementById('roster-modal-overlay');
        if (modal) modal.remove();
    },

    getCurrentSeason: () => {
        return window.gameState?.currentSeason || 1;
    },

    /**
     * Customowy Popup Potwierdzający w stylu gry
     */
    showConfirm: (message, onConfirm) => {
        const confirmHtml = `
            <div id="custom-confirm-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,10,0.6); display:flex; align-items:center; justify-content:center; z-index:10000; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);">
                <div style="background:#ffffff; width:420px; padding:40px; border-radius:32px; text-align:center; box-shadow:0 30px 70px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2);">
                    <div style="font-size:3.5rem; margin-bottom:20px;">🎯</div>
                    <h3 style="margin:0 0 15px 0; color:#0f172a; font-weight:900; font-size:1.5rem; letter-spacing:-0.5px;">Confirm Focus</h3>
                    <p style="color:#64748b; line-height:1.6; font-size:1rem; margin-bottom:35px;">${message}</p>
                    <div style="display:flex; gap:15px; justify-content:center;">
                        <button id="confirm-no" style="background:#f1f5f9; color:#64748b; padding:14px 30px; border-radius:16px; border:none; font-weight:800; cursor:pointer; flex:1; transition: 0.2s;">CANCEL</button>
                        <button id="confirm-yes" style="background:#1e293b; color:white; padding:14px 30px; border-radius:16px; border:none; font-weight:800; cursor:pointer; flex:1; transition: 0.2s;">YES, PROCEED</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', confirmHtml);

        document.getElementById('confirm-no').onclick = () => document.getElementById('custom-confirm-overlay').remove();
        document.getElementById('confirm-yes').onclick = () => {
            document.getElementById('custom-confirm-overlay').remove();
            onConfirm();
        };
    },

    showProfile: async (player) => {
        const currentSeason = RosterActions.getCurrentSeason();

        const [statsRes, historyRes, trainHistoryRes] = await Promise.all([
            supabaseClient.from('vw_player_season_stats').select('*').eq('player_id', player.id).single(),
            supabaseClient.from('player_stats').select('*').eq('player_id', player.id).order('created_at', { ascending: false }).limit(10),
            supabaseClient.from('player_training_history').select('*').eq('player_id', player.id).order('season_number', { ascending: false })
        ]);

        const seasonStats = statsRes.data || {};
        const gameHistory = historyRes.data || [];
        const trainHistory = trainHistoryRes.data || [];
        const potData = window.getPotentialData(player.potential);
        const isLocked = player.training_locked_season >= currentSeason;

        let modalHtml = `
            <div id="roster-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,10,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px);">
                <div style="background:#f1f5f9; width:1250px; max-height:95vh; border-radius:32px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 40px 100px rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.1);">
                    
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px 50px; display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #3b82f6;">
                        <div style="display: flex; align-items: center; gap: 30px;">
                            <div style="position:relative;">
                                <img src="https://api.dicebear.com/7.x/open-peeps/svg?seed=${player.last_name}" style="width:100px; height:100px; background:white; border-radius:24px; border:3px solid #3b82f6; padding:4px;">
                                <div style="position:absolute; bottom:-5px; right:-5px; background:#3b82f6; color:white; padding:4px 10px; border-radius:8px; font-weight:900; font-size:12px;">${player.position}</div>
                            </div>
                            <div>
                                <h1 style="margin:0; color:white; font-size:2.2rem; font-weight:900; letter-spacing:-1px;">
                                    ${player.first_name} ${player.last_name}
                                    ${player.is_rookie ? '<span style="background:#ef4444; font-size:11px; padding:3px 8px; border-radius:6px; vertical-align:middle; margin-left:10px;">ROOKIE</span>' : ''}
                                </h1>
                                <p style="margin:5px 0 0 0; color:#94a3b8; font-size:1rem;">
                                    ${player.height} cm (${cmToFtIn(player.height)}) | ${player.age} Years Old | ${player.country}
                                </p>
                            </div>
                        </div>
                        
                        <div style="display:flex; gap:25px; background:rgba(255,255,255,0.05); padding:12px 25px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);">
                            ${RosterActions._renderHeaderStat("PPG", seasonStats.ppg || '0.0')}
                            ${RosterActions._renderHeaderStat("RPG", seasonStats.rpg || '0.0')}
                            ${RosterActions._renderHeaderStat("APG", seasonStats.apg || '0.0')}
                            <div style="width:1px; background:rgba(255,255,255,0.1); margin:0 5px;"></div>
                            ${RosterActions._renderHeaderStat("OVR", player.overall_rating || '??', "#3b82f6")}
                        </div>
                        <button onclick="window.RosterActions.closeModal()" style="background:none; border:none; color:white; font-size:32px; cursor:pointer; opacity:0.6;">&times;</button>
                    </div>

                    <div id="modal-content-scroll" style="padding:30px 40px; overflow-y:auto; flex-grow:1; background:#f1f5f9; -webkit-overflow-scrolling: touch;">
                        
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:30px;">
                            ${RosterActions._renderProfileCard("Potential", potData.icon + ' ' + potData.label, potData.color)}
                            ${RosterActions._renderProfileCard("Salary", new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(player.salary || 0), "#059669")}
                            ${RosterActions._renderProfileCard("Experience", (player.experience || 0) + " Seasons", "#6366f1")}
                        </div>

                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:30px;">
                            ${RosterActions._renderSkillBlock('Attack', player, ['2pt', '3pt', 'dunk', 'passing'])}
                            ${RosterActions._renderSkillBlock('Defense', player, ['1on1_def', 'rebound', 'block', 'steal'])}
                            ${RosterActions._renderSkillBlock('General', player, ['dribbling', '1on1_off', 'stamina', 'ft'])}
                        </div>

                        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:30px;">
                            <div id="training-section" style="background:white; padding:25px; border-radius:24px; border:2px solid #3b82f6; box-shadow:0 10px 30px rgba(59,130,246,0.1);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                    <h3 style="margin:0; color:#1e293b; font-size:0.9rem; text-transform:uppercase; letter-spacing:1px;">🎯 SEASON ${currentSeason} INDIVIDUAL FOCUS</h3>
                                    ${isLocked ? `<span style="background:#fee2e2; color:#ef4444; padding:4px 10px; border-radius:8px; font-weight:900; font-size:0.7rem;">LOCKED</span>` : ''}
                                </div>
                                <div style="display:flex; gap:15px;">
                                    <select id="train-choice" ${isLocked ? 'disabled' : ''} style="flex-grow:1; padding:12px; border-radius:12px; border:2px solid #f1f5f9; font-weight:700; font-family:inherit; font-size:0.9rem;">
                                        ${Object.keys(SKILL_LABELS).map(key => `
                                            <option value="skill_${key}" ${player.individual_training_skill === 'skill_'+key ? 'selected' : ''}>
                                                ${SKILL_LABELS[key]}
                                            </option>
                                        `).join('')}
                                    </select>
                                    <button onclick="window.RosterActions.saveTraining('${player.id}')" ${isLocked ? 'disabled' : ''} 
                                        style="background:${isLocked ? '#94a3b8' : '#1e293b'}; color:white; padding:12px 30px; border-radius:12px; font-weight:800; border:none; cursor:${isLocked ? 'default' : 'pointer'};">
                                        ${isLocked ? 'COMPLETED' : 'SET FOCUS'}
                                    </button>
                                </div>
                            </div>
                            
                            <div style="background:#fff; border-radius:24px; padding:20px; border:1px solid #e2e8f0;">
                                <h4 style="margin:0 0 10px 0; font-size:0.7rem; color:#94a3b8; text-transform:uppercase;">Development History</h4>
                                <div style="font-size:0.8rem;">
                                    ${trainHistory.length > 0 ? trainHistory.map(h => `
                                        <div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #f8fafc; padding-bottom:3px;">
                                            <span style="font-weight:700;">Season ${h.season_number}</span>
                                            <span style="color:#3b82f6; font-weight:700;">${SKILL_LABELS[h.skill_focused.replace('skill_', '')]}</span>
                                        </div>
                                    `).join('') : '<span style="color:#cbd5e1;">New Recruit - No logs</span>'}
                                </div>
                            </div>
                        </div>

                        <div style="background:white; border-radius:24px; border:1px solid #e2e8f0; overflow:hidden;">
                            <table style="width:100%; border-collapse:collapse; font-size: 0.7rem;">
                                <thead>
                                    <tr style="background:#f8fafc; color:#94a3b8; text-transform:uppercase; border-bottom:1px solid #e2e8f0; text-align:center;">
                                        <th style="padding:15px; text-align:left;">Date</th>
                                        <th>Min</th>
                                        <th>FGM/A</th>
                                        <th>3PM/A</th>
                                        <th>FTM/A</th>
                                        <th>OFF</th>
                                        <th>DEF</th>
                                        <th>REB</th>
                                        <th>AST</th>
                                        <th>STL</th>
                                        <th>BLK</th>
                                        <th>PF</th>
                                        <th>PTS</th>
                                        <th style="color:#3b82f6; padding-right:15px;">RATE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${gameHistory.length > 0 ? gameHistory.map(g => `
                                        <tr style="border-top:1px solid #f1f5f9; font-weight:600; color:#1e293b; text-align:center;">
                                            <td style="padding:12px; text-align:left;">${new Date(g.created_at).toLocaleDateString()}</td>
                                            <td>${g.minutes_played}</td>
                                            <td>${g.fg_made}/${g.fg_attempted}</td>
                                            <td>${g.tp_made}/${g.tp_attempted}</td>
                                            <td>${g.ft_made}/${g.ft_attempted}</td>
                                            <td>${g.off_rebounds || 0}</td>
                                            <td>${g.def_rebounds || 0}</td>
                                            <td style="color:#6366f1;">${g.rebounds}</td>
                                            <td>${g.assists}</td>
                                            <td>${g.steals || 0}</td>
                                            <td>${g.blocks || 0}</td>
                                            <td>${g.fouls || 0}</td>
                                            <td style="font-weight:800; color:#e65100;">${g.points}</td>
                                            <td style="padding-right:15px;">
                                                <span style="background:#eff6ff; color:#3b82f6; padding:4px 8px; border-radius:6px; font-weight:900;">
                                                    ${parseFloat(g.game_score || 0).toFixed(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="14" style="padding:40px; text-align:center; color:#94a3b8;">No game data for Season ' + currentSeason + '</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const scrollDiv = document.getElementById('modal-content-scroll');
        if(scrollDiv) scrollDiv.scrollTop = 0;
    },

    saveTraining: async function(playerId) {
        const currentSeason = this.getCurrentSeason();
        const skill = document.getElementById('train-choice').value;
        const skillLabel = SKILL_LABELS[skill.replace('skill_', '')];

        const message = `Set <b>${skillLabel}</b> as the primary focus for <b>Season ${currentSeason}</b>? This action cannot be undone.`;

        // Wywołanie autorskiego UI zamiast systemowego confirm
        this.showConfirm(message, async () => {
            const { error: upError } = await supabaseClient.from('players').update({
                individual_training_skill: skill,
                training_locked_season: currentSeason
            }).eq('id', playerId);

            const { error: histError } = await supabaseClient.from('player_training_history').insert({
                player_id: playerId,
                season_number: currentSeason,
                skill_focused: skill
            });

            if (!upError && !histError) {
                this.closeModal();
                if (window.loadRoster) window.loadRoster();
            } else {
                alert("Database Error: Could not save focus.");
            }
        });
    },

    _renderHeaderStat: (label, val, color = "#fff") => `
        <div style="text-align:center;">
            <div style="color:${color}; font-size:1.5rem; font-weight:900;">${val}</div>
            <div style="color:#94a3b8; font-size:0.6rem; font-weight:800; text-transform:uppercase;">${label}</div>
        </div>
    `,

    _renderProfileCard: (label, val, color) => `
        <div style="background:white; padding:15px; border-radius:20px; border:1px solid #e2e8f0; text-align:center;">
            <small style="color:#94a3b8; font-weight:800; text-transform:uppercase; font-size:0.6rem; display:block; margin-bottom:3px;">${label}</small>
            <div style="color:${color}; font-size:1.1rem; font-weight:900;">${val}</div>
        </div>
    `,

    _renderSkillBlock: (title, player, keys) => {
        let html = `<div style="background:white; padding:20px; border-radius:24px; border:1px solid #e2e8f0;">
            <h4 style="margin:0 0 12px 0; color:#94a3b8; font-size:0.7rem; text-transform:uppercase; border-bottom:1px solid #f1f5f9; padding-bottom:5px;">${title}</h4>`;
        keys.forEach(k => {
            const v = player['skill_' + k] || 0;
            const sColor = getSkillColor(v);
            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-weight:700; color:#475569; font-size:0.8rem;">${SKILL_LABELS[k]}</span>
                <span style="background:${sColor}20; padding:3px 8px; border-radius:6px; font-weight:900; color:${sColor}; font-size:0.8rem;">${v}</span>
            </div>`;
        });
        return html + `</div>`;
    }
};

window.RosterActions = RosterActions;
