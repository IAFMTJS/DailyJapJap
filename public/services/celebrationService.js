// Celebration Service - Handles success animations and celebrations
export function celebrate(message, type = 'success', duration = 3000) {
    // Create celebration overlay
    const celebration = document.createElement('div');
    celebration.className = `celebration celebration-${type}`;
    
    let icon = '🎉';
    let confetti = false;
    
    switch (type) {
        case 'streak':
            icon = '🔥';
            confetti = true;
            break;
        case 'perfect':
            icon = '⭐';
            confetti = true;
            break;
        case 'level':
            icon = '👑';
            confetti = true;
            break;
        case 'achievement':
            icon = '🏆';
            confetti = true;
            break;
        case 'legendary':
            icon = '💎';
            confetti = true;
            break;
        default:
            icon = '🎉';
            confetti = true;
    }
    
    celebration.innerHTML = `
        <div class="celebration-content">
            <div class="celebration-icon">${icon}</div>
            <div class="celebration-message">${message}</div>
        </div>
    `;
    
    document.body.appendChild(celebration);
    
    // Trigger confetti if enabled
    if (confetti) {
        createConfetti();
    }
    
    // Animate in
    setTimeout(() => {
        celebration.classList.add('show');
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
        celebration.classList.remove('show');
        setTimeout(() => {
            celebration.remove();
        }, 500);
    }, duration);
}

export function showXPAnimation(amount, x, y) {
    const xpBubble = document.createElement('div');
    xpBubble.className = 'xp-bubble';
    xpBubble.textContent = `+${amount} XP`;
    xpBubble.style.left = `${x}px`;
    xpBubble.style.top = `${y}px`;
    
    document.body.appendChild(xpBubble);
    
    // Animate
    setTimeout(() => {
        xpBubble.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        xpBubble.classList.remove('show');
        setTimeout(() => xpBubble.remove(), 500);
    }, 2000);
}

export function showPerfectLessonCelebration() {
    celebrate('Perfect Lesson! ⭐', 'perfect', 4000);
}

export function showLevelUpCelebration(level) {
    celebrate(`Level ${level} Unlocked! 👑`, 'level', 4000);
}

export function showStreakCelebration(days) {
    celebrate(`${days} Day Streak! 🔥`, 'streak', 4000);
}

export function showLegendaryCelebration() {
    celebrate('Legendary Status Achieved! 💎', 'legendary', 5000);
}

function createConfetti() {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 4000);
    }
}

export function animateProgressBar(element, from, to, duration = 1000) {
    if (!element) return;
    
    let start = null;
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const current = from + (to - from) * easeOutCubic(progress);
        element.style.width = `${current}%`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    requestAnimationFrame(animate);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Export for global access
window.celebrationService = {
    celebrate,
    showXPAnimation,
    showPerfectLessonCelebration,
    showLevelUpCelebration,
    showStreakCelebration,
    showLegendaryCelebration,
    animateProgressBar
};

