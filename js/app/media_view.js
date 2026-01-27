import { supabaseClient } from '../auth.js';

export async function renderMediaView(team, players, isAdmin = false) {
    const container = document.getElementById('m-media');
    if (!container) return;

    if (isAdmin) {
        await renderAdminMediaView(team, players);
    } else {
        await renderPlayerMediaView(team, players);
    }
}

/**
 * WIDOK DLA ADMINÓW (pełne funkcje)
 */
async function renderAdminMediaView(team, players) {
    const container = document.getElementById('m-media');
    
    container.innerHTML = `
        <div class="admin-media-view">
            <!-- Nagłówek admina -->
            <div class="admin-header">
                <div class="admin-badge">
                    <i class="fas fa-crown"></i> Panel Administracyjny - Media
                </div>
                <h1><i class="fas fa-newspaper"></i> Zarządzanie Mediami EBL</h1>
                <p class="subtitle">Kompletne zarządzanie personelem medialnym i generowanie newsów dla całej ligi</p>
            </div>

            <!-- Sekcja Personelu Medialnego -->
            <div class="media-section">
                <h2><i class="fas fa-user-tie"></i> Personel Medialny Wszystkich Klubów</h2>
                <div class="filter-bar">
                    <input type="text" id="staff-search" placeholder="🔍 Szukaj personelu..." class="search-input">
                    <select id="team-filter" class="filter-select">
                        <option value="all">Wszystkie kluby</option>
                    </select>
                    <select id="skill-filter" class="filter-select">
                        <option value="all">Wszystkie poziomy</option>
                        <option value="9-10">Elita (9-10)</option>
                        <option value="7-8">Zaawansowani (7-8)</option>
                        <option value="5-6">Średniozaawansowani (5-6)</option>
                        <option value="1-4">Początkujący (1-4)</option>
                    </select>
                </div>
                <div class="media-staff-container" id="media-staff-list">
                    <div class="loading-spinner">Ładowanie personelu...</div>
                </div>
            </div>

            <!-- Generator Newsów -->
            <div class="media-section">
                <div class="section-header">
                    <h2><i class="fas fa-bullhorn"></i> Generator Newsów Systemowych</h2>
                    <div class="section-actions">
                        <button class="btn btn-primary" id="generate-all-news">
                            <i class="fas fa-magic"></i> Wygeneruj wszystkie newsy
                        </button>
                        <button class="btn btn-success" id="auto-generate">
                            <i class="fas fa-robot"></i> Auto-generuj co tydzień
                        </button>
                    </div>
                </div>

                <div class="news-generator-categories">
                    <div class="category-card admin" data-category="match_result">
                        <div class="category-icon">
                            <i class="fas fa-basketball-ball"></i>
                        </div>
                        <div class="category-info">
                            <h3>Wyniki spotkań</h3>
                            <p>Generuj relacje z ostatnich meczów dla wszystkich klubów</p>
                            <div class="category-stats">
                                <span class="stat"><i class="fas fa-clock"></i> Ostatnio: <span id="last-match">-</span></span>
                                <span class="stat"><i class="fas fa-database"></i> Ilość: <span id="count-match">0</span></span>
                            </div>
                        </div>
                        <div class="category-actions">
                            <button class="btn btn-sm btn-primary generate-category-btn">
                                Generuj teraz
                            </button>
                            <div class="form-group">
                                <label>Znaczenie:</label>
                                <select class="importance-select" data-category="match_result">
                                    <option value="random">Losowe</option>
                                    <option value="high">Wysokie (3-5)</option>
                                    <option value="low">Niskie (1-2)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="category-card admin" data-category="transfer">
                        <div class="category-icon">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div class="category-info">
                            <h3>Transfery</h3>
                            <p>Informacje o transferach w całej lidze</p>
                            <div class="category-stats">
                                <span class="stat"><i class="fas fa-clock"></i> Ostatnio: <span id="last-transfer">-</span></span>
                                <span class="stat"><i class="fas fa-database"></i> Ilość: <span id="count-transfer">0</span></span>
                            </div>
                        </div>
                        <div class="category-actions">
                            <button class="btn btn-sm btn-primary generate-category-btn">
                                Generuj teraz
                            </button>
                            <div class="form-group">
                                <label>Znaczenie:</label>
                                <select class="importance-select" data-category="transfer">
                                    <option value="random">Losowe</option>
                                    <option value="high">Wysokie (3-5)</option>
                                    <option value="low">Niskie (1-2)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Pozostałe kategorie w podobnym stylu -->
                </div>

                <div class="generator-settings">
                    <h3><i class="fas fa-sliders-h"></i> Ustawienia Generowania</h3>
                    <div class="settings-grid">
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="setting-all-teams" checked>
                                <span>Dla wszystkich klubów w lidze</span>
                            </label>
                            <small>Wygeneruj newsy dla każdego klubu w lidze</small>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="setting-skip-existing" checked>
                                <span>Pomiń istniejące newsy</span>
                            </label>
                            <small>Nie generuj duplikatów dla tego samego tygodnia</small>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="setting-notify-users">
                                <span>Powiadom użytkowników</span>
                            </label>
                            <small>Wyślij powiadomienie o nowych newsach</small>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="setting-archive-old">
                                <span>Archiwizuj stare newsy</span>
                            </label>
                            <small>Przenieś newsy starsze niż 4 tygodnie do archiwum</small>
                        </div>
                    </div>
                </div>

                <div class="generator-progress" id="generator-progress" style="display: none;">
                    <div class="progress-header">
                        <span>Generowanie newsów</span>
                        <span class="progress-percent">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-details">
                        <div class="progress-step">Przygotowanie...</div>
                        <div class="progress-time">Szacowany czas: <span>30s</span></div>
                    </div>
                </div>
            </div>

            <!-- Statystyki systemowe -->
            <div class="media-section">
                <h2><i class="fas fa-chart-network"></i> Statystyki Systemu Mediów</h2>
                <div class="system-stats-grid" id="system-stats">
                    <!-- Załadowane dynamicznie -->
                </div>
            </div>

            <!-- Panel zarządzania -->
            <div class="media-section">
                <h2><i class="fas fa-cogs"></i> Zarządzanie Systemem Mediów</h2>
                <div class="management-panel">
                    <div class="management-card">
                        <i class="fas fa-trash-alt"></i>
                        <h4>Wyczyść stare newsy</h4>
                        <p>Usuń newsy starsze niż 8 tygodni</p>
                        <button class="btn btn-outline btn-sm" id="cleanup-old">Wyczyść</button>
                    </div>
                    <div class="management-card">
                        <i class="fas fa-file-export"></i>
                        <h4>Eksportuj newsy</h4>
                        <p>Eksportuj wszystkie newsy do CSV</p>
                        <button class="btn btn-outline btn-sm" id="export-news">Eksportuj</button>
                    </div>
                    <div class="management-card">
                        <i class="fas fa-sync-alt"></i>
                        <h4>Reset statystyk</h4>
                        <p>Zresetuj liczniki wyświetleń</p>
                        <button class="btn btn-outline btn-sm" id="reset-stats">Resetuj</button>
                    </div>
                    <div class="management-card">
                        <i class="fas fa-bell"></i>
                        <h4>Ustawienia powiadomień</h4>
                        <p>Konfiguruj powiadomienia dla graczy</p>
                        <button class="btn btn-outline btn-sm" id="notification-settings">Ustawienia</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inicjalizacja panelu admina
    await loadAllMediaStaff();
    await loadSystemStats();
    setupAdminEventListeners(team);
}

/**
 * WIDOK DLA GRACZY (super graficzny)
 */
async function renderPlayerMediaView(team, players) {
    const container = document.getElementById('m-media');
    
    container.innerHTML = `
        <div class="player-media-view">
            <!-- Hero Section -->
            <div class="media-hero">
                <div class="hero-background">
                    <div class="hero-overlay"></div>
                    <div class="hero-content">
                        <h1 class="hero-title">
                            <span class="highlight">📰 Media EBL</span>
                        </h1>
                        <p class="hero-subtitle">
                            Najnowsze newsy, wywiady i relacje z życia ligi koszykarskiej
                        </p>
                        <div class="hero-stats">
                            <div class="stat-bubble">
                                <i class="fas fa-newspaper"></i>
                                <span id="total-news">Ładowanie...</span>
                                <small>Newsów w sezonie</small>
                            </div>
                            <div class="stat-bubble">
                                <i class="fas fa-eye"></i>
                                <span id="total-views">Ładowanie...</span>
                                <small>Łączne wyświetlenia</small>
                            </div>
                            <div class="stat-bubble">
                                <i class="fas fa-star"></i>
                                <span id="trending">Ładowanie...</span>
                                <small>Trending newsów</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Featured News Carousel -->
            <div class="featured-section">
                <div class="section-header">
                    <h2><i class="fas fa-fire"></i> Najgorętsze newsy</h2>
                    <div class="carousel-nav">
                        <button class="carousel-btn prev-btn"><i class="fas fa-chevron-left"></i></button>
                        <button class="carousel-btn next-btn"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
                <div class="featured-carousel" id="featured-carousel">
                    <div class="carousel-track">
                        <!-- Newsy będą dodane dynamicznie -->
                    </div>
                </div>
                <div class="carousel-dots"></div>
            </div>

            <!-- Main Content Grid -->
            <div class="media-content-grid">
                <!-- Left Column: Latest News -->
                <div class="content-column">
                    <div class="content-card">
                        <div class="card-header">
                            <h3><i class="fas fa-clock"></i> Najnowsze newsy</h3>
                            <div class="filter-tabs">
                                <button class="filter-tab active" data-category="all">Wszystkie</button>
                                <button class="filter-tab" data-category="match_result">Mecze</button>
                                <button class="filter-tab" data-category="transfer">Transfery</button>
                                <button class="filter-tab" data-category="fan_satisfaction">Kibice</button>
                            </div>
                        </div>
                        <div class="news-feed" id="latest-news">
                            <!-- Newsy będą ładowane dynamicznie -->
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-outline" id="load-more-news">
                                <i class="fas fa-redo"></i> Załaduj więcej
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Sidebar -->
                <div class="sidebar-column">
                    <!-- League Standings -->
                    <div class="sidebar-card standings-card">
                        <div class="card-header">
                            <h4><i class="fas fa-trophy"></i> Tabela ligowa</h4>
                            <small>Bieżący sezon</small>
                        </div>
                        <div class="standings-list" id="league-standings">
                            <!-- Tabela będzie ładowana dynamicznie -->
                        </div>
                        <div class="card-footer">
                            <a href="#" onclick="switchTab('m-league')" class="see-all-link">
                                Zobacz pełną tabelę <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Top Players -->
                    <div class="sidebar-card players-card">
                        <div class="card-header">
                            <h4><i class="fas fa-basketball-ball"></i> Gwiazdy tygodnia</h4>
                            <small>Najlepsi w ostatniej kolejce</small>
                        </div>
                        <div class="top-players" id="top-players">
                            <!-- Gracze będą ładowani dynamicznie -->
                        </div>
                    </div>

                    <!-- Social Media -->
                    <div class="sidebar-card social-card">
                        <div class="card-header">
                            <h4><i class="fas fa-hashtag"></i> #EBL na social media</h4>
                        </div>
                        <div class="social-feed">
                            <div class="social-post">
                                <div class="post-header">
                                    <i class="fab fa-twitter"></i>
                                    <span>@EBL_Official</span>
                                    <small>2h temu</small>
                                </div>
                                <p>⚡️ Sensacyjne zwycięstwo w derbach! Relacja na żywo na naszym kanale.</p>
                                <div class="post-stats">
                                    <span><i class="fas fa-heart"></i> 245</span>
                                    <span><i class="fas fa-retweet"></i> 89</span>
                                </div>
                            </div>
                            <div class="social-post">
                                <div class="post-header">
                                    <i class="fab fa-instagram"></i>
                                    <span>@EBL_Koszykówka</span>
                                    <small>5h temu</small>
                                </div>
                                <p>🏆 Zobacz najlepsze akcje z ostatniej kolejki w naszej relacji!</p>
                                <div class="social-image">
                                    <div class="image-placeholder">
                                        <i class="fas fa-camera"></i> Galeria meczu
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-outline">
                                <i class="fas fa-external-link-alt"></i> Obserwuj nas
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Multimedia Section -->
            <div class="multimedia-section">
                <div class="section-header">
                    <h2><i class="fas fa-photo-video"></i> Multimedia</h2>
                </div>
                <div class="multimedia-grid">
                    <div class="video-card">
                        <div class="video-thumbnail">
                            <div class="play-button">
                                <i class="fas fa-play"></i>
                            </div>
                            <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                                 alt="Mecz EBL" class="thumbnail-img">
                        </div>
                        <div class="video-info">
                            <h4>HIGHLIGHTS: Mistrz kontra Wicemistrz</h4>
                            <p>Zobacz najlepsze akcje z emocjonującego meczu</p>
                            <div class="video-meta">
                                <span><i class="fas fa-clock"></i> 4:32</span>
                                <span><i class="fas fa-eye"></i> 12.4K</span>
                            </div>
                        </div>
                    </div>

                    <div class="video-card">
                        <div class="video-thumbnail">
                            <div class="play-button">
                                <i class="fas fa-play"></i>
                            </div>
                            <img src="https://images.unsplash.com/photo-1519861531473-920034658307?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                                 alt="Wywiad" class="thumbnail-img">
                        </div>
                        <div class="video-info">
                            <h4>Wywiad z MVP kolejki</h4>
                            <p>Rozmowa z najlepszym zawodnikiem ostatniej serii</p>
                            <div class="video-meta">
                                <span><i class="fas fa-clock"></i> 8:15</span>
                                <span><i class="fas fa-eye"></i> 8.7K</span>
                            </div>
                        </div>
                    </div>

                    <div class="gallery-card">
                        <div class="gallery-preview">
                            <div class="gallery-item active">
                                <img src="https://images.unsplash.com/photo-1519861531473-920034658307?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" 
                                     alt="Zdjęcie 1">
                            </div>
                            <div class="gallery-item">
                                <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80" 
                                     alt="Zdjęcie 2">
                            </div>
                        </div>
                        <div class="gallery-info">
                            <h4>Galeria zdjęć z meczu</h4>
                            <p>Zobacz najlepsze ujęcia z ostatniego spotkania</p>
                            <div class="gallery-nav">
                                <button class="gallery-prev"><i class="fas fa-chevron-left"></i></button>
                                <span class="gallery-counter">1/12</span>
                                <button class="gallery-next"><i class="fas fa-chevron-right"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Newsletter Section -->
            <div class="newsletter-section">
                <div class="newsletter-content">
                    <i class="fas fa-envelope-open-text newsletter-icon"></i>
                    <div class="newsletter-text">
                        <h3>Bądź na bieżąco!</h3>
                        <p>Zapisz się do newslettera EBL i otrzymuj najnowsze newsy prosto na swoją skrzynkę</p>
                    </div>
                    <div class="newsletter-form">
                        <input type="email" placeholder="Twój email" class="newsletter-input">
                        <button class="btn btn-primary newsletter-btn">
                            Zapisz się <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inicjalizacja widoku gracza
    await loadPlayerMediaContent(team);
    setupPlayerEventListeners();
}

