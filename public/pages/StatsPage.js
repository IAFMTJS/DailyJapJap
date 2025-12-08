// Statistics Page Component
import api from '../utils/api.js';
import { studyStats } from '../services/studyStats.js';

let allDaysData = {};

export async function init() {
    await loadStats();
}

export async function load() {
    await updateStatistics();
}

async function loadStats() {
    try {
        const data = await api.get('/stats');
        
        if (!data.error) {
            const totalWordsEl = document.getElementById('totalWords');
            const totalDaysEl = document.getElementById('totalDays');
            const statTotalWordsEl = document.getElementById('statTotalWords');
            const statTotalDaysEl = document.getElementById('statTotalDays');
            
            if (totalWordsEl) totalWordsEl.textContent = data.totalWords || 0;
            if (totalDaysEl) totalDaysEl.textContent = data.totalDays || 0;
            if (statTotalWordsEl) statTotalWordsEl.textContent = data.totalWords || 0;
            if (statTotalDaysEl) statTotalDaysEl.textContent = data.totalDays || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

export function updateStatistics() {
    const statStreakEl = document.getElementById('statStreak');
    const statMasteredEl = document.getElementById('statMastered');
    const studyStreakEl = document.getElementById('studyStreak');
    
    if (statStreakEl) statStreakEl.textContent = studyStats.studyStreak;
    if (statMasteredEl) statMasteredEl.textContent = studyStats.wordsMastered.size;
    if (studyStreakEl) studyStreakEl.textContent = studyStats.studyStreak;
    
    // Get days data if available
    if (window.studyPage && window.studyPage.getAllDaysData) {
        allDaysData = window.studyPage.getAllDaysData();
    }
    
    // Update day progress
    const progressList = document.getElementById('dayProgressList');
    if (progressList) {
        progressList.innerHTML = Object.keys(allDaysData).sort((a, b) => parseInt(a) - parseInt(b)).map(dayNum => {
            const dayData = allDaysData[dayNum];
            const wordsInDay = dayData?.wordCount || 0;
            const masteredInDay = Array.from(studyStats.wordsMastered).filter(id => id.startsWith(dayNum + '-')).length;
            const progress = wordsInDay > 0 ? (masteredInDay / wordsInDay) * 100 : 0;
            
            return `
                <div class="day-progress-item">
                    <span class="day-progress-name">Day ${dayNum} - ${dayData?.title || ''}</span>
                    <div class="day-progress-bar">
                        <div class="day-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="day-progress-percent">${Math.round(progress)}%</span>
                </div>
            `;
        }).join('');
    }
}

// Export for global access
window.statsPage = { init, load, updateStatistics };

