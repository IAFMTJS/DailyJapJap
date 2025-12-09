// Story Mode - Interactive anime-style stories
import { studyStats, saveStudyStats } from '../services/studyStats.js';
import { showError, escapeHtml } from '../utils/helpers.js';

// Story database - anime-style interactive stories
const STORIES = [
    {
        id: 'story-1',
        title: '初めての学校 (First Day of School)',
        description: 'Your first day at a Japanese school',
        theme: 'school',
        unlocked: true,
        chapters: [
            {
                id: 'ch1',
                scene: '🏫 School Entrance',
                dialogue: [
                    { character: '👨‍🎓 You', text: 'こんにちは！', translation: 'Hello!', choices: null },
                    { character: '👩‍🎓 Classmate', text: 'こんにちは！元気ですか？', translation: 'Hello! How are you?', choices: [
                        { text: '元気です！', translation: "I'm fine!", next: 'ch2a' },
                        { text: '少し疲れています', translation: "I'm a little tired", next: 'ch2b' }
                    ]}
                ]
            },
            {
                id: 'ch2a',
                scene: '😊 Happy Response',
                dialogue: [
                    { character: '👨‍🎓 You', text: '元気です！', translation: "I'm fine!", choices: null },
                    { character: '👩‍🎓 Classmate', text: '良かった！一緒に教室に行きましょう。', translation: 'Great! Let\'s go to the classroom together.', choices: [
                        { text: 'はい、お願いします', translation: 'Yes, please', next: 'ch3' }
                    ]}
                ]
            },
            {
                id: 'ch2b',
                scene: '😴 Tired Response',
                dialogue: [
                    { character: '👨‍🎓 You', text: '少し疲れています', translation: "I'm a little tired", choices: null },
                    { character: '👩‍🎓 Classmate', text: '大丈夫ですか？', translation: 'Are you okay?', choices: [
                        { text: 'はい、大丈夫です', translation: 'Yes, I\'m okay', next: 'ch3' }
                    ]}
                ]
            },
            {
                id: 'ch3',
                scene: '📚 Classroom',
                dialogue: [
                    { character: '👨‍🏫 Teacher', text: 'おはようございます！', translation: 'Good morning!', choices: null },
                    { character: '👨‍🎓 You', text: 'おはようございます！', translation: 'Good morning!', choices: null },
                    { character: '👨‍🏫 Teacher', text: '今日は日本語を勉強します。', translation: 'Today we will study Japanese.', choices: [
                        { text: 'はい、分かりました', translation: 'Yes, I understand', next: 'end' }
                    ]}
                ]
            }
        ]
    },
    {
        id: 'story-2',
        title: 'レストランで (At the Restaurant)',
        description: 'Ordering food at a Japanese restaurant',
        theme: 'food',
        unlocked: false,
        chapters: [
            {
                id: 'ch1',
                scene: '🍱 Restaurant',
                dialogue: [
                    { character: '👨‍🍳 Waiter', text: 'いらっしゃいませ！', translation: 'Welcome!', choices: null },
                    { character: '👨‍🎓 You', text: 'こんにちは', translation: 'Hello', choices: null },
                    { character: '👨‍🍳 Waiter', text: '何にしますか？', translation: 'What would you like?', choices: [
                        { text: 'ラーメンをください', translation: 'Ramen, please', next: 'ch2a' },
                        { text: '寿司をください', translation: 'Sushi, please', next: 'ch2b' }
                    ]}
                ]
            },
            {
                id: 'ch2a',
                scene: '🍜 Ramen Order',
                dialogue: [
                    { character: '👨‍🎓 You', text: 'ラーメンをください', translation: 'Ramen, please', choices: null },
                    { character: '👨‍🍳 Waiter', text: 'かしこまりました！', translation: 'Understood!', choices: [
                        { text: 'ありがとうございます', translation: 'Thank you', next: 'end' }
                    ]}
                ]
            },
            {
                id: 'ch2b',
                scene: '🍣 Sushi Order',
                dialogue: [
                    { character: '👨‍🎓 You', text: '寿司をください', translation: 'Sushi, please', choices: null },
                    { character: '👨‍🍳 Waiter', text: 'かしこまりました！', translation: 'Understood!', choices: [
                        { text: 'ありがとうございます', translation: 'Thank you', next: 'end' }
                    ]}
                ]
            }
        ]
    },
    {
        id: 'story-3',
        title: '友達と (With Friends)',
        description: 'Hanging out with friends',
        theme: 'friendship',
        unlocked: false,
        chapters: [
            {
                id: 'ch1',
                scene: '🌳 Park',
                dialogue: [
                    { character: '👥 Friend', text: '今日はいい天気ですね！', translation: 'Nice weather today!', choices: null },
                    { character: '👨‍🎓 You', text: 'そうですね！', translation: 'Yes, it is!', choices: null },
                    { character: '👥 Friend', text: '一緒に遊びましょう！', translation: 'Let\'s play together!', choices: [
                        { text: 'いいですね！', translation: 'Sounds good!', next: 'end' }
                    ]}
                ]
            }
        ]
    }
];

