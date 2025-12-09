// Celebration animations service for Duolingo-like experience
class CelebrationService {
    constructor() {
        this.container = null;
    }
    
    // Show celebration animation
    celebrate(type, message = '', options = {}) {
        const container = options.container || document.body;
        const position = options.position || 'center';
        
        switch (type) {
            case 'correct':
                this.showCorrectAnimation(container, position);
                break;
            case 'incorrect':
                this.showIncorrectAnimation(container, position);
                break;
            case 'levelUp':
                this.showLevelUpAnimation(container, message);
                break;
            case 'streak':
                this.showStreakAnimation(container, message);
                break;
            case 'perfect':
                this.showPerfectAnimation(container, message);
                break;
            case 'exerciseComplete':
                this.showExerciseCompleteAnimation(container, message);
                break;
            case 'achievement':
                this.showAchievementAnimation(container, message, options.icon);
                break;
            case 'xp':
                this.showXPAnimation(container, message, options.xp);
                break;
        }
    }
    
    showCorrectAnimation(container, position) {
        const confetti = document.createElement('div');
        confetti.className = 'celebration-confetti correct';
        confetti.style.cssText = `
            position: fixed;
            ${position === 'center' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%);' : 
              position === 'top' ? 'top: 20%; left: 50%; transform: translateX(-50%);' : 
              'bottom: 20%; left: 50%; transform: translateX(-50%);'}
            z-index: 10000;
            pointer-events: none;
        `;
        confetti.innerHTML = '✓';
        
        container.appendChild(confetti);
        
        // Animate
        confetti.style.animation = 'celebrationPop 0.5s ease-out';
        confetti.style.fontSize = '80px';
        confetti.style.color = '#10b981';
        confetti.style.textShadow = '0 0 20px rgba(16, 185, 129, 0.8)';
        
        setTimeout(() => {
            confetti.remove();
        }, 500);
        
        // Create particles
        this.createParticles(container, position, '#10b981');
    }
    
    showIncorrectAnimation(container, position) {
        const xMark = document.createElement('div');
        xMark.className = 'celebration-confetti incorrect';
        xMark.style.cssText = `
            position: fixed;
            ${position === 'center' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%);' : 
              position === 'top' ? 'top: 20%; left: 50%; transform: translateX(-50%);' : 
              'bottom: 20%; left: 50%; transform: translateX(-50%);'}
            z-index: 10000;
            pointer-events: none;
        `;
        xMark.innerHTML = '✗';
        
        container.appendChild(xMark);
        
        xMark.style.animation = 'celebrationShake 0.5s ease-out';
        xMark.style.fontSize = '80px';
        xMark.style.color = '#ef4444';
        xMark.style.textShadow = '0 0 20px rgba(239, 68, 68, 0.8)';
        
        setTimeout(() => {
            xMark.remove();
        }, 500);
    }
    
    showLevelUpAnimation(container, message) {
        const modal = document.createElement('div');
        modal.className = 'celebration-modal level-up';
        modal.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-icon">🎉</div>
                <h2>Level Up!</h2>
                <p>${message || 'You\'ve reached a new level!'}</p>
            </div>
        `;
        
        container.appendChild(modal);
        
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }, 2000);
    }
    
    showStreakAnimation(container, days) {
        const streak = document.createElement('div');
        streak.className = 'celebration-streak';
        streak.innerHTML = `
            <div class="streak-fire">🔥</div>
            <div class="streak-text">${days} Day Streak!</div>
        `;
        streak.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(245, 158, 11, 0.5);
            font-size: 1.5rem;
            font-weight: bold;
            text-align: center;
            pointer-events: none;
        `;
        
        container.appendChild(streak);
        
        streak.style.animation = 'celebrationSlideDown 0.5s ease-out';
        
        setTimeout(() => {
            streak.style.animation = 'celebrationSlideUp 0.5s ease-in';
            setTimeout(() => streak.remove(), 500);
        }, 2000);
    }
    
