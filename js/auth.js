// Plik: js/auth.js

const SUPABASE_URL = 'https://zzsscobtzwbwubchqjyx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wdrjVOU6jVHGVpsxcUygmg_kqPqz1aC';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Logowanie użytkownika
 */
async function signIn() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    
    if(!e || !p) {
        alert(typeof currentLang !== 'undefined' && currentLang === 'pl' ? "Wypełnij wszystkie pola!" : "Fill all fields!");
        return;
    }

    const { error } = await _supabase.auth.signInWithPassword({email:e, password:p});
    if(error) {
        alert(typeof currentLang !== 'undefined' && currentLang === 'pl' ? "Błąd logowania: " + error.message : "Login error: " + error.message);
    } else {
        checkUser();
    }
}

/**
 * Rejestracja nowego konta
 */
async function signUp() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    
    if(!e || !p) {
        alert(typeof currentLang !== 'undefined' && currentLang === 'pl' ? "Wypełnij wszystkie pola!" : "Fill all fields!");
        return;
    }

    const { error } = await _supabase.auth.signUp({email:e, password:p});
    if(error) {
        alert(typeof currentLang !== 'undefined' && currentLang === 'pl' ? "Błąd rejestracji: " + error.message : "Signup error: " + error.message);
    } else {
        alert(typeof currentLang !== 'undefined' && currentLang === 'pl' ? "Konto stworzone! Sprawdź e-mail." : "Account created! Check your email.");
    }
}

/**
 * Główna funkcja sprawdzająca stan sesji i odświeżająca interfejs
 */
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('game-app');
    const admin = document.getElementById('admin-panel');
    const userDisplay = document.getElementById('user-info-display');

    if(user) {
        // 1. Przełączanie widoków
        if(landing) landing.style.display = 'none';
        if(app) app.style.display = 'block';

        // 2. Obsługa Panelu Admina
        if(user.email === 'strubbe23@gmail.com') {
            if(admin) admin.style.display = 'block';
        } else {
            if(admin) admin.style.display = 'none';
        }

        // 3. Obsługa danych drużyny (Wyświetlanie w nagłówku)
        try {
            // Próbujemy pobrać drużynę przypisaną do tego managera
            let { data: teamData, error: fetchError } = await _supabase
                .from('teams')
                .select('*')
                .eq('manager_id', user.id)
                .maybeSingle();

            // Jeśli użytkownik nie ma jeszcze drużyny - tworzymy domyślną
            if (!teamData && !fetchError) {
                const defaultName = `Team ${user.email.split('@')[0]}`;
                const { data: newTeam, error: insertError } = await _supabase
                    .from('teams')
                    .insert([{ 
                        manager_id: user.id, 
                        team_name: defaultName,
                        balance: 500000,
                        country: "Poland"
                    }])
                    .select()
                    .single();
                
                if(!insertError) teamData = newTeam;
            }

    
            // Aktualizacja tekstu w headerze: "email / Nazwa Drużyny lub Admin"
if(userDisplay) {
    let statusText = "";
    
    if(user.email === 'strubbe23@gmail.com') {
        statusText = "Admin";
    } else {
        statusText = teamData ? teamData.team_name : "New Manager";
    }
    
    userDisplay.innerText = `${user.email} / ${statusText}`;
}

    } else {
        // Użytkownik niezalogowany
        if(landing) landing.style.display = 'block';
        if(app) app.style.display = 'none';
    }
}

/**
 * Wylogowanie
 */
async function logout() { 
    await _supabase.auth.signOut(); 
    location.reload(); 
}

// Inicjalizacja przy starcie strony
checkUser();
