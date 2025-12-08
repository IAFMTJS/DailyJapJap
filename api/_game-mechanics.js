// Advanced game mechanics for Duolingo-like experience

const ACHIEVEMENTS = {
    first_word: { id: 'first_word', name: 'First Steps', description: 'Study your first word', icon: '🌱', xp: 10 },
    first_lesson: { id: 'first_lesson', name: 'Getting Started', description: 'Complete your first lesson', icon: '🎯', xp: 20 },
    streak_3: { id: 'streak_3', name: 'On Fire', description: 'Maintain a 3-day streak', icon: '🔥', xp: 30 },
    streak_7: { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '⚡', xp: 50 },
    streak_30: { id: 'streak_30', name: 'Month Master', description: 'Maintain a 30-day streak', icon: '👑', xp: 200 },
    perfect_lesson: { id: 'perfect_lesson', name: 'Perfect Score', description: 'Complete a lesson without mistakes', icon: '💯', xp: 25 },
    speed_demon: { id: 'speed_demon', name: 'Speed Demon', description: 'Complete 10 exercises in under 2 minutes', icon: '⚡', xp: 40 },
    vocabulary_master: { id: 'vocabulary_master', name: 'Vocabulary Master', description: 'Master 100 words', icon: '📚', xp: 100 },
    kana_master: { id: 'kana_master', name: 'Kana Master', description: 'Master all hiragana and katakana', icon: 'あ', xp: 150 },
    xp_1000: { id: 'xp_1000', name: 'XP Collector', description: 'Earn 1000 total XP', icon: '⭐', xp: 50 },
    xp_5000: { id: 'xp_5000', name: 'XP Master', description: 'Earn 5000 total XP', icon: '🌟', xp: 200 },
    daily_goal_7: { id: 'daily_goal_7', name: 'Consistent Learner', description: 'Complete daily goal 7 days in a row', icon: '📅', xp: 75 },
    perfect_week: { id: 'perfect_week', name: 'Perfect Week', description: 'Complete all daily goals in a week', icon: '✨', xp: 100 },
};

const DAILY_QUESTS = [
    { id: 'complete_lesson', name: 'Complete a Lesson', description: 'Finish any lesson', xp: 20, icon: '📖' },
    { id: 'practice_10_words', name: 'Practice 10 Words', description: 'Study 10 new words', xp: 15, icon: '📝' },
    { id: 'perfect_lesson', name: 'Perfect Lesson', description: 'Complete a lesson without mistakes', xp: 30, icon: '💯' },
    { id: 'review_weak', name: 'Review Weak Words', description: 'Practice 5 words you struggled with', xp: 25, icon: '🔄' },
    { id: 'kana_practice', name: 'Kana Practice', description: 'Practice 10 hiragana or katakana characters', xp: 20, icon: 'あ' },
    { id: 'streak_maintain', name: 'Maintain Streak', description: 'Keep your streak alive', xp: 10, icon: '🔥' },
];

// Crown levels: 0 = locked, 1-5 = skill levels
function getCrownLevel(skillId, userProgress) {
    return userProgress[skillId]?.crownLevel || 0;
}

function canLevelUp(skillId, userProgress) {
    const currentLevel = getCrownLevel(skillId, userProgress);
    if (currentLevel >= 5) return false;
    
    const skill = userProgress[skillId] || {};
    const lessonsCompleted = skill.lessonsCompleted || 0;
    const requiredLessons = (currentLevel + 1) * 2; // 2 lessons per level
    
    return lessonsCompleted >= requiredLessons;
}

function levelUpSkill(skillId, userProgress) {
    if (!canLevelUp(skillId, userProgress)) return false;
    
    if (!userProgress[skillId]) {
        userProgress[skillId] = { crownLevel: 0, lessonsCompleted: 0, strength: 100 };
    }
    
    userProgress[skillId].crownLevel++;
    userProgress[skillId].strength = 100; // Reset strength on level up
    return true;
}

// Skill strength decay (like Duolingo's cracked skills)
function calculateSkillStrength(skill, daysSinceLastPractice) {
    if (!skill) return 0;
    
    const baseStrength = skill.strength || 100;
    const decayRate = 10; // 10% per day after 3 days
    const decayStart = 3; // Start decaying after 3 days
    
    if (daysSinceLastPractice <= decayStart) {
        return baseStrength;
    }
    
    const daysDecayed = daysSinceLastPractice - decayStart;
    const newStrength = Math.max(0, baseStrength - (daysDecayed * decayRate));
    
    return Math.round(newStrength);
}

