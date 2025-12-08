// Skill Strength Service - Tracks skill strength and decay over time
import { studyStats, saveStudyStats } from './studyStats.js';

const STRENGTH_DECAY_RATE = 0.5; // Strength decreases by 0.5% per day
const STRENGTH_THRESHOLD_CRACKED = 50; // Skills below 50% are "cracked"
const STRENGTH_THRESHOLD_WEAK = 75; // Skills below 75% are "weak"

export function updateSkillStrength(skillId, correct = true, difficulty = 1) {
    if (!studyStats.skillProgress[skillId]) {
        studyStats.skillProgress[skillId] = {
            crownLevel: 0,
            lessonsCompleted: 0,
            strength: 100,
            lastPractice: Date.now(),
            mistakes: 0,
            perfectLessons: 0
        };
    }
    
    const skill = studyStats.skillProgress[skillId];
    const now = Date.now();
    
    // Calculate time-based decay
    const daysSincePractice = (now - skill.lastPractice) / (1000 * 60 * 60 * 24);
    if (daysSincePractice > 0) {
        skill.strength = Math.max(0, skill.strength - (daysSincePractice * STRENGTH_DECAY_RATE));
    }
    
    // Update strength based on performance
    if (correct) {
        // Increase strength based on difficulty and current strength
        const increase = difficulty * (1 + (100 - skill.strength) / 100);
        skill.strength = Math.min(100, skill.strength + increase);
        skill.perfectLessons++;
    } else {
        // Decrease strength for mistakes
        skill.strength = Math.max(0, skill.strength - (difficulty * 2));
        skill.mistakes++;
    }
    
    skill.lastPractice = now;
    skill.lessonsCompleted++;
    
    saveStudyStats();
    
    return {
        strength: Math.round(skill.strength),
        isCracked: skill.strength < STRENGTH_THRESHOLD_CRACKED,
        isWeak: skill.strength < STRENGTH_THRESHOLD_WEAK,
        needsPractice: skill.strength < STRENGTH_THRESHOLD_WEAK
    };
}

export function getSkillStrength(skillId) {
    if (!studyStats.skillProgress[skillId]) {
        return {
            strength: 0,
            isCracked: true,
            isWeak: true,
            needsPractice: true,
            lastPractice: null
        };
    }
    
    const skill = studyStats.skillProgress[skillId];
    const now = Date.now();
    const daysSincePractice = (now - skill.lastPractice) / (1000 * 60 * 60 * 24);
    
    // Calculate current strength with decay
    let currentStrength = skill.strength;
    if (daysSincePractice > 0) {
        currentStrength = Math.max(0, skill.strength - (daysSincePractice * STRENGTH_DECAY_RATE));
    }
    
    return {
        strength: Math.round(currentStrength),
        isCracked: currentStrength < STRENGTH_DECAY_RATE,
        isWeak: currentStrength < STRENGTH_THRESHOLD_WEAK,
        needsPractice: currentStrength < STRENGTH_THRESHOLD_WEAK,
        lastPractice: skill.lastPractice,
        daysSincePractice: Math.floor(daysSincePractice)
    };
}

export function getWeakSkills(limit = 5) {
    const weakSkills = [];
    const now = Date.now();
    
    for (const [skillId, skill] of Object.entries(studyStats.skillProgress)) {
        const daysSincePractice = (now - skill.lastPractice) / (1000 * 60 * 60 * 24);
        let currentStrength = skill.strength;
        
        if (daysSincePractice > 0) {
            currentStrength = Math.max(0, skill.strength - (daysSincePractice * STRENGTH_DECAY_RATE));
        }
        
        if (currentStrength < STRENGTH_THRESHOLD_WEAK) {
            weakSkills.push({
                skillId,
                strength: Math.round(currentStrength),
                daysSincePractice: Math.floor(daysSincePractice),
                isCracked: currentStrength < STRENGTH_DECAY_RATE
            });
        }
    }
    
    // Sort by strength (weakest first)
    weakSkills.sort((a, b) => a.strength - b.strength);
    
    return weakSkills.slice(0, limit);
}

export function getCrackedSkills() {
    return getWeakSkills().filter(skill => skill.isCracked);
}

export function updateAllSkillStrengths() {
    const now = Date.now();
    let updated = false;
    
    for (const [skillId, skill] of Object.entries(studyStats.skillProgress)) {
        const daysSincePractice = (now - skill.lastPractice) / (1000 * 60 * 60 * 24);
        if (daysSincePractice > 0) {
            const oldStrength = skill.strength;
            skill.strength = Math.max(0, skill.strength - (daysSincePractice * STRENGTH_DECAY_RATE));
            
            if (Math.round(oldStrength) !== Math.round(skill.strength)) {
                updated = true;
            }
        }
    }
    
    if (updated) {
        saveStudyStats();
    }
    
    return updated;
}

export function getStrengthColor(strength) {
    if (strength >= 90) return '#10b981'; // Green - Strong
    if (strength >= 75) return '#3b82f6'; // Blue - Good
    if (strength >= 50) return '#f59e0b'; // Orange - Weak
    return '#ef4444'; // Red - Cracked
}

export function getStrengthLabel(strength) {
    if (strength >= 90) return 'Strong';
    if (strength >= 75) return 'Good';
    if (strength >= 50) return 'Weak';
    return 'Cracked';
}

// Export for global access
window.skillStrengthService = {
    updateSkillStrength,
    getSkillStrength,
    getWeakSkills,
    getCrackedSkills,
    updateAllSkillStrengths,
    getStrengthColor,
    getStrengthLabel
};

