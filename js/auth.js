// Plik: js/auth.js

const SUPABASE_URL = 'https://zzsscobtzwbwubchqjyx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wdrjVOU6jVHGVpsxcUygmg_kqPqz1aC';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function signIn() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    
    if(!e || !p) {
        alert(currentLang === 'pl' ? "Wypełnij wszystkie pola!" : "Fill all fields!");
        return;
    }

    const { error } = await _supabase.auth.signInWithPassword({email:e, password:p});
    if(error) {
        alert(currentLang === 'pl' ? "Błąd logowania: " + error.message : "Login error: " + error.message);
    } else {
        checkUser();
    }
}

async function signUp() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    
    if(!e || !p) {
        alert(currentLang === 'pl' ? "Wypełnij wszystkie pola!" : "Fill all fields!");
        return;
    }

    const { error } = await _supabase.auth.signUp({email:e, password:p});
    if(error) {
        alert(currentLang === 'pl' ? "Błąd rejestracji: " + error.message : "Signup error: " + error.message);
    } else {
        alert(currentLang === 'pl' ? "Konto stworzone! Sprawdź e-mail." : "Account created! Check your email.");
    }
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('game-app');
    const admin = document.getElementById('admin-panel');
    const userDisplay = document.getElementById('user-display'); // to musi istnieć w HTML

    if(user) {
        // 1. Przełączanie widoków
        landing.style.display = 'none';
        app.style.display = 'block';
        
        // 2. Pobieranie nazwy drużyny z tabeli 'teams'
        // Zakładamy, że w tabeli 'teams' masz kolumnę 'manager_id' (UUID) oraz 'team_name'
        const { data: teamData, error: teamError } = await _supabase
            .from('teams')
            .select('team_name')
            .eq('manager_id', user.id)
            .maybeSingle();

        // 3. Wyświetlanie: Email / Drużyna
        if (teamData && teamData.team_name) {
            userDisplay.innerText = `${user.email} / ${teamData.team_name}`;
        } else {
            userDisplay.innerText = user.email;
        }
        
        // 4. Panel Administratora
        if(user.email === 'strubbe23@gmail.com') {
            admin.style.display = 'block';
        } else {
            admin.style.display = 'none';
        }
    } else {
        landing.style.display = 'block';
        app.style.display = 'none';
    }
}

async function logout() { 
    await _supabase.auth.signOut(); 
    // Po wylogowaniu czyścimy wszystko i przeładowujemy stronę
    location.reload(); 
}

// Uruchomienie sprawdzenia przy starcie
checkUser();
