// Main Application Router
import { api } from './utils/api.js';
import { showError, escapeHtml } from './utils/helpers.js';
import { studyStats, saveStudyStats, loadStudyStats } from './services/studyStats.js';
import { resetDailyXP, updateXPDisplay } from './services/xpService.js';

// Core modular systems are loaded via script tags in index.html
// They're available as window.StateManager, window.EventBus, window.APIClient

// Import page modules
import * as pathPage from './pages/PathPage.js';
import * as studyPage from './pages/StudyPage.js';
import * as flashcardPage from './pages/FlashcardPage.js';
import * as quizPage from './pages/QuizPage.js';
import * as kanaPage from './pages/KanaPage.js';
import * as practicePage from './pages/PracticePage.js';
import * as achievementsPage from './pages/AchievementsPage.js';
import * as questsPage from './pages/QuestsPage.js';
import * as exercisePage from './pages/ExercisePage.js';
import * as statsPage from './pages/StatsPage.js';
import * as gamesPage from './pages/GamesPage.js';
import * as chapterTestPage from './pages/ChapterTestPage.js';
import * as challengesPage from './pages/ChallengesPage.js';
import * as storyPage from './pages/StoryPage.js';

// Global state
let currentMode = 'study'; // Changed from 'path' to 'study' to avoid auto-loading learning path

// Routing: Map URL paths to mode names
const routeMap = {
    '/': 'study',
    '/study': 'study',
    '/path': 'path',
    '/flashcards': 'flashcards',
    '/quiz': 'quiz',
    '/kana': 'kana',
    '/practice': 'practice',
    '/games': 'games',
    '/test': 'test',
    '/challenges': 'challenges',
    '/story': 'story',
    '/achievements': 'achievements',
    '/quests': 'quests',
    '/exercise': 'exercise',
    '/stats': 'stats'
};

// Initialize core modular systems (if available)
// These are loaded via script tags in index.html before main.js
let stateManager, eventBus, apiClient;

if (window.StateManager && window.EventBus && window.APIClient) {
    stateManager = new window.StateManager();
    eventBus = new window.EventBus();
    apiClient = new window.APIClient();
    
    // Make core systems available globally
    window.stateManager = stateManager;
    window.eventBus = eventBus;
    window.apiClient = apiClient;
    
    console.log('Core modular systems initialized');
} else {
    console.warn('Core modular systems not available - ensure script tags are loaded in index.html');
}

// Page registry
const pages = {
    path: pathPage,
    study: studyPage,
    flashcards: flashcardPage,
    quiz: quizPage,
    kana: kanaPage,
    practice: practicePage,
    games: gamesPage,
    test: chapterTestPage,
    challenges: challengesPage,
    story: storyPage,
    achievements: achievementsPage,
    quests: questsPage,
    exercise: exercisePage,
    stats: statsPage
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Main.js: DOM loaded, initializing app...');
    
    try {
        // Set up routing FIRST
        console.log('Setting up routing...');
        setupRouting();
        
        // Set up event listeners FIRST so UI is always responsive
        console.log('Setting up event listeners...');
        setupEventListeners();
        console.log('Event listeners set up');
        
        // Initialize app (non-blocking)
        console.log('Starting app initialization...');
        initializeApp().then(() => {
            updateStudyStreak();
            console.log('App initialized successfully');
        }).catch(error => {
            console.error('Failed to initialize app:', error);
            // Don't block the UI - show error but keep it functional
            const wordGrid = document.getElementById('wordGrid');
            if (wordGrid) {
                wordGrid.innerHTML = `
                    <div class="empty-state">
                        <h2>⚠️ Initialization Error</h2>
                        <p>${escapeHtml(error.message)}</p>
                        <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted);">
                            The UI should still be functional. Try refreshing or check the console.
                        </p>
                    </div>
                `;
            }
        });
    } catch (error) {
        console.error('Critical error in DOMContentLoaded:', error);
        alert('Critical error: ' + error.message + '\nCheck console for details.');
    }
});