/**
 * Funkcje dla widoku gracza
 */
async function loadPlayerMediaContent(team) {
    try {
        // Ładuj najnowsze newsy
        const { data: news, error } = await supabaseClient
            .from('club_news')
            .select(`
                *,
                team:teams(team_name, logo_url, city)
            `)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && news) {
            // Hero stats
            const totalNews = news.length;
            const totalViews = news.reduce((sum, n) => sum + (n.views || 0), 0);
            const trending = news.filter(n => n.importance >= 4).length;

            document.getElementById('total-news').textContent = totalNews;
            document.getElementById('total-views').textContent = totalViews.toLocaleString();
            document.getElementById('trending').textContent = trending;

            // Featured news (carousel)
            const featuredNews = news.slice(0, 5);
            renderFeaturedCarousel(featuredNews);

            // Latest news feed
            renderNewsFeed(news.slice(0, 10));
        }

        // Ładuj tabelę ligową
        await loadLeagueStandings(team.league_id);

        // Ładuj najlepszych graczy
        await loadTopPlayers(team.league_id);

    } catch (err) {
        console.error('Błąd ładowania treści medialnych:', err);
    }
}

function renderFeaturedCarousel(news) {
    const carouselTrack = document.querySelector('.carousel-track');
    const dotsContainer = document.querySelector('.carousel-dots');
    
    if (!carouselTrack) return;

    carouselTrack.innerHTML = news.map((item, index) => `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="slide-background" style="background-image: url('${getNewsImage(item.category)}')"></div>
            <div class="slide-overlay"></div>
            <div class="slide-content">
                <span class="slide-category ${item.category}">
                    ${getCategoryIcon(item.category)} ${getCategoryName(item.category)}
                </span>
                <h3 class="slide-title">${item.title}</h3>
                <p class="slide-excerpt">${item.content.substring(0, 150)}...</p>
                <div class="slide-meta">
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>Tydzień ${item.week}</span>
                    </div>
                    <div class="meta-item">
                        <img src="${item.team.logo_url || '/default-logo.png'}" 
                             alt="${item.team.team_name}" 
                             class="meta-logo">
                        <span>${item.team.team_name}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-star"></i>
                        <span>${'★'.repeat(item.importance)}</span>
                    </div>
                </div>
                <button class="btn btn-outline-light read-more-btn" data-id="${item.id}">
                    Czytaj więcej <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Add dots
    dotsContainer.innerHTML = news.map((_, index) => `
        <button class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></button>
    `).join('');
}

function renderNewsFeed(news) {
    const container = document.getElementById('latest-news');
    if (!container) return;

    container.innerHTML = news.map(item => `
        <div class="news-feed-item" data-category="${item.category}">
            <div class="news-item-header">
                <div class="news-item-category ${item.category}">
                    ${getCategoryIcon(item.category)}
                </div>
                <div class="news-item-info">
                    <h4 class="news-item-title">${item.title}</h4>
                    <div class="news-item-meta">
                        <span class="meta-item">
                            <img src="${item.team.logo_url || '/default-logo.png'}" 
                                 alt="${item.team.team_name}" 
                                 class="meta-logo-sm">
                            ${item.team.team_name}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-clock"></i>
                            ${formatRelativeTime(item.created_at)}
                        </span>
                        <span class="meta-item importance-${item.importance}">
                            ${'★'.repeat(item.importance)}
                        </span>
                    </div>
                </div>
            </div>
            <p class="news-item-excerpt">${item.content.substring(0, 200)}...</p>
            <div class="news-item-footer">
                <button class="btn btn-text read-btn" data-id="${item.id}">
                    <i class="fas fa-book-open"></i> Czytaj
                </button>
                <div class="news-stats">
                    <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                    <span><i class="fas fa-comment"></i> 0</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadLeagueStandings(leagueId) {
    try {
        const { data: standings, error } = await supabaseClient
            .from('league_standings')
            .select(`
                position,
                team:teams(team_name, logo_url),
                wins,
                losses,
                points_for,
                points_against
            `)
            .eq('league_id', leagueId)
            .order('position', { ascending: true })
            .limit(8);

        if (!error && standings) {
            const container = document.getElementById('league-standings');
            container.innerHTML = standings.map(standing => `
                <div class="standing-row">
                    <div class="standing-position">${standing.position}.</div>
                    <div class="standing-team">
                        <img src="${standing.team.logo_url || '/default-logo.png'}" 
                             alt="${standing.team.team_name}" 
                             class="team-logo-xs">
                        <span class="team-name">${standing.team.team_name}</span>
                    </div>
                    <div class="standing-stats">
                        <span class="stat">${standing.wins}-${standing.losses}</span>
                        <span class="stat-diff ${standing.points_for > standing.points_against ? 'positive' : 'negative'}">
                            ${standing.points_for > standing.points_against ? '+' : ''}${standing.points_for - standing.points_against}
                        </span>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Błąd ładowania tabeli:', err);
    }
}

async function loadTopPlayers(leagueId) {
    try {
        const { data: players, error } = await supabaseClient
            .from('players')
            .select(`
                id,
                first_name,
                last_name,
                position,
                rating,
                team:teams(team_name, logo_url)
            `)
            .eq('league_id', leagueId)
            .order('rating', { ascending: false })
            .limit(5);

        if (!error && players) {
            const container = document.getElementById('top-players');
            container.innerHTML = players.map(player => `
                <div class="top-player">
                    <div class="player-avatar">
                        <div class="avatar-initials">
                            ${player.first_name[0]}${player.last_name[0]}
                        </div>
                    </div>
                    <div class="player-info">
                        <div class="player-name">${player.first_name} ${player.last_name}</div>
                        <div class="player-details">
                            <span class="player-position">${player.position}</span>
                            <span class="player-rating">${player.rating} OVR</span>
                        </div>
                        <div class="player-team">
                            <img src="${player.team.logo_url || '/default-logo.png'}" 
                                 alt="${player.team.team_name}" 
                                 class="team-logo-xs">
                            <span>${player.team.team_name}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Błąd ładowania graczy:', err);
    }
}

/**
 * Event listeners dla graczy
 */
function setupPlayerEventListeners() {
    // Carousel navigation
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const dots = document.querySelectorAll('.carousel-dot');
    
    let currentSlide = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    
    function updateCarousel() {
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === currentSlide);
        });
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
        
        // Move carousel track
        const track = document.querySelector('.carousel-track');
        if (track) {
            track.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            updateCarousel();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentSlide = (currentSlide + 1) % slides.length;
            updateCarousel();
        });
    }
    
    // Dots navigation
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            currentSlide = parseInt(dot.dataset.index);
            updateCarousel();
        });
    });
    
    // Auto-advance carousel
    setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        updateCarousel();
    }, 5000);
    
    // Filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const category = tab.dataset.category;
            filterNewsFeed(category);
        });
    });
    
    // Read more buttons
    document.querySelectorAll('.read-btn, .read-more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newsId = e.target.closest('button').dataset.id;
            openNewsModal(newsId);
        });
    });
    
    // Load more news
    const loadMoreBtn = document.getElementById('load-more-news');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            // Implementacja ładowania kolejnych newsów
        });
    }
}

/**
 * Pomocnicze funkcje
 */
function getNewsImage(category) {
    const images = {
        'match_result': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80',
        'transfer': 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80',
        'staff_purchase': 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80',
        'promotion_relegation': 'https://images.unsplash.com/photo-1519861531473-920034658307?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80',
        'fan_satisfaction': 'https://images.unsplash.com/photo-1543321269-9d86d3680e1c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80'
    };
    return images[category] || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80';
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins} min temu`;
    } else if (diffHours < 24) {
        return `${diffHours} godz. temu`;
    } else if (diffDays < 7) {
        return `${diffDays} dni temu`;
    } else {
        return date.toLocaleDateString('pl-PL');
    }
}

function filterNewsFeed(category) {
    const items = document.querySelectorAll('.news-feed-item');
    items.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function openNewsModal(newsId) {
    // Implementacja modal z pełną treścią newsa
    console.log('Otwórz news:', newsId);
}

// Pozostałe funkcje z poprzedniej implementacji (getCategoryIcon, getCategoryName, etc.)
// ... (zachować z poprzedniego kodu)
