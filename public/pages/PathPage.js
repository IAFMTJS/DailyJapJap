// Learning Path Page Component
import api from '../utils/api.js';
import { showLoading, showError, escapeHtml } from '../utils/helpers.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';
// Core systems available via window.stateManager, window.eventBus, window.apiClient

// Update all skill strengths on load
if (window.skillStrengthService) {
    window.skillStrengthService.updateAllSkillStrengths();
}

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
    
    // Check if we should show chapter-based path or day-based path
    const useChapters = window.chapterService && window.chapterService.getAllChapters;
    
    if (useChapters) {
        renderChapterBasedPath(skillTreeEl);
        return;
    }
    
    // Original day-based path (fallback)
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
    
    // Get weak skills for practice suggestions
    const weakSkills = window.skillStrengthService ? window.skillStrengthService.getWeakSkills(10) : [];
    const weakSkillIds = new Set(weakSkills.map(s => s.skillId));
    
    skillTreeEl.innerHTML = learningPlan.map((lesson, index) => {
        const isUnlocked = index === 0 || learningPlan[index - 1].day <= currentDay || 
                          studyStats.dayProgress[learningPlan[index - 1].day]?.completed;
        const isCompleted = studyStats.dayProgress[lesson.day]?.completed || false;
        const isCurrent = lesson.day === currentDay;
        const progress = studyStats.dayProgress[lesson.day]?.progress || 0;
        const skillId = `day-${lesson.day}`;
        const crownLevel = getCrownLevel(skillId);
        const crowns = '👑'.repeat(crownLevel);
        
        // Get skill strength
        let strengthInfo = { strength: 0, isCracked: false, isWeak: false, needsPractice: false };
        if (window.skillStrengthService && isUnlocked) {
            strengthInfo = window.skillStrengthService.getSkillStrength(skillId);
        }
        
        const strengthColor = window.skillStrengthService ? 
            window.skillStrengthService.getStrengthColor(strengthInfo.strength) : '#6366f1';
        const strengthLabel = window.skillStrengthService ? 
            window.skillStrengthService.getStrengthLabel(strengthInfo.strength) : '';
        
        // Check if legendary (crown level 5+)
        const isLegendary = crownLevel >= 5;
        const isCracked = strengthInfo.isCracked;
        const isWeak = strengthInfo.isWeak && !isCracked;
        const needsPractice = strengthInfo.needsPractice;
        
        let icon = '📚';
        if (lesson.type === 'hiragana') icon = 'あ';
        else if (lesson.type === 'katakana') icon = 'カ';
        else if (lesson.type === 'vocabulary') icon = '📖';
        
        // Add cracked/weak classes
        let skillClasses = `${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`;
        if (isCracked) skillClasses += ' cracked';
        if (isWeak) skillClasses += ' weak';
        if (isLegendary) skillClasses += ' legendary';
        
        return `
            <div class="skill-node ${skillClasses}" 
                 data-day="${lesson.day}" data-type="${lesson.type}" data-skill-id="${skillId}">
                <div class="skill-icon">${icon}</div>
                <div class="skill-info">
                    <div class="skill-title">
                        Day ${lesson.day}: ${lesson.title}
                        ${crowns ? `<span class="skill-crowns">${crowns}</span>` : ''}
                        ${isLegendary ? '<span class="legendary-badge">💎 Legendary</span>' : ''}
                        ${isCracked ? '<span class="cracked-indicator">💔 Cracked</span>' : ''}
                    </div>
                    <div class="skill-description">${lesson.description}</div>
                    ${lesson.type === 'vocabulary' ? `<div class="skill-meta">${lesson.wordCount} words</div>` : ''}
                    ${lesson.type === 'hiragana' || lesson.type === 'katakana' ? `<div class="skill-meta">${lesson.characterCount} characters</div>` : ''}
                    
                    ${isUnlocked && window.skillStrengthService ? `
                        <div class="skill-strength ${strengthInfo.isCracked ? 'cracked' : strengthInfo.isWeak ? 'weak' : strengthInfo.strength >= 75 ? 'good' : 'strong'}">
                            <span class="strength-label">Strength: ${strengthLabel}</span>
                            <div class="skill-strength-meter">
                                <div class="skill-strength-fill" style="width: ${strengthInfo.strength}%; background-color: ${strengthColor};"></div>
                            </div>
                            <span class="strength-value">${strengthInfo.strength}%</span>
                            ${strengthInfo.daysSincePractice > 0 ? `<span class="days-since">${strengthInfo.daysSincePractice} day${strengthInfo.daysSincePractice > 1 ? 's' : ''} ago</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="skill-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(progress)}%</span>
                    </div>
                </div>
                <div class="skill-actions">
                    ${isUnlocked ? `
                        <button class="premium-btn skill-btn" onclick="window.pathPage.startLesson(${lesson.day}, '${lesson.type}')">
                            ${isCompleted ? 'Review' : isCurrent ? 'Start' : 'Continue'}
                        </button>
                        ${needsPractice ? `<button class="premium-btn skill-btn practice-btn" onclick="window.pathPage.practiceSkill('${skillId}', ${lesson.day}, '${lesson.type}')" title="Practice to strengthen">
                            💪 Practice
                        </button>` : ''}
                    ` : '<div class="skill-locked">🔒</div>'}
                </div>
            </div>
        `;
    }).join('');
    
    // Add practice suggestions section if there are weak skills
    if (weakSkills.length > 0) {
        const practiceSection = document.createElement('div');
        practiceSection.className = 'practice-suggestions glass';
        practiceSection.innerHTML = `
            <h3 class="section-title">💪 Skills Need Practice</h3>
            <p class="section-subtitle">These skills are getting weaker. Practice them to strengthen!</p>
            <div class="weak-skills-list">
                ${weakSkills.slice(0, 5).map(skill => {
                    const lesson = learningPlan.find(l => `day-${l.day}` === skill.skillId);
                    if (!lesson) return '';
                    const strengthColor = window.skillStrengthService.getStrengthColor(skill.strength);
                    return `
                        <div class="weak-skill-item">
                            <div class="weak-skill-info">
                                <span class="weak-skill-title">Day ${lesson.day}: ${lesson.title}</span>
                                <div class="weak-skill-strength">
                                    <div class="skill-strength-meter small">
                                        <div class="skill-strength-fill" style="width: ${skill.strength}%; background-color: ${strengthColor};"></div>
                                    </div>
                                    <span>${skill.strength}%</span>
                                </div>
                            </div>
                            <button class="premium-btn small" onclick="window.pathPage.practiceSkill('${skill.skillId}', ${lesson.day}, '${lesson.type}')">
                                Practice
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        skillTreeEl.insertBefore(practiceSection, skillTreeEl.firstChild);
    }
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

export function practiceSkill(skillId, day, type) {
    // Practice mode - focus on strengthening the skill
    console.log('Practicing skill:', skillId);
    
    // Update skill strength service that we're practicing
    if (window.skillStrengthService) {
        // Get current strength to show improvement
        const strengthInfo = window.skillStrengthService.getSkillStrength(skillId);
        
        // Show practice modal or notification
        if (strengthInfo.needsPractice) {
            showPracticeModal(skillId, day, type, strengthInfo);
        }
    }
    
    // Start exercise session for practice
    startLesson(day, type);
}

function showPracticeModal(skillId, day, type, strengthInfo) {
    const modal = document.createElement('div');
    modal.className = 'practice-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>💪 Practice Session</h3>
                <button class="modal-close" onclick="this.closest('.practice-modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <p>This skill is at <strong>${strengthInfo.strength}%</strong> strength.</p>
                <p>Practice now to strengthen it back up!</p>
                ${strengthInfo.daysSincePractice > 0 ? `<p class="days-info">Last practiced ${strengthInfo.daysSincePractice} day${strengthInfo.daysSincePractice > 1 ? 's' : ''} ago.</p>` : ''}
                <div class="strength-indicator">
                    <div class="skill-strength-meter">
                        <div class="skill-strength-fill" style="width: ${strengthInfo.strength}%; background-color: ${window.skillStrengthService.getStrengthColor(strengthInfo.strength)};"></div>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="premium-btn" onclick="window.pathPage.startLesson(${day}, '${type}'); this.closest('.practice-modal').remove();">
                    Start Practice
                </button>
                <button class="premium-btn secondary" onclick="this.closest('.practice-modal').remove();">
                    Later
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    setTimeout(() => modal.classList.add('show'), 10);
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

// Render chapter-based learning path
function renderChapterBasedPath(skillTreeEl) {
    try {
        const chapters = window.chapterService.getAllChapters();
        const chapterStats = window.chapterService.getChapterStats();
        
        // Update stats display
        const daysCompletedEl = document.getElementById('daysCompleted');
        if (daysCompletedEl) {
            daysCompletedEl.textContent = chapterStats.completed;
        }
        
        // Get weak skills for practice suggestions
        const weakSkills = window.skillStrengthService ? window.skillStrengthService.getWeakSkills(10) : [];
        
        let pathHTML = '';
        
        // Add chapter-based skill tree
        pathHTML = chapters.map((chapter, index) => {
            const chapterData = chapter.progress || {};
            const isUnlocked = chapterData.unlocked !== false;
            const isCompleted = chapterData.completed || false;
            const testPassed = chapterData.testPassed || false;
            const progress = chapterData.progress || 0;
            
            // Get skill strength for this chapter
            const skillId = `chapter-${chapter.number}`;
            let strengthInfo = { strength: 100, isCracked: false, isWeak: false };
            if (window.skillStrengthService && isUnlocked) {
                strengthInfo = window.skillStrengthService.getSkillStrength(skillId);
            }
            
            const strengthColor = window.skillStrengthService ? 
                window.skillStrengthService.getStrengthColor(strengthInfo.strength) : '#6366f1';
            const strengthLabel = window.skillStrengthService ? 
                window.skillStrengthService.getStrengthLabel(strengthInfo.strength) : '';
            
            const isCracked = strengthInfo.isCracked;
            const isWeak = strengthInfo.isWeak && !isCracked;
            const needsPractice = strengthInfo.needsPractice;
            
            let icon = '📚';
            if (chapter.theme === 'school') icon = '🏫';
            else if (chapter.theme === 'food') icon = '🍱';
            else if (chapter.theme === 'action') icon = '⚔️';
            else if (chapter.theme === 'friendship') icon = '🤝';
            else if (chapter.theme === 'adventure') icon = '🗺️';
            else if (chapter.theme === 'combat') icon = '⚡';
            else if (chapter.theme === 'emotions') icon = '😊';
            else if (chapter.theme === 'mastery') icon = '👑';
            
            let skillClasses = `${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`;
            if (isCracked) skillClasses += ' cracked';
            if (isWeak) skillClasses += ' weak';
            if (testPassed) skillClasses += ' test-passed';
            
            return `
                <div class="chapter-node ${skillClasses}" data-chapter-id="${chapter.id}">
                    <div class="chapter-number">Chapter ${chapter.number}</div>
                    <div class="skill-icon">${icon}</div>
                    <div class="skill-info">
                        <div class="skill-title">
                            ${escapeHtml(chapter.title)}
                            ${testPassed ? '<span class="test-badge">✓ Test Passed</span>' : ''}
                            ${isCracked ? '<span class="cracked-indicator">💔 Cracked</span>' : ''}
                        </div>
                        <div class="skill-description">${escapeHtml(chapter.description)}</div>
                        <div class="skill-meta">
                            ${chapter.words} words • ${chapter.kana}
                        </div>
                        
                        ${isUnlocked && window.skillStrengthService ? `
                            <div class="skill-strength ${strengthInfo.isCracked ? 'cracked' : strengthInfo.isWeak ? 'weak' : strengthInfo.strength >= 75 ? 'good' : 'strong'}">
                                <span class="strength-label">Strength: ${strengthLabel}</span>
                                <div class="skill-strength-meter">
                                    <div class="skill-strength-fill" style="width: ${strengthInfo.strength}%; background-color: ${strengthColor};"></div>
                                </div>
                                <span class="strength-value">${strengthInfo.strength}%</span>
                            </div>
                        ` : ''}
                        
                        <div class="skill-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="progress-text">${Math.round(progress)}%</span>
                        </div>
                    </div>
                    <div class="skill-actions">
                        ${isUnlocked ? `
                            <button class="premium-btn skill-btn" onclick="window.pathPage.startChapter(${chapter.number})">
                                ${isCompleted ? 'Review' : 'Start'}
                            </button>
                            ${testPassed ? '' : `
                                <button class="premium-btn skill-btn test-btn" onclick="window.chapterTestPage.startChapterTest('${chapter.id}')">
                                    🧪 Take Test
                                </button>
                            `}
                            ${needsPractice ? `
                                <button class="premium-btn skill-btn practice-btn" onclick="window.pathPage.practiceSkill('${skillId}', ${chapter.number}, 'vocabulary')">
                                    💪 Practice
                                </button>
                            ` : ''}
                        ` : `
                            <div class="skill-locked">
                                🔒 Locked
                                ${chapter.xpRequired > 0 ? `<div class="unlock-requirement">Requires ${chapter.xpRequired} XP</div>` : ''}
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add practice suggestions if there are weak skills
        if (weakSkills.length > 0) {
            const practiceSection = `
                <div class="practice-suggestions glass">
                    <h3 class="section-title">💪 Skills Need Practice</h3>
                    <p class="section-subtitle">These skills are getting weaker. Practice them to strengthen!</p>
                    <div class="weak-skills-list">
                        ${weakSkills.slice(0, 5).map(skill => {
                            const chapter = chapters.find(c => `chapter-${c.number}` === skill.skillId);
                            if (!chapter) return '';
                            const strengthColor = window.skillStrengthService.getStrengthColor(skill.strength);
                            return `
                                <div class="weak-skill-item">
                                    <div class="weak-skill-info">
                                        <span class="weak-skill-title">Chapter ${chapter.number}: ${chapter.title}</span>
                                        <div class="weak-skill-strength">
                                            <div class="skill-strength-meter small">
                                                <div class="skill-strength-fill" style="width: ${skill.strength}%; background-color: ${strengthColor};"></div>
                                            </div>
                                            <span>${skill.strength}%</span>
                                        </div>
                                    </div>
                                    <button class="premium-btn small" onclick="window.pathPage.practiceSkill('${skill.skillId}', ${chapter.number}, 'vocabulary')">
                                        Practice
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
            pathHTML = practiceSection + pathHTML;
        }
        
        skillTreeEl.innerHTML = pathHTML;
        
    } catch (error) {
        console.error('Error rendering chapter-based path:', error);
        skillTreeEl.innerHTML = `
            <div class="empty-state">
                <h2>Error Loading Chapters</h2>
                <p>${escapeHtml(error.message)}</p>
                <button class="premium-btn" onclick="window.pathPage.renderSkillTree()">Retry</button>
            </div>
        `;
    }
}

export function startChapter(chapterNumber) {
    // Start learning a chapter - for now, map to day-based system
    // In the future, this should load chapter-specific content
    if (window.exercisePage) {
        const skillId = `day-${chapterNumber}`;
        window.exercisePage.startExerciseSession(skillId, 'vocabulary');
    }
}

// Export for global access
window.pathPage = { load, renderSkillTree, startLesson, startChapter, practiceSkill, retry, updateDayProgress, getLearningPlan };