async function initializeApp() {
    try {
        console.log('Starting initialization...');
        
        // Load study stats first (doesn't require API)
        loadStudyStats();
        
        // Initialize enhanced services
        if (window.streakService) {
            window.streakService.checkStreakOnLoad();
            window.streakService.updateStreakDisplay();
        }
        
        if (window.skillStrengthService) {
            window.skillStrengthService.updateAllSkillStrengths();
        }
        
        // Sync studyStats with StateManager for compatibility (if available)
        if (window.stateManager) {
            syncStudyStatsToStateManager();
        }
        
        // Reset daily XP if it's a new day (doesn't require API)
        resetDailyXP();
        
        // Update displays (doesn't require API)
        updateXPDisplay();
        updateHeartsDisplay();
        
        // Setup event listeners for core systems (if available)
        if (window.stateManager && window.eventBus) {
            setupCoreSystemListeners();
        }
        
        // Test API connection with timeout
        try {
            const API_BASE = api.API_BASE || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const testResponse = await fetch(`${API_BASE}/days`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!testResponse.ok) {
                throw new Error(`Server returned ${testResponse.status}`);
            }
            console.log('API connection successful');
            const statusEl = document.getElementById('connectionStatus');
            if (statusEl) statusEl.style.display = 'none';
        } catch (err) {
            console.error('API connection failed:', err);
            const statusEl = document.getElementById('connectionStatus');
            if (statusEl) {
                statusEl.style.display = 'block';
                const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
                statusEl.textContent = `⚠️ Cannot connect to ${API_BASE}`;
            }
            // Don't return - continue initialization even if API fails
            console.warn('Continuing without API connection...');
        }
        
        // Initialize all pages (with error handling so one failure doesn't block others)
        const initPromises = [];
        for (const [mode, page] of Object.entries(pages)) {
            if (page.init) {
                initPromises.push(
                    page.init().catch(error => {
                        console.error(`Error initializing ${mode} page:`, error);
                        // Don't throw - continue with other pages
                    })
                );
            }
        }
        
        // Wait for all page initializations (but don't fail if some fail)
        await Promise.allSettled(initPromises);
        
        // Load initial stats (with error handling)
        if (statsPage.load) {
            try {
                await statsPage.load();
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }
        
        // Set initial mode (this should always work)
        switchMode(currentMode);
        
        console.log('Initialization complete');
    } catch (error) {
        console.error('Initialization error:', error);
        // Don't throw - UI should still be functional
        console.warn('Continuing despite initialization errors...');
    }
}

function setupEventListeners() {
    console.log('setupEventListeners called');
    
    // Tab switching - make sure this always works
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log('Found', tabButtons.length, 'tab buttons');
    
    tabButtons.forEach((btn, index) => {
        // Remove any existing listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const mode = newBtn.dataset.mode;
            console.log('Tab button clicked, switching to mode:', mode);
            try {
                switchMode(mode);
            } catch (error) {
                console.error('Error in switchMode:', error);
                // Fallback: just toggle classes manually
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.mode === mode);
                });
                document.querySelectorAll('.mode-panel').forEach(panel => {
                    panel.classList.toggle('active', panel.id === `${mode}Mode`);
                });
            }
        });
    });
    
    // Day selector - set up listener even if dropdown isn't populated yet
    const daySelect = document.getElementById('daySelect');
    if (daySelect) {
        // Make sure it's enabled (remove disabled attribute)
        daySelect.disabled = false;
        daySelect.removeAttribute('disabled');
        
        // Remove existing listener by cloning
        const newSelect = daySelect.cloneNode(true);
        daySelect.parentNode.replaceChild(newSelect, daySelect);
        
        // Make sure cloned select is also enabled
        newSelect.disabled = false;
        newSelect.removeAttribute('disabled');
        
        newSelect.addEventListener('change', async (e) => {
            const value = e.target.value;
            console.log('Day selected:', value);
            if (value && window.studyPage && window.studyPage.loadWords) {
                try {
                    await window.studyPage.loadWords(parseInt(value));
                } catch (error) {
                    console.error('Error loading words:', error);
                    const wordGrid = document.getElementById('wordGrid');
                    if (wordGrid) {
                        wordGrid.innerHTML = `
                            <div class="empty-state">
                                <h2>⚠️ Error</h2>
                                <p>${escapeHtml(error.message)}</p>
                            </div>
                        `;
                    }
                }
            }
        });
    }
    
    // Settings toggles
    const showFurigana = document.getElementById('showFurigana');
    const showTranslation = document.getElementById('showTranslation');
    
    if (showFurigana) {
        showFurigana.addEventListener('change', () => {
            if (window.studyPage && window.studyPage.renderWords && window.studyPage.currentDayWords && window.studyPage.currentDayWords.length > 0) {
                window.studyPage.renderWords(window.studyPage.currentDayWords);
            }
        });
    }
    
    if (showTranslation) {
        showTranslation.addEventListener('change', () => {
            if (window.studyPage && window.studyPage.renderWords && window.studyPage.currentDayWords && window.studyPage.currentDayWords.length > 0) {
                window.studyPage.renderWords(window.studyPage.currentDayWords);
            }
        });
    }
    
    // Flashcard day selector
    const flashcardDaySelect = document.getElementById('flashcardDaySelect');
    if (flashcardDaySelect) {
        flashcardDaySelect.addEventListener('change', () => {
            if (flashcardPage.load) {
                flashcardPage.load();
            }
        });
    }
    
    // Quiz day selector
    const quizDaySelect = document.getElementById('quizDaySelect');
    if (quizDaySelect) {
        quizDaySelect.addEventListener('change', () => {
            if (quizPage.resetQuiz) {
                quizPage.resetQuiz();
            }
        });
    }
}

