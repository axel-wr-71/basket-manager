// js/auth.js
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
    } catch (err) {
        console.error("Błąd potencjałów:", err);
        window.POTENTIAL_MAP = [{ min_value: 0, label: 'Player', color_hex: '#94a3b8', emoji: '👤' }];
    }
}

window.getPotentialData = (val) => {
    const p = parseInt(val) || 0;
    const map = window.POTENTIAL_MAP || [];
    const def = map.find(d => p >= d.min_value);
    return def ? { label: def.label, color: def.color_hex, icon: def.emoji || '🏀' } : { label: 'Prospect', color: '#94a3b8', icon: '👤' };
};

async function signIn() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if (!e || !p) return alert("Wypełnij pola!");
    const { error } = await _supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) alert("Błąd: " + error.message);
    else window.checkUser();
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
    
    if (user) {
        // POBIERANIE ROLI Z BAZY
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            console.error("Błąd pobierania roli, ustawiam domyślną: manager");
            window.setupUI('manager');
        } else {
            console.log("Zalogowano jako:", profile.role);
            window.setupUI(profile.role); // Tutaj przekaże 'admin', 'moderator' lub 'manager'
        }
        
        await fetchPotentialDefinitions();
    } else {
        document.getElementById('landing-page').style.display = 'block';
        document.getElementById('game-app').style.display = 'none';
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

document.addEventListener('DOMContentLoaded', () => {
    window.checkUser();
});