let currentStory = null;
let currentChapter = null;
let storyProgress = {};
let wordsLearned = [];

export async function init() {
    console.log('StoryPage.init called');
    loadStoryProgress();
}

export async function load() {
    console.log('StoryPage.load called');
    loadStoryProgress();
    renderStoryHub();
}

function loadStoryProgress() {
    const saved = localStorage.getItem('storyProgress');
    if (saved) {
        storyProgress = JSON.parse(saved);
    }
    
    // Unlock stories based on progress
    updateStoryUnlocks();
}

function updateStoryUnlocks() {
    // Story 1 is always unlocked
    // Story 2 unlocks after completing story 1
    if (storyProgress['story-1']?.completed) {
        const story2 = STORIES.find(s => s.id === 'story-2');
        if (story2) story2.unlocked = true;
    }
    
    // Story 3 unlocks after completing story 2
    if (storyProgress['story-2']?.completed) {
        const story3 = STORIES.find(s => s.id === 'story-3');
        if (story3) story3.unlocked = true;
    }
}

function renderStoryHub() {
    const storyContent = document.getElementById('storyContent');
    if (!storyContent) return;
    
    storyContent.innerHTML = `
        <div class="story-hub">
            <div class="story-header glass">
                <h2>📖 Story Mode</h2>
                <p>Learn Japanese through interactive anime-style stories!</p>
            </div>
            
            <div class="stories-grid">
                ${STORIES.map(story => renderStoryCard(story)).join('')}
            </div>
        </div>
    `;
}

function renderStoryCard(story) {
    const progress = storyProgress[story.id];
    const isCompleted = progress?.completed || false;
    const completionRate = progress ? Math.round((progress.chaptersCompleted / story.chapters.length) * 100) : 0;
    
    return `
        <div class="story-card ${isCompleted ? 'completed' : ''} ${!story.unlocked ? 'locked' : ''}" 
             onclick="${story.unlocked ? `window.storyPage.startStory('${story.id}')` : ''}">
            <div class="story-icon">${getStoryIcon(story.theme)}</div>
            <div class="story-info">
                <h3 class="story-title">${escapeHtml(story.title)}</h3>
                <p class="story-description">${escapeHtml(story.description)}</p>
                ${progress ? `
                    <div class="story-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${completionRate}%"></div>
                        </div>
                        <span class="progress-text">${completionRate}%</span>
                    </div>
                ` : ''}
            </div>
            ${!story.unlocked ? `
                <div class="story-locked">
                    <span>🔒 Locked</span>
                </div>
            ` : isCompleted ? `
                <div class="story-completed">
                    <span>✓ Completed</span>
                </div>
            ` : ''}
        </div>
    `;
}

function getStoryIcon(theme) {
    const icons = {
        school: '🏫',
        food: '🍱',
        friendship: '🤝',
        adventure: '🗺️',
        action: '⚔️'
    };
    return icons[theme] || '📖';
}

export function startStory(storyId) {
    const story = STORIES.find(s => s.id === storyId);
    if (!story || !story.unlocked) {
        showError('Story not available');
        return;
    }
    
    currentStory = story;
    currentChapter = story.chapters[0];
    wordsLearned = [];
    
    renderStory();
}