function switchMode(mode, updateURL = true) {
    try {
        currentMode = mode;
        
        // Update URL if requested (default: yes)
        if (updateURL && window.history) {
            const path = getPathForMode(mode);
            if (path) {
                window.history.pushState({ mode }, '', path);
                // Update page title
                updatePageTitle(mode);
            }
        }
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Update panels
        document.querySelectorAll('.mode-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${mode}Mode`);
        });
        
        // Load page content (with error handling)
        const page = pages[mode];
        if (page && page.load) {
            console.log(`Loading ${mode} page...`);
            page.load().catch(error => {
                console.error(`Error loading ${mode} page:`, error);
                // Show error in the panel
                const panel = document.getElementById(`${mode}Mode`);
                if (panel) {
                    const content = panel.querySelector('.mode-panel > *') || panel;
                    if (content) {
                        content.innerHTML = `
                            <div class="empty-state">
                                <h2>⚠️ Error Loading Page</h2>
                                <p>${escapeHtml(error.message)}</p>
                                <button class="premium-btn" onclick="window.app.switchMode('${mode}')">Retry</button>
                            </div>
                        `;
                    }
                }
            });
        } else if (mode === 'exercise') {
            // Exercise mode doesn't auto-load, it's triggered by startExerciseSession
            // The load function in ExercisePage will handle the empty state
            if (window.exercisePage && window.exercisePage.load) {
                window.exercisePage.load().catch(error => {
                    console.error('Error loading exercise page:', error);
                });
            }
        } else {
            console.warn(`No load function found for ${mode} page`);
        }
        
        // Update hearts display
        updateHeartsDisplay();
    } catch (error) {
        console.error('Error in switchMode:', error);
        // Don't throw - ensure UI remains functional
    }
}

