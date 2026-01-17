const SUPABASE_URL = 'https://zzsscobtzwbwubchqjyx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wdrjVOU6jVHGVpsxcUygmg_kqPqz1aC';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export const supabaseClient = _supabase;
window.supabase = _supabase;

window.POTENTIAL_MAP = [];

async function fetchPotentialDefinitions() {
    try {
        const { data, error } = await _supabase
            .from('potential_definitions')
            .select('*')
            .order('min_value', { ascending: false });

        if (error) throw error;
        window.POTENTIAL_MAP = data || [];
        console.log("Potencjały załadowane:", window.POTENTIAL_MAP.length);
    } catch (err) {
        console.error("Błąd potencjałów:", err);
        window.POTENTIAL_MAP = [{ min_value: 0, label: 'Player', color_hex: '#94a3b8', emoji: '👤' }];
    }
}

window.getPotentialData = (val) => {
    const p = parseInt(val) || 0;
    const map = window.POTENTIAL_MAP || [];
    const def = map.find(d => p >= d.min_value);
    if (def) {
        return { label: def.label, color: def.color_hex, icon: def.emoji || '🏀' };
    }
    return { label: 'Prospect', color: '#94a3b8', icon: '👤' };
};

async function signIn() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if (!e || !p) return alert("Wypełnij pola!");

    const { error } = await _supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) alert("Błąd: " + error.message);
    else checkUser();
}

async function signUp() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if (!e || !p) return alert("Wypełnij pola!");

    const { error } = await _supabase.auth.signUp({ email: e, password: p });
    if (error) alert(error.message);
    else alert("Konto stworzone! Sprawdź maila.");
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('game-app');
    const userDisplay = document.getElementById('user-info-display');

    if (user) {
        await fetchPotentialDefinitions();
        if (landing) landing.style.display = 'none';
        if (app) app.style.display = 'block';

        const isAdmin = (user.email === 'strubbe23@gmail.com');
        const role = isAdmin ? 'admin' : 'manager';

        try {
            let { data: teamData } = await _supabase
                .from('teams')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (!teamData && !isAdmin) {
                const { data: newTeam } = await _supabase
                    .from('teams')
                    .insert([{ 
                        owner_id: user.id, 
                        team_name: `Team ${user.email.split('@')[0]}`,
                        balance: 500000
                    }])
                    .select().single();
                teamData = newTeam;
            }

            if (userDisplay) {
                const statusName = isAdmin ? "Admin" : (teamData ? teamData.team_name : "Manager");
                userDisplay.innerText = `${user.email} (${statusName})`;
            }

            if (typeof window.setupUI === 'function') {
                window.setupUI(role);
            }
        } catch (e) {
            console.error("Błąd init:", e);
        }
    } else {
        if (landing) landing.style.display = 'block';
        if (app) app.style.display = 'none';
    }
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

window.signIn = signIn;
window.signUp = signUp;
window.logout = logout;
window.checkUser = checkUser;

checkUser();
