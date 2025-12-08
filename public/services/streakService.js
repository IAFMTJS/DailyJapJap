// Enhanced Streak Service - Duolingo-like streak system
import { studyStats, saveStudyStats } from './studyStats.js';
import { addXP } from './xpService.js';

let streakFreezes = parseInt(localStorage.getItem('streakFreezes') || '0');
let streakRepairs = parseInt(localStorage.getItem('streakRepairs') || '0');
let longestStreak = parseInt(localStorage.getItem('longestStreak') || '0');
let streakHistory = JSON.parse(localStorage.getItem('streakHistory') || '[]');

// Streak milestones for celebrations
const STREAK_MILESTONES = [7, 30, 50, 100, 200, 365, 500, 1000];

export function updateStreak() {
    const today = new Date();
    const todayString = today.toDateString();
    const lastDate = studyStats.lastStudyDate;
    
    // If already studied today, don't update
    if (lastDate === todayString) {
        return { updated: false, streak: studyStats.studyStreak };
    }
    
    let newStreak = studyStats.studyStreak;
    let streakLost = false;
    let streakFrozen = false;
    
    if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const daysDiff = Math.floor((today - lastDateObj) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
            // Continue streak - studied yesterday
            newStreak++;
            checkStreakMilestone(newStreak);
        } else if (daysDiff === 0) {
            // Same day, no update needed
            return { updated: false, streak: studyStats.studyStreak };
        } else if (daysDiff === 2 && streakFreezes > 0) {
            // Use streak freeze
            streakFreezes--;
            localStorage.setItem('streakFreezes', streakFreezes.toString());
            newStreak++; // Continue streak
            streakFrozen = true;
            showStreakFreezeNotification();
        } else {
            // Streak lost
            if (daysDiff === 2 && streakRepairs > 0) {
                // Offer streak repair
                if (confirm('Your streak is about to be lost! Use a Streak Repair to save it?')) {
                    streakRepairs--;
                    localStorage.setItem('streakRepairs', streakRepairs.toString());
                    newStreak++;
                    showStreakRepairNotification();
                } else {
                    streakLost = true;
                    newStreak = 1; // Start new streak
                }
            } else {
                streakLost = true;
                newStreak = 1; // Start new streak
            }
        }
    } else {
        // First time studying
        newStreak = 1;
    }
    
    // Update longest streak
    if (newStreak > longestStreak) {
        longestStreak = newStreak;
        localStorage.setItem('longestStreak', longestStreak.toString());
    }
    
    // Update streak
    const oldStreak = studyStats.studyStreak;
    studyStats.studyStreak = newStreak;
    studyStats.lastStudyDate = todayString;
    
    // Record in history
    streakHistory.push({
        date: todayString,
        streak: newStreak,
        lost: streakLost,
        frozen: streakFrozen
    });
    if (streakHistory.length > 365) {
        streakHistory.shift(); // Keep last year
    }
    localStorage.setItem('streakHistory', JSON.stringify(streakHistory));
    
    saveStudyStats();
    
    // Streak bonuses
    if (newStreak > oldStreak && !streakLost) {
        const bonusXP = calculateStreakBonus(newStreak);
        if (bonusXP > 0) {
            addXP(bonusXP, `Streak bonus (${newStreak} days)`);
        }
    }
    
    // Show notifications
    if (streakLost) {
        showStreakLostNotification(oldStreak);
    } else if (newStreak > oldStreak) {
        showStreakUpdatedNotification(newStreak);
    }
    
    updateStreakDisplay();
    
    return {
        updated: true,
        streak: newStreak,
        lost: streakLost,
        frozen: streakFrozen,
        bonus: newStreak > oldStreak ? calculateStreakBonus(newStreak) : 0
    };
}

function calculateStreakBonus(streak) {
    // Bonus XP based on streak length
    if (streak >= 365) return 50; // 1 year
    if (streak >= 100) return 30;
    if (streak >= 50) return 20;
    if (streak >= 30) return 15;
    if (streak >= 7) return 10;
    return 0;
}

function checkStreakMilestone(streak) {
    if (STREAK_MILESTONES.includes(streak)) {
        showStreakMilestoneCelebration(streak);
        addXP(100, `Streak milestone: ${streak} days!`);
        
        // Award achievement
        if (window.achievementService) {
            window.achievementService.unlock(`streak_${streak}`);
        }
    }
}

export function addStreakFreeze(amount = 1) {
    streakFreezes += amount;
    localStorage.setItem('streakFreezes', streakFreezes.toString());
    updateStreakDisplay();
    return streakFreezes;
}

export function addStreakRepair(amount = 1) {
    streakRepairs += amount;
    localStorage.setItem('streakRepairs', streakRepairs.toString());
    updateStreakDisplay();
    return streakRepairs;
}