function renderStory() {
    const storyContent = document.getElementById('storyContent');
    if (!storyContent || !currentStory || !currentChapter) return;
    
    const dialogueHTML = currentChapter.dialogue.map((line, idx) => {
        if (line.choices) {
            return `
                <div class="dialogue-line">
                    <div class="character-name">${line.character}</div>
                    <div class="dialogue-text">
                        <div class="japanese-text">${escapeHtml(line.text)}</div>
                        <div class="translation-text">${escapeHtml(line.translation)}</div>
                    </div>
                    <button class="premium-btn audio-btn" onclick="window.speakJapanese && window.speakJapanese('${escapeHtml(line.text)}')">
                        🔊 Listen
                    </button>
                    <div class="dialogue-choices">
                        ${line.choices.map(choice => `
                            <button class="choice-btn" onclick="window.storyPage.selectChoice('${choice.next}')">
                                <span class="choice-japanese">${escapeHtml(choice.text)}</span>
                                <span class="choice-translation">${escapeHtml(choice.translation)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="dialogue-line">
                    <div class="character-name">${line.character}</div>
                    <div class="dialogue-text">
                        <div class="japanese-text">${escapeHtml(line.text)}</div>
                        <div class="translation-text">${escapeHtml(line.translation)}</div>
                    </div>
                    <button class="premium-btn audio-btn small" onclick="speakJapanese('${escapeHtml(line.text)}')">
                        🔊
                    </button>
                </div>
            `;
        }
    }).join('');
    
    storyContent.innerHTML = `
        <div class="story-container">
            <div class="story-header-bar">
                <button class="premium-btn secondary" onclick="window.storyPage.load()">← Back to Stories</button>
                <h3 class="story-title">${escapeHtml(currentStory.title)}</h3>
                <div class="story-progress-indicator">
                    Chapter ${currentStory.chapters.findIndex(c => c.id === currentChapter.id) + 1} / ${currentStory.chapters.length}
                </div>
            </div>
            
            <div class="story-scene">
                <div class="scene-icon">${currentChapter.scene}</div>
                <h2 class="scene-title">${escapeHtml(currentChapter.scene)}</h2>
            </div>
            
            <div class="story-dialogue">
                ${dialogueHTML}
            </div>
            
            <div class="words-learned" id="wordsLearned">
                ${wordsLearned.length > 0 ? `
                    <h4>Words Learned:</h4>
                    <div class="words-list">
                        ${wordsLearned.map(word => `
                            <span class="word-badge">${escapeHtml(word)}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Extract words from dialogue
    extractWordsFromDialogue();
}

function extractWordsFromDialogue() {
    if (!currentChapter) return;
    
    currentChapter.dialogue.forEach(line => {
        // Simple word extraction (in a real app, this would be more sophisticated)
        const words = line.text.split(/[、。！？\s]+/).filter(w => w.length > 0);
        words.forEach(word => {
            if (!wordsLearned.includes(word)) {
                wordsLearned.push(word);
            }
        });
    });
    
    // Update words learned display
    const wordsEl = document.getElementById('wordsLearned');
    if (wordsEl && wordsLearned.length > 0) {
        wordsEl.innerHTML = `
            <h4>Words Learned:</h4>
            <div class="words-list">
                ${wordsLearned.map(word => `
                    <span class="word-badge">${escapeHtml(word)}</span>
                `).join('')}
            </div>
        `;
    }
}

export function selectChoice(nextChapterId) {
    if (!currentStory) return;
    
    const nextChapter = currentStory.chapters.find(c => c.id === nextChapterId);
    if (!nextChapter) {
        // Story ended
        completeStory();
        return;
    }
    
    currentChapter = nextChapter;
    renderStory();
}

function completeStory() {
    if (!currentStory) return;
    
    // Save progress
    if (!storyProgress[currentStory.id]) {
        storyProgress[currentStory.id] = {
            completed: true,
            chaptersCompleted: currentStory.chapters.length,
            completedAt: Date.now(),
            wordsLearned: wordsLearned.length
        };
    } else {
        storyProgress[currentStory.id].completed = true;
        storyProgress[currentStory.id].chaptersCompleted = currentStory.chapters.length;
    }
    
    localStorage.setItem('storyProgress', JSON.stringify(storyProgress));
    
    // Award XP
    if (window.xpService) {
        window.xpService.addXP(100, `Completed story: ${currentStory.title}`);
    }
    
    // Show completion screen
    const storyContent = document.getElementById('storyContent');
    if (storyContent) {
        storyContent.innerHTML = `
            <div class="story-completion">
                <div class="completion-icon">🎉</div>
                <h2>Story Complete!</h2>
                <p class="completion-title">${escapeHtml(currentStory.title)}</p>
                <div class="completion-stats">
                    <div class="stat-item">
                        <span class="stat-value">${wordsLearned.length}</span>
                        <span class="stat-label">Words Learned</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">+100</span>
                        <span class="stat-label">XP Earned</span>
                    </div>
                </div>
                <div class="completion-actions">
                    <button class="premium-btn" onclick="window.storyPage.load()">Back to Stories</button>
                    ${getNextStory() ? `
                        <button class="premium-btn" onclick="window.storyPage.startStory('${getNextStory().id}')">
                            Next Story →
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Show celebration
    if (window.celebrationService) {
        window.celebrationService.celebrate(`Story Complete: ${currentStory.title}! 📖`, 'achievement');
    }
    
    // Update unlocks
    updateStoryUnlocks();
}

function getNextStory() {
    const currentIndex = STORIES.findIndex(s => s.id === currentStory.id);
    if (currentIndex < STORIES.length - 1) {
        return STORIES[currentIndex + 1];
    }
    return null;
}

// Export for global access
window.storyPage = {
    init,
    load,
    startStory,
    selectChoice
};