    showPerfectAnimation(container, message) {
        const perfect = document.createElement('div');
        perfect.className = 'celebration-perfect';
        perfect.innerHTML = `
            <div class="perfect-stars">⭐⭐⭐</div>
            <div class="perfect-text">Perfect!</div>
            ${message ? `<div class="perfect-message">${message}</div>` : ''}
        `;
        perfect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            color: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(139, 92, 246, 0.4);
            text-align: center;
            pointer-events: none;
        `;
        
        container.appendChild(perfect);
        
        perfect.style.animation = 'celebrationPop 0.6s ease-out';
        
        setTimeout(() => {
            perfect.style.animation = 'celebrationFadeOut 0.5s ease-in';
            setTimeout(() => perfect.remove(), 500);
        }, 2000);
    }
    
    showExerciseCompleteAnimation(container, message) {
        const complete = document.createElement('div');
        complete.className = 'celebration-complete';
        complete.innerHTML = `
            <div class="complete-icon">🎊</div>
            <h2>Lesson Complete!</h2>
            <p>${message || 'Great job!'}</p>
        `;
        complete.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            padding: 2.5rem;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(99, 102, 241, 0.5);
            text-align: center;
            pointer-events: none;
            min-width: 300px;
        `;
        
        container.appendChild(complete);
        
        complete.style.animation = 'celebrationPop 0.6s ease-out';
        
        setTimeout(() => {
            complete.style.animation = 'celebrationFadeOut 0.5s ease-in';
            setTimeout(() => complete.remove(), 500);
        }, 2500);
    }
    
    showXPAnimation(container, message, xp) {
        const xpBadge = document.createElement('div');
        xpBadge.className = 'celebration-xp';
        xpBadge.innerHTML = `
            <div class="xp-icon">⭐</div>
            <div class="xp-amount">+${xp} XP</div>
            ${message ? `<div class="xp-message">${message}</div>` : ''}
        `;
        xpBadge.style.cssText = `
            position: fixed;
            top: 15%;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #f59e0b, #f97316);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(245, 158, 11, 0.4);
            text-align: center;
            pointer-events: none;
            font-weight: bold;
        `;
        
        container.appendChild(xpBadge);
        
        xpBadge.style.animation = 'celebrationSlideInRight 0.4s ease-out';
        
        setTimeout(() => {
            xpBadge.style.animation = 'celebrationSlideOutRight 0.4s ease-in';
            setTimeout(() => xpBadge.remove(), 400);
        }, 2000);
    }
    
    showAchievementAnimation(container, message, icon = '🏆') {
        const achievement = document.createElement('div');
        achievement.className = 'celebration-achievement';
        achievement.innerHTML = `
            <div class="achievement-icon">${icon}</div>
            <div class="achievement-text">Achievement Unlocked!</div>
            <div class="achievement-message">${message}</div>
        `;
        achievement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(251, 191, 36, 0.5);
            text-align: center;
            pointer-events: none;
            min-width: 280px;
        `;
        
        container.appendChild(achievement);
        
        achievement.style.animation = 'celebrationPop 0.6s ease-out';
        
        setTimeout(() => {
            achievement.style.animation = 'celebrationFadeOut 0.5s ease-in';
            setTimeout(() => achievement.remove(), 500);
        }, 3000);
    }
    
    createParticles(container, position, color) {
        const particleCount = 20;
        const baseX = position === 'center' ? '50%' : position === 'top' ? '50%' : '50%';
        const baseY = position === 'center' ? '50%' : position === 'top' ? '20%' : '80%';
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                left: ${baseX};
                top: ${baseY};
                width: 8px;
                height: 8px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 10000;
            `;
            
            container.appendChild(particle);
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = 100 + Math.random() * 50;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 0 }
            ], {
                duration: 800,
                easing: 'ease-out'
            }).onfinish = () => particle.remove();
        }
    }
}

// Create global instance
window.celebrationService = new CelebrationService();
