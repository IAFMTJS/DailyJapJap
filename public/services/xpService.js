// XP Service - manages XP and related displays
import { studyStats, saveStudyStats } from './studyStats.js';

export function resetDailyXP() {
    const today = new Date().toDateString();
    if (studyStats.lastXPDate !== today) {
        studyStats.dailyXP = 0;
        studyStats.lastXPDate = today;
        saveStudyStats();
    }
}

export function addXP(amount, reason = '') {
    studyStats.totalXP += amount;
    studyStats.dailyXP += amount;
    studyStats.lastXPDate = new Date().toDateString();
    saveStudyStats();
    updateXPDisplay();
    console.log(`+${amount} XP ${reason ? `(${reason})` : ''}`);
}

export function updateXPDisplay() {
    const totalXPEl = document.getElementById('totalXP');
    const headerXPEl = document.getElementById('headerXP');
    const dailyXPEl = document.getElementById('dailyXP');
    const dailyGoalEl = document.getElementById('dailyGoal');
    const dailyGoalProgress = document.getElementById('dailyGoalProgress');
    
    if (totalXPEl) totalXPEl.textContent = studyStats.totalXP;
    if (headerXPEl) headerXPEl.textContent = studyStats.totalXP;
    if (dailyXPEl) dailyXPEl.textContent = studyStats.dailyXP;
    if (dailyGoalEl) {
        const today = new Date();
        const startDate = localStorage.getItem('startDate') || today.toDateString();
        const daysSinceStart = Math.floor((today - new Date(startDate)) / (1000 * 60 * 60 * 24));
        
        // Try to get from learning plan if available
        if (window.pathPage && window.pathPage.getLearningPlan) {
            const learningPlan = window.pathPage.getLearningPlan();
            const currentDayPlan = learningPlan.find(p => p.day === daysSinceStart + 1);
            if (currentDayPlan) {
                dailyGoalEl.textContent = currentDayPlan.xpGoal || 20;
                const goal = currentDayPlan.xpGoal || 20;
                const progress = Math.min(100, (studyStats.dailyXP / goal) * 100);
                if (dailyGoalProgress) {
                    dailyGoalProgress.style.width = `${progress}%`;
                }
            }
        } else {
            // Default goal
            dailyGoalEl.textContent = 20;
            const progress = Math.min(100, (studyStats.dailyXP / 20) * 100);
            if (dailyGoalProgress) {
                dailyGoalProgress.style.width = `${progress}%`;
            }
        }
    }
}

// Export for global access
window.xpService = { resetDailyXP, addXP, updateXPDisplay };