// Hearts system
const HEARTS_MAX = 5;
const HEART_REFILL_TIME = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

function getHearts(userStats) {
    const hearts = userStats.hearts || HEARTS_MAX;
    const lastHeartLoss = userStats.lastHeartLoss || Date.now();
    const timeSinceLoss = Date.now() - lastHeartLoss;
    
    if (hearts < HEARTS_MAX && timeSinceLoss >= HEART_REFILL_TIME) {
        const heartsRefilled = Math.floor(timeSinceLoss / HEART_REFILL_TIME);
        return Math.min(HEARTS_MAX, hearts + heartsRefilled);
    }
    
    return hearts;
}

function loseHeart(userStats) {
    const currentHearts = getHearts(userStats);
    if (currentHearts <= 0) return false;
    
    userStats.hearts = currentHearts - 1;
    userStats.lastHeartLoss = Date.now();
    return true;
}

// Exercise types
const EXERCISE_TYPES = {
    TRANSLATE: 'translate',
    LISTEN: 'listen',
    SPEAK: 'speak',
    MATCH: 'match',
    FILL_BLANK: 'fill_blank',
    MULTIPLE_CHOICE: 'multiple_choice',
    TAP_WORDS: 'tap_words',
    TAP_PAIRS: 'tap_pairs',
};

// Generate exercises based on skill level and type
function generateExercise(word, type, difficulty = 1) {
    const exercises = [];
    
    switch (type) {
        case EXERCISE_TYPES.TRANSLATE:
            exercises.push({
                type: EXERCISE_TYPES.TRANSLATE,
                question: `Translate: ${word.japanese}`,
                correctAnswer: word.translation,
                options: generateWrongAnswers(word.translation, 3),
            });
            break;
            
        case EXERCISE_TYPES.LISTEN:
            exercises.push({
                type: EXERCISE_TYPES.LISTEN,
                question: 'Listen and type what you hear',
                audio: word.japanese,
                correctAnswer: word.japanese,
                hint: word.furigana,
            });
            break;
            
        case EXERCISE_TYPES.MATCH:
            exercises.push({
                type: EXERCISE_TYPES.MATCH,
                pairs: [
                    { japanese: word.japanese, translation: word.translation },
                    ...generateMatchingPairs(word, 3),
                ],
            });
            break;
            
        case EXERCISE_TYPES.FILL_BLANK:
            const sentence = word.sentence || `${word.japanese} means ${word.translation}`;
            const blankIndex = sentence.indexOf(word.japanese);
            exercises.push({
                type: EXERCISE_TYPES.FILL_BLANK,
                sentence: sentence.replace(word.japanese, '____'),
                correctAnswer: word.japanese,
                options: [word.japanese, ...generateWrongAnswers(word.japanese, 3, true)],
            });
            break;
            
        case EXERCISE_TYPES.MULTIPLE_CHOICE:
            exercises.push({
                type: EXERCISE_TYPES.MULTIPLE_CHOICE,
                question: `What does ${word.japanese} mean?`,
                correctAnswer: word.translation,
                options: shuffleArray([word.translation, ...generateWrongAnswers(word.translation, 3)]),
            });
            break;
    }
    
    return exercises;
}

function generateWrongAnswers(correctAnswer, count, isJapanese = false) {
    // This would ideally use a word bank, but for now generate similar answers
    const wrongAnswers = [];
    const variations = [
        correctAnswer.split(' ').reverse().join(' '),
        correctAnswer + 's',
        'not ' + correctAnswer,
        correctAnswer.substring(0, correctAnswer.length - 1),
    ];
    
    for (let i = 0; i < count; i++) {
        wrongAnswers.push(variations[i % variations.length] || `Option ${i + 1}`);
    }
    
    return wrongAnswers;
}

function generateMatchingPairs(correctWord, count) {
    // Generate pairs for matching exercise
    const pairs = [];
    const sampleWords = [
        { japanese: 'こんにちは', translation: 'Hello' },
        { japanese: 'ありがとう', translation: 'Thank you' },
        { japanese: 'さようなら', translation: 'Goodbye' },
    ];
    
    for (let i = 0; i < count; i++) {
        pairs.push(sampleWords[i % sampleWords.length]);
    }
    
    return pairs;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

module.exports = {
    ACHIEVEMENTS,
    DAILY_QUESTS,
    EXERCISE_TYPES,
    getCrownLevel,
    canLevelUp,
    levelUpSkill,
    calculateSkillStrength,
    getHearts,
    loseHeart,
    generateExercise,
    HEARTS_MAX,
    HEART_REFILL_TIME,
};

