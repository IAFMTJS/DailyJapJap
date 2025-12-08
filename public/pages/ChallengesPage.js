// Challenges Page Component - Daily and weekly challenges
import { studyStats, saveStudyStats } from '../services/studyStats.js';
import { showError, escapeHtml } from '../utils/helpers.js';

let dailyChallenges = [];
let weeklyChallenges = [];
let challengeProgress = {};

// Initialize challenges
function initializeChallenges() {
    if (!localStorage.getItem('challengeProgress')) {
        localStorage.setItem('challengeProgress', JSON.stringify({}));
    }
    challengeProgress = JSON.parse(localStorage.getItem('challengeProgress') || '{}');
    
    // Check if daily challenges need reset
    const lastReset = localStorage.getItem('dailyChallengesReset');
    const today = new Date().toDateString();
    if (lastReset !== today) {
        generateDailyChallenges();
        localStorage.setItem('dailyChallengesReset', today);
    } else {
        loadDailyChallenges();
    }
    
    // Check if weekly challenges need reset
    const lastWeekReset = localStorage.getItem('weeklyChallengesReset');
    const weekStart = getWeekStart();
    if (lastWeekReset !== weekStart) {
        generateWeeklyChallenges();
        localStorage.setItem('weeklyChallengesReset', weekStart);
    } else {
        loadWeeklyChallenges();
    }
}

function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day; // Sunday = 0
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toDateString();
}

function generateDailyChallenges() {
    dailyChallenges = [
        {
            id: 'daily-1',
            type: 'xp',
            title: 'Daily XP Goal',
            description: 'Earn 100 XP today',
            target: 100,
            current: 0,
            reward: { xp: 20, coins: 10 },
            icon: '⭐'
        },
        {
            id: 'daily-2',
            type: 'streak',
            title: 'Maintain Streak',
            description: 'Practice for 3 days in a row',
            target: 3,
            current: studyStats.studyStreak || 0,
            reward: { xp: 30, coins: 15 },
            icon: '🔥'
        },
        {
            id: 'daily-3',
            type: 'perfect',
            title: 'Perfect Lesson',
            description: 'Complete a lesson with 100% accuracy',
            target: 1,
            current: 0,
            reward: { xp: 50, coins: 25 },
            icon: '💯'
        },
        {
            id: 'daily-4',
            type: 'words',
            title: 'Word Master',
            description: 'Master 5 new words today',
            target: 5,
            current: 0,
            reward: { xp: 40, coins: 20 },
            icon: '📚'
        },
        {
            id: 'daily-5',
            type: 'games',
            title: 'Game Time',
            description: 'Play 3 games',
            target: 3,
            current: 0,
            reward: { xp: 25, coins: 12 },
            icon: '🎮'
        }
    ];
    
    localStorage.setItem('dailyChallenges', JSON.stringify(dailyChallenges));
}

function loadDailyChallenges() {
    const saved = localStorage.getItem('dailyChallenges');
    if (saved) {
        dailyChallenges = JSON.parse(saved);
        updateChallengeProgress();
    } else {
        generateDailyChallenges();
    }
}

function generateWeeklyChallenges() {
    weeklyChallenges = [
        {
            id: 'weekly-1',
            type: 'xp',
            title: 'Weekly XP Master',
            description: 'Earn 1000 XP this week',
            target: 1000,
            current: 0,
            reward: { xp: 200, coins: 100 },
            icon: '🌟'
        },
        {
            id: 'weekly-2',
            type: 'chapters',
            title: 'Chapter Explorer',
            description: 'Complete 2 chapters this week',
            target: 2,
            current: 0,
            reward: { xp: 300, coins: 150 },
            icon: '📖'
        },
        {
            id: 'weekly-3',
            type: 'perfect',
            title: 'Perfectionist',
            description: 'Get 5 perfect lessons this week',
            target: 5,
            current: 0,
            reward: { xp: 250, coins: 125 },
            icon: '💎'
        },
        {
            id: 'weekly-4',
            type: 'streak',
            title: 'Dedicated Learner',
            description: 'Maintain a 7-day streak',
            target: 7,
            current: studyStats.studyStreak || 0,
            reward: { xp: 400, coins: 200 },
            icon: '🔥🔥'
        }
    ];
    
    localStorage.setItem('weeklyChallenges', JSON.stringify(weeklyChallenges));
}

function loadWeeklyChallenges() {
    const saved = localStorage.getItem('weeklyChallenges');
    if (saved) {
        weeklyChallenges = JSON.parse(saved);
        updateChallengeProgress();
    } else {
        generateWeeklyChallenges();
    }
}

function updateChallengeProgress() {
    // Update daily challenge progress
    dailyChallenges.forEach(challenge => {
        switch (challenge.type) {
            case 'xp':
                challenge.current = studyStats.dailyXP || 0;
                break;
            case 'streak':
                challenge.current = studyStats.studyStreak || 0;
                break;
            case 'perfect':
                challenge.current = challengeProgress[challenge.id]?.current || 0;
                break;
            case 'words':
                challenge.current = challengeProgress[challenge.id]?.current || 0;
                break;
            case 'games':
                challenge.current = challengeProgress[challenge.id]?.current || 0;
                break;
        }
    });
    
    // Update weekly challenge progress
    weeklyChallenges.forEach(challenge => {
        switch (challenge.type) {
            case 'xp':
                challenge.current = challengeProgress[challenge.id]?.current || 0;
                break;
            case 'chapters':
                if (window.chapterService) {
                    const stats = window.chapterService.getChapterStats();
                    challenge.current = stats.completed;
                }
                break;
            case 'perfect':
                challenge.current = challengeProgress[challenge.id]?.current || 0;
                break;
            case 'streak':
                challenge.current = studyStats.studyStreak || 0;
                break;
        }
    });
    
    localStorage.setItem('dailyChallenges', JSON.stringify(dailyChallenges));
    localStorage.setItem('weeklyChallenges', JSON.stringify(weeklyChallenges));
}

