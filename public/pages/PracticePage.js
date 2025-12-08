// Practice Hub Page Component
import { studyStats } from '../services/studyStats.js';

export async function init() {
    // Page initialization
}

export async function load() {
    loadPracticeHub();
}

function loadPracticeHub() {
    const weakSkillsList = document.getElementById('weakSkillsList');
    const reviewSkillsList = document.getElementById('reviewSkillsList');
    const strengthenSkillsList = document.getElementById('strengthenSkillsList');
    
    const now = Date.now();
    const weakSkills = [];
    const reviewSkills = [];
    const strengthenSkills = [];
    
    Object.keys(studyStats.skillProgress).forEach(skillId => {
        const skill = studyStats.skillProgress[skillId];
        const daysSincePractice = Math.floor((now - (skill.lastPractice || 0)) / (1000 * 60 * 60 * 24));
        const strength = skill.strength || 100;
        
        if (strength < 50) {
            weakSkills.push({ id: skillId, ...skill });
        } else if (daysSincePractice > 3) {
            reviewSkills.push({ id: skillId, ...skill, daysSincePractice });
        } else if (strength < 100) {
            strengthenSkills.push({ id: skillId, ...skill });
        }
    });
    
    if (weakSkillsList) {
        weakSkillsList.innerHTML = weakSkills.length > 0 
            ? weakSkills.map(skill => renderSkillCard(skill)).join('')
            : '<p class="empty-message">No weak skills! Great job! 🎉</p>';
    }
    
    if (reviewSkillsList) {
        reviewSkillsList.innerHTML = reviewSkills.length > 0
            ? reviewSkills.map(skill => renderSkillCard(skill)).join('')
            : '<p class="empty-message">All skills are up to date! ✨</p>';
    }
    
    if (strengthenSkillsList) {
        strengthenSkillsList.innerHTML = strengthenSkills.length > 0
            ? strengthenSkills.map(skill => renderSkillCard(skill)).join('')
            : '<p class="empty-message">All skills at full strength! 💪</p>';
    }
}

function renderSkillCard(skill) {
    const crowns = '👑'.repeat(skill.crownLevel || 0);
    return `
        <div class="practice-skill-card">
            <div class="skill-header">
                <span class="skill-name">${skill.id}</span>
                <span class="skill-crowns">${crowns}</span>
            </div>
            <div class="skill-strength">
                <div class="strength-bar">
                    <div class="strength-fill" style="width: ${skill.strength || 0}%"></div>
                </div>
                <span class="strength-text">${skill.strength || 0}%</span>
            </div>
            <button class="premium-btn small" onclick="window.exercisePage?.startExerciseSession('${skill.id}')">Practice</button>
        </div>
    `;
}

// Export for global access
window.practicePage = { init, load };

