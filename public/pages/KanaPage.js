// Kana Page Component
import api from '../utils/api.js';
import { showError, escapeHtml } from '../utils/helpers.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';

let currentKanaType = 'hiragana';
let currentKanaLesson = null;

export async function init() {
    await loadKanaLessons();
}

export async function load() {
    console.log('KanaPage.load called');
    
    // Always reload kana lessons when page is accessed
    const kanaContent = document.getElementById('kanaContent');
    if (kanaContent) {
        kanaContent.innerHTML = '<div class="loading-state"><div class="premium-spinner"></div><p>Loading kana lessons...</p></div>';
    }
    
    await loadKanaLessons();
}

async function loadKanaLessons() {
    try {
        const data = await api.get('/kana');
        
        const hiraganaLessons = data.hiragana?.lessons || [];
        const katakanaLessons = data.katakana?.lessons || [];
        
        const lessonSelect = document.getElementById('kanaLessonSelect');
        if (lessonSelect) {
            lessonSelect.innerHTML = '<option value="">Select a lesson...</option>';
            
            hiraganaLessons.forEach(lesson => {
                const option = document.createElement('option');
                option.value = `hiragana-${lesson.day}`;
                option.textContent = `Day ${lesson.day}: ${lesson.title}`;
                lessonSelect.appendChild(option);
            });
            
            katakanaLessons.forEach(lesson => {
                const option = document.createElement('option');
                option.value = `katakana-${lesson.day}`;
                option.textContent = `Day ${lesson.day}: ${lesson.title}`;
                lessonSelect.appendChild(option);
            });
            
            lessonSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    const [type, day] = e.target.value.split('-');
                    loadKanaLesson(parseInt(day), type);
                }
            });
        }
        
        // Load first lesson by default
        const kanaContent = document.getElementById('kanaContent');
        if (kanaContent && hiraganaLessons.length > 0 && !currentKanaLesson) {
            loadKanaLesson(hiraganaLessons[0].day, 'hiragana');
        }
    } catch (error) {
        console.error('Error loading kana lessons:', error);
        const kanaContent = document.getElementById('kanaContent');
        if (kanaContent) {
            kanaContent.innerHTML = `<div class="empty-state"><p>Error loading kana lessons: ${error.message}</p></div>`;
        }
    }
}

async function loadKanaLesson(day, type) {
    try {
        const data = await api.get(`/kana?type=${type}&day=${day}`);
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        currentKanaLesson = data;
        currentKanaType = type;
        
        const kanaContent = document.getElementById('kanaContent');
        if (!kanaContent) return;
        
        kanaContent.innerHTML = `
            <div class="kana-lesson glass">
                <h3 class="lesson-title">${data.title}</h3>
                <p class="lesson-description">${data.description}</p>
                <div class="kana-grid">
                    ${data.characters.map(char => `
                        <div class="kana-card" data-char="${char.char}" data-romaji="${char.romaji}">
                            <div class="kana-char">${char.char}</div>
                            <div class="kana-romaji">${char.romaji}</div>
                            <button class="premium-btn small" onclick="window.speakJapanese && window.speakJapanese('${char.char}')">🔊</button>
                        </div>
                    `).join('')}
                </div>
                <div class="kana-practice">
                    <h4>Practice Mode</h4>
                    <button class="premium-btn" onclick="window.quizPage.startQuiz()">Start Quiz</button>
                </div>
            </div>
        `;
        
        // Mark lesson as started
        const lessonKey = `${type}-${day}`;
        if (!studyStats.kanaProgress[lessonKey]) {
            studyStats.kanaProgress[lessonKey] = { started: true, progress: 0 };
            saveStudyStats();
        }
        
        // Add XP for viewing lesson
        if (window.xpService) {
            window.xpService.addXP(5, `Viewed ${type} lesson`);
        }
    } catch (error) {
        console.error('Error loading kana lesson:', error);
        showError(`Failed to load kana lesson: ${error.message}`);
    }
}

// Export for global access
window.kanaPage = { init, load };

