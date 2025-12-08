// Achievements Page Component
import api from '../utils/api.js';
import { escapeHtml } from '../utils/helpers.js';
import { studyStats } from '../services/studyStats.js';

export async function init() {
    // Page initialization
}

export async function load() {
    await loadAchievements();
}

async function loadAchievements() {
    try {
        const data = await api.get('/achievements');
        
        const achievementsGrid = document.getElementById('achievementsGrid');
        const unlockedCount = document.getElementById('unlockedCount');
        const totalAchievements = document.getElementById('totalAchievements');
        
        if (totalAchievements) {
            totalAchievements.textContent = data.achievements.length;
        }
        
        let unlocked = 0;
        if (achievementsGrid) {
            achievementsGrid.innerHTML = data.achievements.map(achievement => {
                const isUnlocked = studyStats.achievements.includes(achievement.id);
                if (isUnlocked) unlocked++;
                
                return `
                    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-info">
                            <h4>${achievement.name}</h4>
                            <p>${achievement.description}</p>
                            <div class="achievement-xp">+${achievement.xp} XP</div>
                        </div>
                        ${isUnlocked ? '<div class="achievement-badge">✓</div>' : ''}
                    </div>
                `;
            }).join('');
        }
        
        if (unlockedCount) {
            unlockedCount.textContent = unlocked;
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

// Export for global access
window.achievementsPage = { init, load };