export function recordChallengeProgress(challengeType, amount = 1) {
    updateChallengeProgress();
    
    // Update relevant challenges
    [...dailyChallenges, ...weeklyChallenges].forEach(challenge => {
        if (challenge.type === challengeType && !challenge.completed) {
            challenge.current = Math.min(challenge.current + amount, challenge.target);
            
            if (challenge.current >= challenge.target) {
                completeChallenge(challenge);
            }
        }
    });
    
    localStorage.setItem('dailyChallenges', JSON.stringify(dailyChallenges));
    localStorage.setItem('weeklyChallenges', JSON.stringify(weeklyChallenges));
}

function completeChallenge(challenge) {
    if (challenge.completed) return;
    
    challenge.completed = true;
    challenge.completedAt = Date.now();
    
    // Award rewards
    if (window.xpService && challenge.reward.xp) {
        window.xpService.addXP(challenge.reward.xp, `Challenge: ${challenge.title}`);
    }
    
    // Show celebration
    if (window.celebrationService) {
        window.celebrationService.celebrate(
            `Challenge Complete: ${challenge.title}! 🎉`,
            'achievement'
        );
    }
    
    // Update stats
    if (!studyStats.challengesCompleted) {
        studyStats.challengesCompleted = 0;
    }
    studyStats.challengesCompleted++;
    saveStudyStats();
}

export async function init() {
    console.log('ChallengesPage.init called');
    initializeChallenges();
}

export async function load() {
    console.log('ChallengesPage.load called');
    initializeChallenges();
    updateChallengeProgress();
    renderChallenges();
}

function renderChallenges() {
    const challengesContent = document.getElementById('challengesContent');
    if (!challengesContent) return;
    
    challengesContent.innerHTML = `
        <div class="challenges-container">
            <div class="challenges-header glass">
                <h2>💪 Challenges</h2>
                <p>Complete challenges to earn rewards and level up faster!</p>
            </div>
            
            <div class="challenges-tabs">
                <button class="challenge-tab active" onclick="window.challengesPage.showTab('daily')">Daily</button>
                <button class="challenge-tab" onclick="window.challengesPage.showTab('weekly')">Weekly</button>
            </div>
            
            <div class="challenges-list" id="challengesList">
                ${renderDailyChallenges()}
            </div>
        </div>
    `;
}

function renderDailyChallenges() {
    return `
        <div class="challenges-section">
            <h3 class="section-title">📅 Daily Challenges</h3>
            <p class="section-subtitle">Reset every day at midnight</p>
            <div class="challenge-cards">
                ${dailyChallenges.map(challenge => renderChallengeCard(challenge)).join('')}
            </div>
        </div>
    `;
}

function renderWeeklyChallenges() {
    return `
        <div class="challenges-section">
            <h3 class="section-title">📆 Weekly Challenges</h3>
            <p class="section-subtitle">Reset every Monday</p>
            <div class="challenge-cards">
                ${weeklyChallenges.map(challenge => renderChallengeCard(challenge)).join('')}
            </div>
        </div>
    `;
}

function renderChallengeCard(challenge) {
    const progress = Math.min((challenge.current / challenge.target) * 100, 100);
    const isCompleted = challenge.completed || challenge.current >= challenge.target;
    
    return `
        <div class="challenge-card ${isCompleted ? 'completed' : ''}">
            <div class="challenge-header">
                <div class="challenge-icon">${challenge.icon}</div>
                <div class="challenge-info">
                    <h4 class="challenge-title">${escapeHtml(challenge.title)}</h4>
                    <p class="challenge-description">${escapeHtml(challenge.description)}</p>
                </div>
            </div>
            
            <div class="challenge-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-text">
                    ${challenge.current} / ${challenge.target}
                </div>
            </div>
            
            <div class="challenge-reward">
                <span class="reward-item">+${challenge.reward.xp} XP</span>
                ${challenge.reward.coins ? `<span class="reward-item">+${challenge.reward.coins} 🪙</span>` : ''}
            </div>
            
            ${isCompleted ? `
                <div class="challenge-completed">
                    <span>✓ Completed!</span>
                </div>
            ` : ''}
        </div>
    `;
}

export function showTab(tab) {
    const challengesList = document.getElementById('challengesList');
    if (!challengesList) return;
    
    // Update tabs
    document.querySelectorAll('.challenge-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show appropriate challenges
    if (tab === 'daily') {
        challengesList.innerHTML = renderDailyChallenges();
    } else {
        challengesList.innerHTML = renderWeeklyChallenges();
    }
}

// Export for global access
window.challengesPage = {
    init,
    load,
    showTab,
    recordChallengeProgress
};

