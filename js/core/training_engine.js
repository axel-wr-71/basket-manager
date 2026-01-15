// js/core/training_engine.js

function getSkillsByFocus(focus) {
    const map = {
        'SHARP_SHOOTER': ['skill_2pt', 'skill_3pt', 'skill_ft'],
        'PAINT_PROTECTOR': ['skill_blk', 'skill_1v1d'],
        'PERIMETER_DEFENDER': ['skill_stl', 'skill_1v1d'],
        'PLAYMAKING_FOCUS': ['skill_pas', 'skill_dri'],
        'BIG_MAN_INSIDE': ['skill_dnk', 'skill_reb'],
        'ISOLATION_SCORER': ['skill_1v1o', 'skill_sta']
    };
    return map[focus] || [];
}
