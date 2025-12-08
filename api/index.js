// Consolidated API handler - single serverless function for all routes
const extractPdfContent = require('./_pdf-extractor');
const { hiragana, katakana, getAllHiragana, getAllKatakana, hiraganaLessons, katakanaLessons } = require('./_kana-data');
const { ACHIEVEMENTS, DAILY_QUESTS } = require('./_game-mechanics');
const exerciseGenerator = require('./services/exercise-generator');
const answerValidator = require('./services/answer-validator');
const exerciseSession = require('./services/exercise-session');

// Learning plan generator
async function getLearningPlan() {
    const wordsData = await extractPdfContent();
    const totalDays = Object.keys(wordsData).length;
    const vocabDays = 30 - 14;
    const wordsPerDay = Math.ceil(500 / vocabDays);
    
    const plan = [];
    
    // Week 1: Hiragana (Days 1-7)
    for (let i = 0; i < hiraganaLessons.length; i++) {
        plan.push({
            day: hiraganaLessons[i].day,
            type: 'hiragana',
            title: hiraganaLessons[i].title,
            description: hiraganaLessons[i].description,
            characters: hiraganaLessons[i].chars.length
        });
    }
    
    // Week 2: Katakana (Days 8-14)
    for (let i = 0; i < katakanaLessons.length; i++) {
        plan.push({
            day: katakanaLessons[i].day,
            type: 'katakana',
            title: katakanaLessons[i].title,
            description: katakanaLessons[i].description,
            characters: katakanaLessons[i].chars.length
        });
    }
    
    // Weeks 3-4: Vocabulary (Days 15-30)
    let wordIndex = 0;
    const allWords = Object.values(wordsData).flatMap(day => day.words || []);
    
    for (let day = 15; day <= 30; day++) {
        const dayWords = allWords.slice(wordIndex, wordIndex + wordsPerDay);
        wordIndex += wordsPerDay;
        
        plan.push({
            day: day,
            type: 'vocabulary',
            title: `Day ${day} Vocabulary`,
            description: `Learn ${dayWords.length} new words`,
            words: dayWords.length
        });
    }
    
    return plan;
}

