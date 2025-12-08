const extractPdfContent = require('./_pdf-extractor');
const { hiraganaLessons, katakanaLessons } = require('./_kana-data');

// Create a 30-day structured learning plan
async function getLearningPlan() {
    const wordsData = await extractPdfContent();
    const totalDays = Object.keys(wordsData).length;
    
    // Calculate words per day for remaining days (after hiragana/katakana)
    const vocabDays = 30 - 14; // Days 15-30 for vocabulary
    const wordsPerDay = Math.ceil(500 / vocabDays); // ~18 words per day
    
    const plan = [];
    
    // Week 1: Hiragana (Days 1-7)
    for (let i = 0; i < hiraganaLessons.length; i++) {
        plan.push({
            day: hiraganaLessons[i].day,
            type: 'hiragana',
            title: hiraganaLessons[i].title,
            description: hiraganaLessons[i].description,
            characterCount: hiraganaLessons[i].chars.length,
            xpGoal: 20,
            unlocks: i === 0 ? null : hiraganaLessons[i - 1].day
        });
    }
    
    // Week 2: Katakana (Days 8-14)
    for (let i = 0; i < katakanaLessons.length; i++) {
        plan.push({
            day: katakanaLessons[i].day,
            type: 'katakana',
            title: katakanaLessons[i].title,
            description: katakanaLessons[i].description,
            characterCount: katakanaLessons[i].chars.length,
            xpGoal: 20,
            unlocks: i === 0 ? 7 : katakanaLessons[i - 1].day // Unlocks after last hiragana lesson
        });
    }
    
    // Weeks 3-4: Vocabulary (Days 15-30)
    const vocabDayNumbers = Object.keys(wordsData).sort((a, b) => parseInt(a) - parseInt(b));
    let vocabIndex = 0;
    
    for (let day = 15; day <= 30; day++) {
        const vocabDay = vocabDayNumbers[vocabIndex % vocabDayNumbers.length];
        const dayData = wordsData[vocabDay];
        
        plan.push({
            day: day,
            type: 'vocabulary',
            title: dayData.title || `Vocabulary Day ${day}`,
            description: `Learn ${dayData.words?.length || 0} essential Japanese words`,
            wordCount: dayData.words?.length || 0,
            xpGoal: (dayData.words?.length || 0) * 2, // 2 XP per word
            unlocks: day === 15 ? 14 : day - 1,
            sourceDay: parseInt(vocabDay)
        });
        
        vocabIndex++;
    }
    
    return plan;
}

module.exports = async (req, res) => {
    try {
        const plan = await getLearningPlan();
        res.json({ plan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