// Hearts System
function updateHeartsDisplay() {
    const hearts = getHearts();
    const heartsContainer = document.getElementById('heartsContainer');
    const heartsCount = document.getElementById('heartsCount');
    
    if (heartsContainer) {
        heartsContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const heart = document.createElement('span');
            heart.className = 'heart';
            heart.textContent = i < hearts ? '❤️' : '🤍';
            heartsContainer.appendChild(heart);
        }
    }
    
    if (heartsCount) {
        heartsCount.textContent = `${hearts}/5`;
    }
}

function getHearts() {
    const hearts = studyStats.hearts || 5;
    const lastHeartLoss = studyStats.lastHeartLoss || Date.now();
    const timeSinceLoss = Date.now() - lastHeartLoss;
    const HEART_REFILL_TIME = 4 * 60 * 60 * 1000; // 4 hours
    
    if (hearts < 5 && timeSinceLoss >= HEART_REFILL_TIME) {
        const heartsRefilled = Math.floor(timeSinceLoss / HEART_REFILL_TIME);
        const newHearts = Math.min(5, hearts + heartsRefilled);
        if (newHearts !== hearts) {
            studyStats.hearts = newHearts;
            studyStats.lastHeartLoss = Date.now();
            saveStudyStats();
        }
        return newHearts;
    }
    
    return hearts;
}

// Study Streak
function updateStudyStreak() {
    const today = new Date().toDateString();
    const lastDate = studyStats.lastStudyDate;
    
    if (lastDate === today) {
        return;
    }
    
    if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDateObj.toDateString() === yesterday.toDateString()) {
            studyStats.studyStreak++;
        } else {
            studyStats.studyStreak = 1;
        }
    } else {
        studyStats.studyStreak = 1;
    }
    
    studyStats.lastStudyDate = today;
    saveStudyStats();
}

// Audio functions (kept for compatibility)
function speakJapanese(text, options = {}) {
    if (window.audioPlayer) {
        return window.audioPlayer.play(text, {
            speed: options.speed || 0.8,
            onStart: options.onStart,
            onEnd: options.onEnd,
            onError: options.onError
        });
    }
    
    if (!('speechSynthesis' in window)) {
        alert('Text-to-speech is not supported in your browser.');
        return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = options.speed || 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    const voices = window.speechSynthesis.getVoices();
    let japaneseVoice = voices.find(voice => 
        voice.lang === 'ja-JP' || 
        voice.lang === 'ja' ||
        voice.lang.startsWith('ja-')
    );
    
    if (!japaneseVoice) {
        japaneseVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('japanese') ||
            voice.name.toLowerCase().includes('japan')
        );
    }
    
    if (japaneseVoice) {
        utterance.voice = japaneseVoice;
    }
    
    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        if (options.onError) options.onError(event);
    };
    
    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onEnd) utterance.onend = options.onEnd;
    
    window.speechSynthesis.speak(utterance);
}

// Make speakJapanese globally available
window.speakJapanese = speakJapanese;

// Sync studyStats to StateManager (for compatibility)
function syncStudyStatsToStateManager() {
    if (!window.stateManager) return;
    
    // Sync from studyStats to StateManager
    window.stateManager.updateMultiple({
        totalXP: studyStats.totalXP || 0,
        dailyXP: studyStats.dailyXP || 0,
        studyStreak: studyStats.studyStreak || 0,
        lastStudyDate: studyStats.lastStudyDate || null,
        hearts: studyStats.hearts || 5,
        lastHeartLoss: studyStats.lastHeartLoss || Date.now(),
        dayProgress: studyStats.dayProgress || {},
        kanaProgress: studyStats.kanaProgress || {},
        skillProgress: studyStats.skillProgress || {},
        achievements: studyStats.achievements || [],
        dailyQuests: studyStats.dailyQuests || {},
        spacedRepetition: studyStats.spacedRepetition || {}
    });
}