module.exports = async (req, res) => {
    try {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        const path = req.url.split('?')[0]; // Remove query string
        const method = req.method;
        
        // Route: /api/days
        if (path === '/api/days' || path === '/days') {
            const data = await extractPdfContent();
            if (data.error) {
                return res.status(500).json(data);
            }
            
            const daysList = [];
            for (const dayNum of Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b))) {
                const dayInfo = data[dayNum];
                daysList.push({
                    day: parseInt(dayNum),
                    title: dayInfo.title || "",
                    wordCount: dayInfo.words ? dayInfo.words.length : 0
                });
            }
            
            return res.json({ days: daysList });
        }
        
        // Route: /api/words/:day
        if (path.match(/^\/api\/words\/\d+$/) || path.match(/^\/words\/\d+$/)) {
            const day = parseInt(path.match(/\/(\d+)$/)[1]);
            const data = await extractPdfContent();
            
            if (data.error) {
                return res.status(500).json(data);
            }
            
            if (!data[day]) {
                return res.status(404).json({ error: `Day ${day} not found` });
            }
            
            const dayInfo = data[day];
            return res.json({
                day: day,
                title: dayInfo.title || "",
                words: dayInfo.words || []
            });
        }
        
        // Route: /api/stats
        if (path === '/api/stats' || path === '/stats') {
            const data = await extractPdfContent();
            if (data.error) {
                return res.status(500).json(data);
            }
            
            const totalWords = Object.values(data).reduce((sum, dayInfo) => {
                return sum + (dayInfo.words ? dayInfo.words.length : 0);
            }, 0);
            const totalDays = Object.keys(data).length;
            
            return res.json({
                totalDays: totalDays,
                totalWords: totalWords,
                averageWordsPerDay: totalDays > 0 ? Math.round(totalWords / totalDays * 10) / 10 : 0
            });
        }
        
        // Route: /api/kana
        if (path === '/api/kana' || path === '/kana') {
            const { type, day } = req.query;
            
            if (type === 'hiragana') {
                if (day) {
                    const lesson = hiraganaLessons.find(l => l.day === parseInt(day));
                    if (lesson) {
                        return res.json({
                            type: 'hiragana',
                            day: lesson.day,
                            title: lesson.title,
                            description: lesson.description,
                            characters: lesson.chars
                        });
                    }
                    return res.status(404).json({ error: 'Hiragana lesson not found' });
                }
                return res.json({ hiragana: getAllHiragana() });
            }
            
            if (type === 'katakana') {
                if (day) {
                    const lesson = katakanaLessons.find(l => l.day === parseInt(day));
                    if (lesson) {
                        return res.json({
                            type: 'katakana',
                            day: lesson.day,
                            title: lesson.title,
                            description: lesson.description,
                            characters: lesson.chars
                        });
                    }
                    return res.status(404).json({ error: 'Katakana lesson not found' });
                }
                return res.json({ katakana: getAllKatakana() });
            }
            
            return res.json({
                hiragana: getAllHiragana(),
                katakana: getAllKatakana()
            });
        }
        
        // Route: /api/learning-plan
        if (path === '/api/learning-plan' || path === '/learning-plan') {
            const plan = await getLearningPlan();
            return res.json({ plan });
        }
        
        // Route: /api/exercises
        if (path === '/api/exercises' || path === '/exercises') {
            const { type, skillId, difficulty = 1, exerciseType, count = 10, action } = req.query;
            
            if (action === 'test') {
                return res.json({ 
                    message: 'Exercises endpoint is working',
                    type,
                    skillId,
                    timestamp: new Date().toISOString()
                });
            }
            
            if (action === 'validate' && method === 'POST') {
                const { exercise, userAnswer } = req.body;
                const result = answerValidator.validate(exercise, userAnswer);
                return res.json(result);
            }
            
            if (type === 'vocabulary' || type === 'kana') {
                const skill = skillId || (type === 'kana' ? 'kana' : 'vocab');
                const exercises = exerciseGenerator.generateExercises({
                    type: type,
                    skillId: skill,
                    difficulty: parseInt(difficulty),
                    exerciseType: exerciseType,
                    count: parseInt(count)
                });
                
                return res.json({ exercises });
            }
            
            return res.status(400).json({ error: 'Invalid exercise type' });
        }
        
        // Route: /api/session
        if (path === '/api/session' || path === '/session') {
            const { sessionId, action } = req.query;
            
            if (method === 'POST') {
                if (action === 'create') {
                    const { userId, skillId, exercises } = req.body;
                    const session = exerciseSession.createSession(userId, skillId, exercises);
                    return res.json({ session });
                }
                
                if (action === 'answer') {
                    const { userAnswer, validationResult } = req.body;
                    const result = exerciseSession.submitAnswer(sessionId, userAnswer, validationResult);
                    return res.json(result);
                }
            }
            
            if (method === 'PUT') {
                if (action === 'next') {
                    const result = exerciseSession.nextExercise(sessionId);
                    return res.json(result);
                }
                
                if (action === 'complete') {
                    const result = exerciseSession.completeSession(sessionId);
                    return res.json(result);
                }
            }
            
            if (method === 'GET' && sessionId) {
                const session = exerciseSession.getSession(sessionId);
                if (!session) {
                    return res.status(404).json({ error: 'Session not found' });
                }
                return res.json({ session });
            }
            
            return res.status(400).json({ error: 'Invalid action' });
        }
        
        // Route: /api/achievements
        if (path === '/api/achievements' || path === '/achievements') {
            if (method === 'GET') {
                return res.json({ achievements: Object.values(ACHIEVEMENTS) });
            }
            
            if (method === 'POST') {
                const { achievementId, userId } = req.body;
                
                if (!ACHIEVEMENTS[achievementId]) {
                    return res.status(404).json({ error: 'Achievement not found' });
                }
                
                return res.json({
                    achievement: ACHIEVEMENTS[achievementId],
                    unlocked: true,
                });
            }
            
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        // Route: /api/daily-quests
        if (path === '/api/daily-quests' || path === '/daily-quests') {
            const today = new Date().toDateString();
            const quests = DAILY_QUESTS.map(quest => ({
                ...quest,
                completed: false,
                progress: 0,
            }));
            
            return res.json({
                date: today,
                quests: quests,
            });
        }
        
        // 404 for unknown routes
        return res.status(404).json({ error: 'API endpoint not found', path });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
};

