// Mascot Service - Anime character that guides and motivates users
import { studyStats } from './studyStats.js';

const MASCOTS = {
    default: {
        name: 'Yuki',
        emoji: '🌸',
        personality: 'cheerful',
        messages: {
            welcome: 'こんにちは！一緒に日本語を勉強しましょう！',
            welcomeTranslation: 'Hello! Let\'s study Japanese together!',
            correct: ['すごい！', '完璧！', 'よくできました！'],
            correctTranslation: ['Amazing!', 'Perfect!', 'Well done!'],
            wrong: ['大丈夫！もう一度試してみましょう！', '頑張って！'],
            wrongTranslation: ['It\'s okay! Let\'s try again!', 'Do your best!'],
            levelUp: 'レベルアップおめでとう！',
            levelUpTranslation: 'Congratulations on leveling up!',
            achievement: 'おめでとうございます！',
            achievementTranslation: 'Congratulations!',
            streak: '🔥 すごい連続記録！',
            streakTranslation: '🔥 Amazing streak!',
            challenge: 'チャレンジを始めましょう！',
            challengeTranslation: 'Let\'s start the challenge!',
            motivation: ['毎日少しずつ！', '継続は力なり！', '一緒に頑張りましょう！'],
            motivationTranslation: ['Little by little every day!', 'Persistence is power!', 'Let\'s do our best together!']
        }
    },
    excited: {
        name: 'Sakura',
        emoji: '🌸',
        personality: 'excited',
        messages: {
            welcome: 'やったー！新しいレッスンだ！',
            welcomeTranslation: 'Yay! A new lesson!',
            correct: ['やったー！', '完璧すぎる！', '天才！'],
            correctTranslation: ['Yay!', 'Too perfect!', 'Genius!'],
            wrong: ['次は大丈夫！', '一緒に頑張ろう！'],
            wrongTranslation: ['Next time will be fine!', 'Let\'s do our best together!']
        }
    },
    calm: {
        name: 'Kenji',
        emoji: '🎌',
        personality: 'calm',
        messages: {
            welcome: '落ち着いて、ゆっくり学びましょう。',
            welcomeTranslation: 'Stay calm, let\'s learn slowly.',
            correct: ['良いですね。', '素晴らしい。', '続けましょう。'],
            correctTranslation: ['Good.', 'Wonderful.', 'Let\'s continue.']
        }
    }
};

let currentMascot = MASCOTS.default;
let mascotState = {
    visible: true,
    position: 'bottom-right',
    mood: 'happy',
    lastInteraction: Date.now()
};

export function getMascot() {
    return {
        ...currentMascot,
        state: mascotState
    };
}

export function setMascot(mascotKey) {
    if (MASCOTS[mascotKey]) {
        currentMascot = MASCOTS[mascotKey];
        updateMascotDisplay();
    }
}

export function showMascotMessage(type, customMessage = null) {
    const message = customMessage || getRandomMessage(type);
    displayMascotMessage(message);
    
    // Update mascot mood based on message type
    if (type === 'correct' || type === 'levelUp' || type === 'achievement') {
        mascotState.mood = 'happy';
        animateMascot('celebrate');
    } else if (type === 'wrong') {
        mascotState.mood = 'encouraging';
        animateMascot('encourage');
    } else {
        mascotState.mood = 'neutral';
    }
    
    mascotState.lastInteraction = Date.now();
}

function getRandomMessage(type) {
    const messages = currentMascot.messages[type];
    if (Array.isArray(messages)) {
        return {
            japanese: messages[Math.floor(Math.random() * messages.length)],
            translation: currentMascot.messages[`${type}Translation`]?.[Math.floor(Math.random() * (currentMascot.messages[`${type}Translation`]?.length || 1))]
        };
    }
    return {
        japanese: messages || '',
        translation: currentMascot.messages[`${type}Translation`] || ''
    };
}

function displayMascotMessage(message) {
    const mascotContainer = getOrCreateMascotContainer();
    
    // Update mascot bubble
    const bubble = mascotContainer.querySelector('.mascot-bubble');
    if (bubble) {
        bubble.innerHTML = `
            <div class="mascot-message-japanese">${message.japanese}</div>
            ${message.translation ? `<div class="mascot-message-translation">${message.translation}</div>` : ''}
        `;
        bubble.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            bubble.classList.remove('show');
        }, 5000);
    }
    
    // Animate mascot
    animateMascot('speak');
}

function getOrCreateMascotContainer() {
    let container = document.getElementById('mascotContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mascotContainer';
        container.className = 'mascot-container';
        container.innerHTML = `
            <div class="mascot-character" id="mascotCharacter">
                <div class="mascot-emoji">${currentMascot.emoji}</div>
                <div class="mascot-name">${currentMascot.name}</div>
            </div>
            <div class="mascot-bubble" id="mascotBubble">
                <div class="mascot-message-japanese"></div>
                <div class="mascot-message-translation"></div>
            </div>
        `;
        document.body.appendChild(container);
    }
    return container;
}

function animateMascot(animation) {
    const character = document.getElementById('mascotCharacter');
    if (!character) return;
    
    character.classList.remove('celebrate', 'encourage', 'speak', 'bounce');
    character.classList.add(animation);
    
    setTimeout(() => {
        character.classList.remove(animation);
    }, 1000);
}

function updateMascotDisplay() {
    const emoji = document.querySelector('#mascotCharacter .mascot-emoji');
    const name = document.querySelector('#mascotCharacter .mascot-name');
    if (emoji) emoji.textContent = currentMascot.emoji;
    if (name) name.textContent = currentMascot.name;
}

// Auto-show motivational messages
setInterval(() => {
    if (mascotState.visible && Date.now() - mascotState.lastInteraction > 30000) {
        // Show random motivation every 30 seconds if idle
        const motivation = getRandomMessage('motivation');
        if (motivation.japanese) {
            displayMascotMessage(motivation);
        }
    }
}, 30000);

// React to user actions
export function reactToAction(action, data = {}) {
    switch (action) {
        case 'correct':
            showMascotMessage('correct');
            break;
        case 'wrong':
            showMascotMessage('wrong');
            break;
        case 'levelUp':
            showMascotMessage('levelUp');
            break;
        case 'achievement':
            showMascotMessage('achievement');
            break;
        case 'streak':
            showMascotMessage('streak');
            break;
        case 'challenge':
            showMascotMessage('challenge');
            break;
        default:
            showMascotMessage('motivation');
    }
}

// Initialize mascot on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            showMascotMessage('welcome');
        }, 1000);
    });
}

// Export for global access
window.mascotService = {
    getMascot,
    setMascot,
    showMascotMessage,
    reactToAction
};

