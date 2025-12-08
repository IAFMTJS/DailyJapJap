const exerciseGenerator = require('./services/exercise-generator');
const answerValidator = require('./services/answer-validator');
const { getAllHiragana, getAllKatakana } = require('./_kana-data');

module.exports = async (req, res) => {
    try {
        console.log(`[Exercises API] ${req.method} ${req.path}`, req.query);
        const { type, skillId, difficulty = 1, exerciseType, count = 10, action } = req.query;
        
        // Test endpoint to verify route is working
        if (action === 'test') {
            return res.json({ 
                message: 'Exercises endpoint is working',
                type,
                skillId,
                timestamp: new Date().toISOString()
            });
        }
        
        // Handle answer validation
        if (action === 'validate' && req.method === 'POST') {
            const { exercise, userAnswer } = req.body;
            const result = answerValidator.validate(exercise, userAnswer);
            return res.json(result);
        }
        
        // Generate exercises
        if (type === 'vocabulary' || type === 'kana') {
            const skill = skillId || (type === 'kana' ? 'kana' : 'vocab');
            
            console.log(`Generating exercises: type=${type}, skillId=${skill}, count=${count}`);
            
            try {
                const exercises = await exerciseGenerator.generateExerciseSet(
                    skill,
                    parseInt(count),
                    parseInt(difficulty),
                    exerciseType || null
                );
                
                console.log(`Generated ${exercises.length} exercises`);
                
                if (exercises.length === 0) {
                    console.error('No exercises generated - returning 404');
                    return res.status(404).json({ 
                        error: 'No exercises available',
                        details: `Could not generate exercises for type=${type}, skillId=${skill}`
                    });
                }
                
                return res.json({
                    skillId: skill,
                    exercises: exercises,
                    count: exercises.length,
                    difficulty: parseInt(difficulty)
                });
            } catch (genError) {
                console.error('Error generating exercises:', genError);
                return res.status(500).json({ 
                    error: 'Failed to generate exercises',
                    details: genError.message,
                    stack: genError.stack
                });
            }
        }
        
        res.status(400).json({ error: 'Invalid exercise type' });
    } catch (error) {
        console.error('Exercise API error:', error);
        res.status(500).json({ error: error.message });
    }
};