export function getStreakInfo() {
    return {
        current: studyStats.studyStreak,
        longest: longestStreak,
        freezes: streakFreezes,
        repairs: streakRepairs,
        history: streakHistory
    };
}

export function updateStreakDisplay() {
    const streakEl = document.getElementById('studyStreak');
    const headerStreakEl = document.getElementById('headerStreak');
    const streakFireEl = document.getElementById('streakFire');
    
    if (streakEl) {
        streakEl.textContent = studyStats.studyStreak;
        // Add fire emoji for active streaks
        if (studyStats.studyStreak >= 7) {
            streakEl.innerHTML = `🔥 ${studyStats.studyStreak}`;
        }
    }
    
    if (headerStreakEl) {
        headerStreakEl.textContent = studyStats.studyStreak;
    }
    
    // Show streak fire indicator
    if (streakFireEl) {
        if (studyStats.studyStreak > 0) {
            streakFireEl.style.display = 'inline-block';
            streakFireEl.textContent = '🔥';
        } else {
            streakFireEl.style.display = 'none';
        }
    }
    
    // Update streak freeze/repair displays
    const freezeCountEl = document.getElementById('streakFreezeCount');
    const repairCountEl = document.getElementById('streakRepairCount');
    
    if (freezeCountEl) freezeCountEl.textContent = streakFreezes;
    if (repairCountEl) repairCountEl.textContent = streakRepairs;
}

function showStreakUpdatedNotification(streak) {
    if (window.notificationService) {
        window.notificationService.show(`🔥 Streak: ${streak} days!`, 'success');
    } else {
        console.log(`🔥 Streak: ${streak} days!`);
    }
}

function showStreakLostNotification(oldStreak) {
    if (window.notificationService) {
        window.notificationService.show(`💔 Streak lost! You had ${oldStreak} days.`, 'error');
    } else {
        console.log(`💔 Streak lost! You had ${oldStreak} days.`);
    }
}

function showStreakFreezeNotification() {
    if (window.notificationService) {
        window.notificationService.show('❄️ Streak Freeze used! Your streak is protected.', 'info');
    }
}

function showStreakRepairNotification() {
    if (window.notificationService) {
        window.notificationService.show('🔧 Streak Repair used! Your streak is saved.', 'success');
    }
}

function showStreakMilestoneCelebration(streak) {
    // Trigger celebration animation
    if (window.celebrationService) {
        window.celebrationService.celebrate(`Amazing! ${streak} day streak! 🎉`, 'streak');
    }
    
    // Show modal
    showStreakMilestoneModal(streak);
}

function showStreakMilestoneModal(streak) {
    const modal = document.createElement('div');
    modal.className = 'celebration-modal';
    modal.innerHTML = `
        <div class="celebration-content">
            <div class="celebration-icon">🔥</div>
            <h2>Streak Milestone!</h2>
            <p class="celebration-message">You've reached ${streak} days!</p>
            <p class="celebration-bonus">+100 XP Bonus!</p>
            <button class="premium-btn" onclick="this.closest('.celebration-modal').remove()">Awesome!</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }, 5000);
}

// Check streak on page load
export function checkStreakOnLoad() {
    const today = new Date().toDateString();
    const lastDate = studyStats.lastStudyDate;
    
    // If last study was yesterday or earlier, check if streak should be updated
    if (lastDate && lastDate !== today) {
        const lastDateObj = new Date(lastDate);
        const daysDiff = Math.floor((new Date() - lastDateObj) / (1000 * 60 * 60 * 24));
        
        // If more than 1 day and no freeze, show warning
        if (daysDiff > 1 && streakFreezes === 0 && studyStats.studyStreak > 0) {
            showStreakWarning(daysDiff);
        }
    }
}

function showStreakWarning(daysMissed) {
    const warning = document.createElement('div');
    warning.className = 'streak-warning';
    warning.innerHTML = `
        <div class="warning-content">
            <div class="warning-icon">⚠️</div>
            <h3>Streak at Risk!</h3>
            <p>You've missed ${daysMissed} day${daysMissed > 1 ? 's' : ''}. Practice now to save your ${studyStats.studyStreak}-day streak!</p>
            <div class="warning-actions">
                <button class="premium-btn" onclick="window.app.switchMode('practice'); this.closest('.streak-warning').remove();">
                    Practice Now
                </button>
                <button class="premium-btn secondary" onclick="this.closest('.streak-warning').remove();">
                    Later
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(warning);
    
    setTimeout(() => {
        warning.classList.add('show');
    }, 10);
}

// Export for global access
window.streakService = {
    updateStreak,
    addStreakFreeze,
    addStreakRepair,
    getStreakInfo,
    updateStreakDisplay,
    checkStreakOnLoad
};

