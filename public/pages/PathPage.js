// Learning Path Page Component
import api from '../utils/api.js';
import { showLoading, showError, escapeHtml } from '../utils/helpers.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';
// Core systems available via window.stateManager, window.eventBus, window.apiClient

let learningPlan = [];
let learningPlanLoading = false;
let learningPlanLoaded = false;

export async function init() {
    // Don't load immediately - only when page is accessed
    const skillTreeEl = document.getElementById('skillTree');
    if (skillTreeEl) {
        showLoading(skillTreeEl, 'Loading your learning path...');
    }
}

export async function load() {
    await loadLearningPlan();
    renderSkillTree();
}

async function loadLearningPlan() {
    if (learningPlanLoading) {
        console.log('Learning plan already loading...');
        return;
    }
    
    if (learningPlanLoaded && learningPlan.length > 0) {
        console.log('Learning plan already loaded');
        return;
    }
    
    learningPlanLoading = true;
    
    try {
        console.log('Loading learning plan...');
        // Use apiClient if available, otherwise fall back to api
        // Note: server endpoint is /api/learning-plan
        const data = window.apiClient 
            ? await window.apiClient.get('/api/learning-plan')
            : await api.get('/api/learning-plan');
        
        if (data.plan && Array.isArray(data.plan) && data.plan.length > 0) {
            learningPlan = data.plan;
            learningPlanLoaded = true;
            console.log('Learning plan loaded:', learningPlan.length, 'days');
        } else {
            console.warn('Learning plan is empty or invalid:', data);
            learningPlan = [];
        }
    } catch (error) {
        console.error('Error loading learning plan:', error);
        learningPlan = [];
        const skillTreeEl = document.getElementById('skillTree');
        if (skillTreeEl) {
            skillTreeEl.innerHTML = `
                <div class="empty-state">
                    <h2>⚠️ Error Loading Learning Plan</h2>
                    <p>${escapeHtml(error.message)}</p>
                    <button class="premium-btn" onclick="window.pathPage.retry()">Retry</button>
                </div>
            `;
        }
    } finally {
        learningPlanLoading = false;
    }
}

export function renderSkillTree() {
    const skillTreeEl = document.getElementById('skillTree');
    if (!skillTreeEl) return;
    
    // If plan not loaded, load it first
    if (!learningPlanLoaded && !learningPlanLoading) {
        showLoading(skillTreeEl, 'Loading learning path...');
        loadLearningPlan().then(() => {
            if (learningPlan.length > 0) {
                renderSkillTree();
            }
        });
        return;
    }
    
    // If still loading, show loading state
    if (learningPlanLoading) {
        showLoading(skillTreeEl, 'Loading learning path...');
        return;
    }
    
    // If plan is empty after loading, show error
    if (learningPlan.length === 0) {
        skillTreeEl.innerHTML = `
            <div class="empty-state">
                <h2>No Learning Plan Available</h2>
                <p>Unable to load the learning plan. Please check your connection and try again.</p>
                <button class="premium-btn" onclick="window.pathPage.retry()">Retry</button>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    const startDate = localStorage.getItem('startDate');
    let daysSinceStart = 0;
    
    if (startDate) {
        daysSinceStart = Math.floor((today - new Date(startDate)) / (1000 * 60 * 60 * 24));
    } else {
        localStorage.setItem('startDate', today.toDateString());
    }
    
    const currentDay = daysSinceStart + 1;
    const completedDays = Object.keys(studyStats.dayProgress).filter(d => 
        studyStats.dayProgress[d].completed
    ).length;
    
    const daysCompletedEl = document.getElementById('daysCompleted');
    if (daysCompletedEl) daysCompletedEl.textContent = completedDays;
    
    skillTreeEl.innerHTML = learningPlan.map((lesson, index) => {
        const isUnlocked = index === 0 || learningPlan[index - 1].day <= currentDay || 
                          studyStats.dayProgress[learningPlan[index - 1].day]?.completed;
        const isCompleted = studyStats.dayProgress[lesson.day]?.completed || false;
        const isCurrent = lesson.day === currentDay;
        const progress = studyStats.dayProgress[lesson.day]?.progress || 0;
        const skillId = `day-${lesson.day}`;
        const crownLevel = getCrownLevel(skillId);
        const crowns = '👑'.repeat(crownLevel);
        
        let icon = '📚';
        if (lesson.type === 'hiragana') icon = 'あ';
        else if (lesson.type === 'katakana') icon = 'カ';
        else if (lesson.type === 'vocabulary') icon = '📖';
        
        return `
            <div class="skill-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}" 
                 data-day="${lesson.day}" data-type="${lesson.type}">
                <div class="skill-icon">${icon}</div>
                <div class="skill-info">
                    <div class="skill-title">
                        Day ${lesson.day}: ${lesson.title}
                        ${crowns ? `<span class="skill-crowns">${crowns}</span>` : ''}
                    </div>
                    <div class="skill-description">${lesson.description}</div>
                    ${lesson.type === 'vocabulary' ? `<div class="skill-meta">${lesson.wordCount} words</div>` : ''}
                    ${lesson.type === 'hiragana' || lesson.type === 'katakana' ? `<div class="skill-meta">${lesson.characterCount} characters</div>` : ''}
                    <div class="skill-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(progress)}%</span>
                    </div>
                </div>
                ${isUnlocked ? `<button class="premium-btn skill-btn" onclick="window.pathPage.startLesson(${lesson.day}, '${lesson.type}')">
                    ${isCompleted ? 'Review' : isCurrent ? 'Start' : 'Continue'}
                </button>` : '<div class="skill-locked">🔒</div>'}
            </div>
        `;
    }).join('');
}

function getCrownLevel(skillId) {
    return studyStats.skillProgress[skillId]?.crownLevel || 0;
}

export function startLesson(day, type) {
    const skillId = `day-${day}`;
    
    // Check if user wants to practice (exercise mode) or study
    if (type === 'hiragana' || type === 'katakana') {
        // Start kana exercise session
        if (window.exercisePage) {
            window.exercisePage.startExerciseSession(skillId, 'kana');
        }
    } else {
        // Start vocabulary exercise session
        if (window.exercisePage) {
            window.exercisePage.startExerciseSession(skillId, 'vocabulary');
        }
    }
    
    // Also mark lesson as started
    completeLesson(skillId);
}

function completeLesson(skillId) {
    if (!studyStats.skillProgress[skillId]) {
        studyStats.skillProgress[skillId] = { crownLevel: 0, lessonsCompleted: 0, strength: 100 };
    }
    
    studyStats.skillProgress[skillId].lessonsCompleted++;
    studyStats.skillProgress[skillId].lastPractice = Date.now();
    studyStats.skillProgress[skillId].strength = 100;
    
    saveStudyStats();
}

export function retry() {
    learningPlanLoaded = false;
    learningPlan = [];
    loadLearningPlan().then(() => {
        renderSkillTree();
    });
}

export function updateDayProgress(day, progress, completed = false) {
    if (!studyStats.dayProgress[day]) {
        studyStats.dayProgress[day] = { progress: 0, completed: false };
    }
    studyStats.dayProgress[day].progress = Math.max(studyStats.dayProgress[day].progress, progress);
    if (completed) {
        studyStats.dayProgress[day].completed = true;
        if (window.xpService) {
            window.xpService.addXP(10, `Completed Day ${day}`);
        }
    }
    saveStudyStats();
    
    renderSkillTree();
}

export function getLearningPlan() {
    return learningPlan;
}

// Export for global access
window.pathPage = { load, renderSkillTree, startLesson, retry, updateDayProgress, getLearningPlan };

