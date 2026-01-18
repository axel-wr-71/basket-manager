// js/app/roster_actions.js
import { supabaseClient } from '../auth.js';

/**
 * Funkcje pomocnicze
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

export const RosterActions = {
    closeModal: () => {
        const modal = document.getElementById('roster-modal-overlay');
        if (modal) modal.remove();
    },

    showTraining: (player) => {
        console.log("[ACTION] Przejście do treningu dla:", player.last_name);
        if (window.switchTab) {
            window.switchTab('m-training');
            RosterActions.closeModal();
        }
    },

    sellPlayer: (player) => {
        const confirmSell = confirm(`Czy na pewno chcesz wystawić na listę transferową zawodnika ${player.first_name} ${player.last_name}?`);
        if (confirmSell) {
            alert(`Zgłoszenie sprzedaży dla ${player.last_name} zostało wysłane do zarządu.`);
        }
    },

    showProfile: async (player) => {
        // 1. Pobieranie danych z silnika statystyk
        const [statsRes, historyRes] = await Promise.all([
            supabaseClient.from('vw_player_season_stats').select('*').eq('player_id', player.id).single(),
            supabaseClient.from('player_stats').select('*').eq('player_id', player.id).order('created_at', { ascending: false }).limit(10)
        ]);

        const seasonStats = statsRes.data || {};
        const gameHistory = historyRes.data || [];
        const potData = window.getPotentialData(player.potential);
        const currentSeason = 2026;

        let modalHtml = `
            <div id="roster-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,10,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px);">
                <div style="background:#f1f5f9; width:1150px; max-height:92vh; border-radius:32px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 40px 100px rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.1);">
                    
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 50px; display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #3b82f6;">
                        <div style="display: flex; align-items: center; gap: 30px;">
                            <div style="position:relative;">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}" style="width:110px; height:110px; background:white; border-radius:24px; border:3px solid #3b82f6; padding:4px;">
                                <div style="position:absolute; bottom:-10px; right:-10px; background:#3b82f6; color:white; padding:4px 10px; border-radius:8px; font-weight:900; font-size:12px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">${player.position}</div>
                            </div>
                            <div>
                                <h1 style="margin:0; color:white; font-size:2.4rem; font-weight:900; letter-spacing:-1px;">${player.first_name} ${player.last_name}</h1>
                                <p style="margin:5px 0 0 0; color:#94a3b8; font-size:1.1rem; font-weight:500;">
                                    ${player.height} cm (${cmToFtIn(player.height)}) | ${player.age} Years Old | ${player.country}
                                </p>
                            </div>
                        </div>
                        
                        <div style="display:flex; gap:30px; background:rgba(255,255,255,0.05); padding:15px 30px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);">
                            ${RosterActions._renderHeaderStat("PPG", seasonStats.ppg || '0.0')}
                            ${RosterActions._renderHeaderStat("RPG", seasonStats.rpg || '0.0')}
                            ${RosterActions._renderHeaderStat("APG", seasonStats.apg || '0.0')}
                            <div style="width:1px; background:rgba(255,255,255,0.1); margin:0 10px;"></div>
                            ${RosterActions._renderHeaderStat("OVR", player.overall_rating || '??', "#3b82f6")}
                        </div>
                        <button onclick="window.RosterActions.closeModal()" style="background:none; border:none; color:white; font-size:32px; cursor:pointer; opacity:0.6; transition:0.2s;">&times;</button>
                    </div>

                    <div style="padding:40px; overflow-y:auto; flex-grow:1; background:#f1f5f9;">
                        
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:40px;">
                            ${RosterActions._renderProfileCard("Potential Class", potData.icon + ' ' + potData.label, potData.color)}
                            ${RosterActions._renderProfileCard("Annual Salary", '$' + (player.salary || 0).toLocaleString(), "#059669")}
                            ${RosterActions._renderProfileCard("Experience", (player.exp || 0) + " Seasons", "#6366f1")}
                        </div>

                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:25px; margin-bottom:45px;">
                            ${RosterActions._renderSkillBlock('Attack', player, ['2pt', '3pt', 'dunk', 'passing'])}
                            ${RosterActions._renderSkillBlock('Defense', player, ['1on1_def', 'rebound', 'block', 'steal'])}
                            ${RosterActions._renderSkillBlock('General', player, ['dribbling', '1on1_off', 'stamina', 'ft'])}
                        </div>

                        <div style="background:white; padding:35px; border-radius:24px; border:1px solid #e2e8f0; margin-bottom:45px; box-shadow:0 10px 30px rgba(0,0,0,0.03);">
                            <h3 style="margin-top:0; display:flex; align-items:center; gap:10px; color:#1e293b; font-size:1.1rem; text-transform:uppercase; letter-spacing:1px;">
                                <span style="background:#ef4444; width:4px; height:24px; border-radius:2px;"></span>
                                Season Specialization ${currentSeason}
                            </h3>
                            <div style="display:flex; gap:20px; align-items:center;">
                                <select id="train-choice" ${player.training_locked_season === currentSeason ? 'disabled' : ''} style="flex-grow:1; padding:15px; border-radius:12px; border:2px solid #f1f5f9; font-weight:700; background:#f8fafc; font-family:inherit;">
                                    <option value="skill_3pt" ${player.individual_training_skill === 'skill_3pt' ? 'selected' : ''}>Elite Three Point Range</option>
                                    <option value="skill_dunk" ${player.individual_training_skill === 'skill_dunk' ? 'selected' : ''}>Inside Scoring & Dunks</option>
                                    <option value="skill_1on1_def" ${player.individual_training_skill === 'skill_1on1_def' ? 'selected' : ''}>Lockdown Defense</option>
                                    <option value="skill_passing" ${player.individual_training_skill === 'skill_passing' ? 'selected' : ''}>Playmaking & Vision</option>
                                </select>
                                <button onclick="window.RosterActions.saveTraining('${player.id}')" ${player.training_locked_season === currentSeason ? 'disabled' : ''} 
                                    style="background:${player.training_locked_season === currentSeason ? '#94a3b8' : '#1e293b'}; color:white; padding:15px 40px; border-radius:12px; font-weight:800; border:none; cursor:${player.training_locked_season === currentSeason ? 'default' : 'pointer'};">
                                    ${player.training_locked_season === currentSeason ? 'SELECTION LOCKED' : 'CONFIRM TRAINING'}
                                </button>
                            </div>
                        </div>

                        <div style="background:white; border-radius:24px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
                            <div style="padding:20px 30px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-weight:800; color:#64748b; font-size:0.8rem; text-transform:uppercase;">RECENT PERFORMANCES (LAST 10)</div>
                            <table style="width:100%; border-collapse:collapse; text-align:left;">
                                <thead>
                                    <tr style="background:#fff; color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px;">
                                        <th style="padding:15px 30px;">Date</th>
                                        <th>Min</th>
                                        <th>PTS</th>
                                        <th>REB</th>
                                        <th>AST</th>
                                        <th>FG%</th>
                                        <th style="padding:15px 30px;">Game Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${gameHistory.length > 0 ? gameHistory.map(g => `
                                        <tr style="border-top:1px solid #f1f5f9; font-weight:600; color:#1e293b; font-size:0.9rem;">
                                            <td style="padding:15px 30px;">${new Date(g.created_at).toLocaleDateString()}</td>
                                            <td>${g.minutes_played}</td>
                                            <td>${g.points}</td>
                                            <td>${g.rebounds}</td>
                                            <td>${g.assists}</td>
                                            <td>${((g.fg_made / (g.fg_attempted || 1)) * 100).toFixed(0)}%</td>
                                            <td style="padding:15px 30px;">
                                                <span style="background:${parseFloat(g.game_score) > 15 ? '#dcfce7' : '#f1f5f9'}; color:${parseFloat(g.game_score) > 15 ? '#15803d' : '#1e293b'}; padding:4px 12px; border-radius:8px; font-weight:800;">
                                                    ${parseFloat(g.game_score).toFixed(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="7" style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">No game data available for current season.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    saveTraining: async (playerId) => {
        const skill = document.getElementById('train-choice').value;
        const { error } = await supabaseClient.from('players').update({
            individual_training_skill: skill,
            training_locked_season: 2026
        }).eq('id', playerId);

        if (!error) {
            alert("Training specialization locked for Season 2026!");
            RosterActions.closeModal();
            // Opcjonalnie: odśwież widok tabeli głównej
            if (window.loadRoster) window.loadRoster();
        } else {
            console.error("Error saving training:", error);
        }
    },

    _renderHeaderStat: (label, val, color = "#fff") => `
        <div style="text-align:center;">
            <div style="color:${color}; font-size:1.6rem; font-weight:900; line-height:1.2;">${val}</div>
            <div style="color:#94a3b8; font-size:0.65rem; font-weight:800; text-transform:uppercase; letter-spacing:1px;">${label}</div>
        </div>
    `,

    _renderProfileCard: (label, val, color) => `
        <div style="background:white; padding:20px; border-radius:24px; border:1px solid #e2e8f0; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
            <small style="color:#94a3b8; font-weight:800; text-transform:uppercase; font-size:0.65rem; margin-bottom:8px; display:block; letter-spacing:1px;">${label}</small>
            <div style="color:${color}; font-size:1.3rem; font-weight:900;">${val}</div>
        </div>
    `,

    _renderSkillBlock: (title, player, keys) => {
        const labels = {
            '2pt': 'Jump Shot', '3pt': '3PT Range', 'dunk': 'Dunking', 'passing': 'Passing',
            '1on1_def': '1on1 Def', 'rebound': 'Rebound', 'block': 'Blocking', 'steal': 'Stealing',
            'dribbling': 'Handling', '1on1_off': '1on1 Off', 'stamina': 'Stamina', 'ft': 'Free Throw'
        };
        let html = `<div style="background:white; padding:25px; border-radius:24px; border:1px solid #e2e8f0; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
            <h4 style="margin:0 0 20px 0; color:#94a3b8; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">${title}</h4>`;
        keys.forEach(k => {
            const v = player['skill_' + k] || 0;
            const sColor = getSkillColor(v);
            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-weight:700; color:#475569; font-size:0.85rem;">${labels[k]}</span>
                <span style="background:${sColor}20; padding:4px 12px; border-radius:8px; font-weight:900; color:${sColor}; font-size:0.9rem;">${v}</span>
            </div>`;
        });
        return html + `</div>`;
    }
};

window.RosterActions = RosterActions;
