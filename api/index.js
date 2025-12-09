// Consolidated API handler - single serverless function for all routes
const extractPdfContent = require('./_pdf-extractor');
const { hiragana, katakana, getAllHiragana, getAllKatakana, hiraganaLessons, katakanaLessons } = require('./_kana-data');
const { ACHIEVEMENTS, DAILY_QUESTS } = require('./_game-mechanics');
const exerciseGenerator = require('./services/exercise-generator');
const answerValidator = require('./services/answer-validator');
const exerciseSession = require('./services/exercise-session');

// Learning plan generator
async function getLearningPlan() {
    try {
        console.log('[Learning Plan] Starting plan generation...');
        const wordsData = await extractPdfContent();
        
        // Check for errors
        if (wordsData.error) {
            console.error('[Learning Plan] PDF extraction error:', wordsData.error);
            throw new Error(wordsData.error);
        }
        
        if (!wordsData || Object.keys(wordsData).length === 0) {
            console.error('[Learning Plan] No words data available');
            throw new Error('No words data available');
        }
        
        console.log(`[Learning Plan] Found ${Object.keys(wordsData).length} days of vocabulary`);
        
        const totalDays = Object.keys(wordsData).length;
        const vocabDays = Math.max(1, 30 - 14); // Ensure at least 1 day
        const allWords = Object.values(wordsData).flatMap(day => day.words || []);
        const wordsPerDay = allWords.length > 0 ? Math.ceil(allWords.length / vocabDays) : 10;
        
        const plan = [];
        
        // Week 1: Hiragana (Days 1-7)
        if (hiraganaLessons && hiraganaLessons.length > 0) {
            for (let i = 0; i < hiraganaLessons.length; i++) {
                plan.push({
                    day: hiraganaLessons[i].day,
                    type: 'hiragana',
                    title: hiraganaLessons[i].title,
                    description: hiraganaLessons[i].description,
                    characterCount: hiraganaLessons[i].chars?.length || 0
                });
            }
        }
        
        // Week 2: Katakana (Days 8-14)
        if (katakanaLessons && katakanaLessons.length > 0) {
            for (let i = 0; i < katakanaLessons.length; i++) {
                plan.push({
                    day: katakanaLessons[i].day,
                    type: 'katakana',
                    title: katakanaLessons[i].title,
                    description: katakanaLessons[i].description,
                    characterCount: katakanaLessons[i].chars?.length || 0
                });
            }
        }
        
        // Weeks 3-4: Vocabulary (Days 15-30)
        let wordIndex = 0;
        
        for (let day = 15; day <= 30; day++) {
            const dayWords = allWords.slice(wordIndex, wordIndex + wordsPerDay);
            wordIndex += wordsPerDay;
            
            plan.push({
                day: day,
                type: 'vocabulary',
                title: `Day ${day} Vocabulary`,
                description: `Learn ${dayWords.length} new words`,
                wordCount: dayWords.length
            });
        }
        
        console.log(`[Learning Plan] Generated plan with ${plan.length} items`);
        return plan;
    } catch (error) {
        console.error('[Learning Plan] Error generating plan:', error);
        console.error('[Learning Plan] Stack:', error.stack);
        throw error;
    }
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
        
        // Ensure we haven't already sent a response
        if (res.headersSent) {
            return;
        }
        
        // Handle both Express req.path and req.url
        // Express req.path doesn't include query string, req.url does
        // When routed via /api/*, req.path might be /days or /api/days
        let path = req.path || req.url?.split('?')[0] || '/';
        
        // If path doesn't start with /api, check if it should
        // When Express routes /api/*, req.path is the part after /api
        // But req.url or req.originalUrl might have the full path
        if (!path.startsWith('/api') && (req.originalUrl?.startsWith('/api') || req.url?.startsWith('/api'))) {
            // Reconstruct full path
            const fullPath = req.originalUrl?.split('?')[0] || req.url?.split('?')[0] || path;
            path = fullPath.startsWith('/api') ? fullPath : `/api${path}`;
        }
        
        // Normalize path (remove trailing slash, ensure it starts with /)
        path = path.replace(/\/$/, '') || '/';
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        // Also check without /api prefix for compatibility
        const pathWithoutApi = path.startsWith('/api') ? path.replace('/api', '') : path;
        
        const method = req.method;
        
        // Health check endpoint
        if (path === '/api/health' || path === '/health') {
            return res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                modules: {
                    extractPdfContent: typeof extractPdfContent === 'function',
                    exerciseGenerator: typeof exerciseGenerator === 'object',
                    answerValidator: typeof answerValidator === 'object',
                    exerciseSession: typeof exerciseSession === 'object'
                }
            });
        }
        
        console.log(`[API] ${method} ${path}`, { 
            query: req.query, 
            originalUrl: req.originalUrl, 
            url: req.url,
            pathWithoutApi: pathWithoutApi,
            reqPath: req.path
        });
        
        // Route: /api/days (handle both /api/days and /days)
        if (path === '/api/days' || path === '/days' || pathWithoutApi === '/days' || path.endsWith('/days')) {
            try {
                console.log('[API Days] Extracting PDF content...');
                const data = await extractPdfContent();
                
                if (data.error) {
                    console.error('[API Days] PDF extraction error:', data.error);
                    return res.status(500).json(data);
                }
                
                if (!data || Object.keys(data).length === 0) {
                    console.warn('[API Days] No data extracted from PDF');
                    return res.status(500).json({ error: 'No data found in PDF' });
                }
                
                console.log(`[API Days] Found ${Object.keys(data).length} days`);
                
                const daysList = [];
                for (const dayNum of Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b))) {
                    const dayInfo = data[dayNum];
                    daysList.push({
                        day: parseInt(dayNum),
                        title: dayInfo.title || "",
                        wordCount: dayInfo.words ? dayInfo.words.length : 0
                    });
                }
                
                console.log(`[API Days] Returning ${daysList.length} days`);
                return res.json({ days: daysList });
            } catch (error) {
                console.error('[API Days] Error:', error);
                console.error('[API Days] Stack:', error.stack);
                return res.status(500).json({ 
                    error: 'Failed to load days',
                    details: error.message 
                });
            }
        }
        
        // Route: /api/words/:day (handle both /api/words/:day and /words/:day)
        const wordsMatch = path.match(/\/(words)\/(\d+)$/) || pathWithoutApi.match(/\/(words)\/(\d+)$/);
        if (wordsMatch) {
            try {
                const day = parseInt(wordsMatch[2]);
                console.log(`[API Words] Loading words for day ${day}...`);
                
                const data = await extractPdfContent();
                
                if (data.error) {
                    console.error('[API Words] PDF extraction error:', data.error);
                    return res.status(500).json(data);
                }
                
                if (!data[day]) {
                    console.warn(`[API Words] Day ${day} not found in data`);
                    return res.status(404).json({ error: `Day ${day} not found` });
                }
                
                const dayInfo = data[day];
                console.log(`[API Words] Returning ${dayInfo.words?.length || 0} words for day ${day}`);
                
                return res.json({
                    day: day,
                    title: dayInfo.title || "",
                    words: dayInfo.words || []
                });
            } catch (error) {
                console.error('[API Words] Error:', error);
                console.error('[API Words] Stack:', error.stack);
                return res.status(500).json({ 
                    error: 'Failed to load words',
                    details: error.message 
                });
            }
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
        
        // Route: /api/kana (handle both /api/kana and /kana)
        if (path === '/api/kana' || path === '/kana' || pathWithoutApi === '/kana' || path.endsWith('/kana')) {
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
                // Return lessons structure for selector
                return res.json({ 
                    hiragana: {
                        characters: getAllHiragana(),
                        lessons: hiraganaLessons
                    },
                    katakana: {
                        characters: getAllKatakana(),
                        lessons: katakanaLessons
                    }
                });
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
                // Return lessons structure for selector
                return res.json({ 
                    hiragana: {
                        characters: getAllHiragana(),
                        lessons: hiraganaLessons
                    },
                    katakana: {
                        characters: getAllKatakana(),
                        lessons: katakanaLessons
                    }
                });
            }
            
            // Default: return both with lessons structure
            return res.json({
                hiragana: {
                    characters: getAllHiragana(),
                    lessons: hiraganaLessons
                },
                katakana: {
                    characters: getAllKatakana(),
                    lessons: katakanaLessons
                }
            });
        }
        
        // Route: /api/learning-plan (handle both /api/learning-plan and /learning-plan)
        if (path === '/api/learning-plan' || path === '/learning-plan' || pathWithoutApi === '/learning-plan' || path.endsWith('/learning-plan')) {
            try {
                console.log('[API Learning Plan] Generating learning plan...');
                const plan = await getLearningPlan();
                console.log(`[API Learning Plan] Generated plan with ${plan?.length || 0} items`);
                
                if (!plan || plan.length === 0) {
                    console.warn('[API Learning Plan] Plan is empty!');
                    return res.status(500).json({ 
                        error: 'Learning plan is empty',
                        details: 'No lessons could be generated. Check if PDF data is available.'
                    });
                }
                
                return res.json({ plan });
            } catch (planError) {
                console.error('[API Learning Plan] Error:', planError);
                console.error('[API Learning Plan] Stack:', planError.stack);
                return res.status(500).json({ 
                    error: 'Failed to generate learning plan',
                    details: planError.message,
                    stack: process.env.NODE_ENV === 'development' ? planError.stack : undefined
                });
            }
        }
        
        // Route: /api/exercises
        if (path === '/api/exercises' || path === '/exercises') {
            const { type, skillId, difficulty = 1, exerciseType, count = 10, action } = req.query;
            
            console.log(`[API Exercises] type=${type}, skillId=${skillId}, count=${count}, difficulty=${difficulty}`);
            
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
                
                console.log(`[API Exercises] Generating exercises for skill: ${skill}, type: ${type}, count: ${count}`);
                
                try {
                    // Validate inputs
                    const exerciseCount = parseInt(count) || 10;
                    const exerciseDifficulty = parseInt(difficulty) || 1;
                    
                    if (!exerciseGenerator || typeof exerciseGenerator.generateExerciseSet !== 'function') {
                        throw new Error('Exercise generator not properly initialized');
                    }
                    
                    const exercises = await exerciseGenerator.generateExerciseSet(
                        skill,
                        exerciseCount,
                        exerciseDifficulty,
                        exerciseType || null
                    );
                    
                    console.log(`[API Exercises] Generated ${exercises?.length || 0} exercises`);
                    
                    if (!exercises || exercises.length === 0) {
                        console.warn(`[API Exercises] No exercises generated for skillId: ${skill}, type: ${type}`);
                        return res.status(404).json({ 
                            error: 'No exercises available',
                            details: `Could not generate exercises for skillId: ${skill}, type: ${type}. This might mean there are no words available for this skill.`
                        });
                    }
                    
                    return res.json({ exercises });
                } catch (exError) {
                    console.error('[API Exercises] Error generating exercises:', exError);
                    console.error('[API Exercises] Error message:', exError.message);
                    console.error('[API Exercises] Stack:', exError.stack);
                    return res.status(500).json({ 
                        error: 'Failed to generate exercises',
                        details: exError.message,
                        skillId: skill,
                        type: type,
                        stack: process.env.NODE_ENV === 'development' ? exError.stack : undefined
                    });
                }
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
        
        // 404 for unknown routes - log for debugging
        console.warn(`[API] 404 - Unknown route: ${path} (pathWithoutApi: ${pathWithoutApi})`);
        console.warn(`[API] Request details:`, {
            method: req.method,
            path: req.path,
            url: req.url,
            originalUrl: req.originalUrl,
            query: req.query
        });
        return res.status(404).json({ 
            error: 'API endpoint not found', 
            path: path,
            pathWithoutApi: pathWithoutApi,
            availableEndpoints: [
                '/api/days',
                '/api/words/:day',
                '/api/kana',
                '/api/learning-plan',
                '/api/stats',
                '/api/exercises'
            ]
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
};

