

// /js/app/player_list_component.js

export function getSkillColor(val) {
    const v = parseInt(val) || 0;
    if (v >= 19) return '#d4af37'; 
    if (v >= 17) return '#8b5cf6'; 
    if (v >= 15) return '#10b981'; 
    if (v >= 13) return '#06b6d4'; 
    if (v >= 11) return '#3b82f6'; 
    if (v >= 9)  return '#64748b'; 
    if (v >= 7)  return '#475569'; 
    if (v >= 5)  return '#f59e0b'; 
    if (v >= 3)  return '#f97316'; 
    return '#ef4444';             
}

function renderSkillMini(name, val) {
    const v = (val !== undefined && val !== null) ? val : '--';
    const color = getSkillColor(v);
    return `
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; border-bottom: 1px solid rgba(0,0,0,0.03);">
            <span style="color: #64748b; font-weight: 500;">${name}</span>
            <span style="font-weight: 800; color: ${color};">${v}</span>
        </div>
    `;
}

export function renderPlayerRow(player, potLabel) {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.last_name}&backgroundColor=f0f2f5`;
    const currentOvr = player.overall_rating || 0;
    const maxPot = player.potential || 1;
    const progressWidth = Math.min(Math.round((currentOvr / maxPot) * 100), 100);

    return `
        <tr style="border-bottom: 1px solid #f8f9fa; transition: 0.2s;" onmouseover="this.style.background='#fcfdfe'" onmouseout="this.style.background='transparent'">
            <td style="padding: 20px 25px;">
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 800; color: #1a237e; font-size: 1.1em;">${player.first_name} ${player.last_name}</span>
                        ${player.is_rookie ? '<span style="background:#ef4444; color:white; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:900;">ROOKIE</span>' : ''}
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 20px;">
                        <img src="${avatarUrl}" style="width: 60px; height: 60px; border-radius: 12px; border: 1px solid #e0e0e0; background: #fff;">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8f9fa; padding: 12px; border-radius: 12px; border: 1px solid #f0f0f0; flex-grow: 1; max-width: 400px;">
                            <div>
                                <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Attack</div>
                                ${renderSkillMini('2PT', player.skill_2pt)}
                                ${renderSkillMini('3PT', player.skill_3pt)}
                                ${renderSkillMini('Dunk', player.skill_dunk)}
                                ${renderSkillMini('Pass', player.skill_passing)}
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Defense</div>
                                ${renderSkillMini('1v1 Def', player.skill_1on1_def)}
                                ${renderSkillMini('Reb', player.skill_rebound)}
                                ${renderSkillMini('Block', player.skill_block)}
                                ${renderSkillMini('Steal', player.skill_steal)}
                            </div>
                            <div>
                                <div style="font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">General</div>
                                ${renderSkillMini('1v1 Off', player.skill_1on1_off)}
                                ${renderSkillMini('Dribble', player.skill_dribbling)}
                                ${renderSkillMini('Stamina', player.skill_stamina)}
                                ${renderSkillMini('FT', player.skill_ft)}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td style="padding: 15px;"><div style="font-size: 0.85em; font-weight: 600; color: #444; background: #f0f2f5; display: inline-block; padding: 4px 12px; border-radius: 20px;">${player.position}</div></td>
            <td style="padding: 15px; color: #666; font-weight: 600;">${player.age}</td>
            <td style="padding: 15px; color: #666; font-weight: 600;">${player.height || '--'} cm</td>
            <td style="padding: 15px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #2e7d32; font-size: 0.9em;">$${(player.salary || 0).toLocaleString()}</td>
            <td style="padding: 15px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-weight: 800; color: ${potLabel.color}; font-size: 0.8em; white-space: nowrap;">${potLabel.label}</span>
                    <div style="width: 80px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                        <div style="width: ${progressWidth}%; height: 100%; background: ${potLabel.color};"></div>
                    </div>
                </div>
            </td>
            <td style="padding: 15px;"><div style="width: 45px; height: 45px; border-radius: 12px; background: #e8f5e9; color: #2e7d32; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1em; border: 2px solid #c8e6c9;">${player.overall_rating || 0}</div></td>
            <td style="padding: 15px; text-align: center;">
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                    <button onclick="window.sellPlayer('${player.id}')" style="width: 100px; background: #fee2e2; border: 1px solid #ef4444; padding: 6px 0; border-radius: 8px; color: #ef4444; font-weight: 700; cursor: pointer; font-size: 0.7em; transition: 0.2s;" onmouseover="this.style.background='#ef4444'; this.style.color='white'">SELL</button>
                    <button onclick="window.showPlayerProfile('${player.id}')" style="width: 100px; background: white; border: 1px solid #1a237e; padding: 6px 0; border-radius: 8px; color: #1a237e; font-weight: 700; cursor: pointer; font-size: 0.7em; transition: 0.2s;" onmouseover="this.style.background='#1a237e'; this.style.color='white'">PROFILE</button>
                </div>
            </td>
        </tr>
    `;
}
 