// Sync StateManager to studyStats (for compatibility)
function syncStateManagerToStudyStats() {
    if (!window.stateManager) return;
    
    studyStats.totalXP = window.stateManager.get('totalXP') || 0;
    studyStats.dailyXP = window.stateManager.get('dailyXP') || 0;
    studyStats.studyStreak = window.stateManager.get('studyStreak') || 0;
    studyStats.lastStudyDate = window.stateManager.get('lastStudyDate') || null;
    studyStats.hearts = window.stateManager.get('hearts') || 5;
    studyStats.lastHeartLoss = window.stateManager.get('lastHeartLoss') || Date.now();
    studyStats.dayProgress = window.stateManager.get('dayProgress') || {};
    studyStats.kanaProgress = window.stateManager.get('kanaProgress') || {};
    studyStats.skillProgress = window.stateManager.get('skillProgress') || {};
    studyStats.achievements = window.stateManager.get('achievements') || [];
    studyStats.dailyQuests = window.stateManager.get('dailyQuests') || {};
    studyStats.spacedRepetition = window.stateManager.get('spacedRepetition') || {};
    saveStudyStats();
}

// Setup listeners for core systems
function setupCoreSystemListeners() {
    if (!window.stateManager || !window.eventBus) return;
    
    // Listen to state changes and sync to studyStats
    window.stateManager.subscribe('totalXP', () => {
        syncStateManagerToStudyStats();
        updateXPDisplay();
    });
    
    window.stateManager.subscribe('dailyXP', () => {
        syncStateManagerToStudyStats();
        updateXPDisplay();
    });
    
    window.stateManager.subscribe('hearts', () => {
        syncStateManagerToStudyStats();
        updateHeartsDisplay();
    });
    
    window.stateManager.subscribe('studyStreak', () => {
        syncStateManagerToStudyStats();
    });
    
    // Listen to events and update UI
    window.eventBus.on('xp-gained', (data) => {
        updateXPDisplay();
    });
    
    window.eventBus.on('hearts-changed', () => {
        updateHeartsDisplay();
    });
}

// Routing functions
function setupRouting() {
    // Handle initial route
    const initialMode = getModeFromPath(window.location.pathname);
    if (initialMode && initialMode !== currentMode) {
        currentMode = initialMode; // Update current mode before switching
    }
    
    // Switch to initial mode (without updating URL since we're reading from it)
    switchMode(currentMode, false);
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        const mode = event.state?.mode || getModeFromPath(window.location.pathname);
        if (mode && mode !== currentMode) {
            switchMode(mode, false); // Don't update URL, we're responding to URL change
        }
    });
}

function getModeFromPath(pathname) {
    // Normalize pathname
    const path = pathname === '/' ? '/' : pathname.toLowerCase();
    return routeMap[path] || 'study'; // Default to study
}

function getPathForMode(mode) {
    // Find the path for this mode
    for (const [path, routeMode] of Object.entries(routeMap)) {
        if (routeMode === mode) {
            return path === '/' ? '/' : path;
        }
    }
    return '/study'; // Default path
}

function updatePageTitle(mode) {
    const titles = {
        study: 'Study - DailyJapJap',
        path: 'Learning Path - DailyJapJap',
        flashcards: 'Flashcards - DailyJapJap',
        quiz: 'Quiz - DailyJapJap',
        kana: 'Kana - DailyJapJap',
        practice: 'Practice - DailyJapJap',
        games: 'Games - DailyJapJap',
        test: 'Chapter Tests - DailyJapJap',
        challenges: 'Challenges - DailyJapJap',
        story: 'Stories - DailyJapJap',
        achievements: 'Achievements - DailyJapJap',
        quests: 'Daily Quests - DailyJapJap',
        exercise: 'Exercises - DailyJapJap',
        stats: 'Statistics - DailyJapJap'
    };
    
    document.title = titles[mode] || 'DailyJapJap';
}

// Export for global access
window.app = { switchMode, updateXPDisplay, updateHeartsDisplay };

