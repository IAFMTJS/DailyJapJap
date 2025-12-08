// Daily Quests Page Component
import api from '../utils/api.js';
import { studyStats, saveStudyStats } from '../services/studyStats.js';

export async function init() {
    // Page initialization
}

export async function load() {
    await loadDailyQuests();
}

async function loadDailyQuests() {
    try {
        const data = await api.get('/daily-quests');
        
        const today = new Date().toDateString();
        if (studyStats.lastQuestDate !== today) {
            studyStats.dailyQuests = {};
            studyStats.lastQuestDate = today;
        }
        
        const questsList = document.getElementById('questsList');
        const questsCompleted = document.getElementById('questsCompleted');
        const questsTotal = document.getElementById('questsTotal');
        
        if (questsTotal) {
            questsTotal.textContent = data.quests.length;
        }
        
        let completed = 0;
        if (questsList) {
            questsList.innerHTML = data.quests.map(quest => {
                const questProgress = studyStats.dailyQuests[quest.id] || { progress: 0, completed: false };
                if (questProgress.completed) completed++;
                
                return `
                    <div class="quest-card ${questProgress.completed ? 'completed' : ''}">
                        <div class="quest-icon">${quest.icon}</div>
                        <div class="quest-info">
                            <h4>${quest.name}</h4>
                            <p>${quest.description}</p>
                            <div class="quest-progress-bar">
                                <div class="quest-progress-fill" style="width: ${questProgress.completed ? 100 : 0}%"></div>
                            </div>
                        </div>
                        <div class="quest-reward">+${quest.xp} XP</div>
                    </div>
                `;
            }).join('');
        }
        
        if (questsCompleted) {
            questsCompleted.textContent = completed;
        }
    } catch (error) {
        console.error('Error loading daily quests:', error);
    }
}

// Export for global access
window.questsPage = { init, load };

