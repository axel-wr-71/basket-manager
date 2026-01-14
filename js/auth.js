const SUPABASE_URL = 'https://zzsscobtzwbwubchqjyx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wdrjVOU6jVHGVpsxcUygmg_kqPqz1aC';

// Tworzymy klienta
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// KLUCZOWE POPRAWKI:
// 1. Eksportujemy dla modułów (np. admin.js, site_styles.js)
export const supabaseClient = _supabase; 

// 2. Przypisujemy do window dla starych skryptów (np. manager.js, world_gen.js)
window.supabase = _supabase;

async function signIn() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    if(!e || !p) return alert("Wypełnij pola!");

    const { error } = await _supabase.auth.signInWithPassword({email:e, password:p});
    if(error) alert("Błąd: " + error.message);
    else checkUser();
}

async function signUp() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    const { error } = await _supabase.auth.signUp({email:e, password:p});
    if(error) alert(error.message);
    else alert("Konto stworzone! Sprawdź maila.");
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('game-app');
    const userDisplay = document.getElementById('user-info-display');

    if(user) {
        if(landing) landing.style.display = 'none';
        if(app) app.style.display = 'block';

        const isAdmin = (user.email === 'strubbe23@gmail.com');
        const role = isAdmin ? 'admin' : 'manager';

        try {
            let { data: teamData, error: fErr } = await _supabase
                .from('teams')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (!teamData && !fErr && !isAdmin) {
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

            if(userDisplay) {
                let statusName = isAdmin ? "Admin" : (teamData ? teamData.team_name : "Manager");
                userDisplay.innerText = `${user.email} (${statusName})`;
            }

            // Wywołanie funkcji z index.html
            if (typeof window.setupUI === 'function') {
                window.setupUI(role);
            } else if (typeof setupUI === 'function') {
                setupUI(role);
            }

        } catch (e) { 
            console.error("Błąd inicjalizacji użytkownika:", e); 
        }
    } else {
        if(landing) landing.style.display = 'block';
        if(app) app.style.display = 'none';
    }
}

async function logout() { 
    await _supabase.auth.signOut(); 
    location.reload(); 
}

// Udostępniamy funkcje do HTML (onclick)
window.signIn = signIn;
window.signUp = signUp;
window.logout = logout;
window.checkUser = checkUser;

// Sprawdź stan sesji przy załadowaniu strony
checkUser();

// js/auth.js

// ... Twoje istniejące funkcje (signIn, signUp, logout) ...

// Dodaj to na samym dole pliku:
window.signIn = signIn;
window.signUp = signUp;
window.logout = logout;
