// Exercise session API endpoint
const exerciseSession = require('./services/exercise-session');

module.exports = async (req, res) => {
    try {
        const { sessionId, action } = req.query;
        
        if (req.method === 'POST') {
            // Create new session
            if (action === 'create') {
                const { userId, skillId, exercises } = req.body;
                const session = exerciseSession.createSession(userId, skillId, exercises);
                return res.json({ session: session });
            }
            
            // Submit answer
            if (action === 'answer') {
                const { userAnswer, validationResult } = req.body;
                const result = exerciseSession.submitAnswer(sessionId, userAnswer, validationResult);
                return res.json(result);
            }
            
            // Restore session
            if (action === 'restore') {
                const { sessionData } = req.body;
                const session = exerciseSession.restoreSession(sessionData);
                return res.json({ session: session });
            }
        }
        
        if (req.method === 'GET') {
            // Get current exercise
            if (action === 'current') {
                const exercise = exerciseSession.getCurrentExercise(sessionId);
                if (!exercise) {
                    return res.status(404).json({ error: 'No current exercise or session completed' });
                }
                return res.json({ exercise: exercise });
            }
            
            // Get session summary
            if (action === 'summary') {
                const summary = exerciseSession.getSessionSummary(sessionId);
                if (!summary) {
                    return res.status(404).json({ error: 'Session not found' });
                }
                return res.json({ summary: summary });
            }
            
            // Get session
            const session = exerciseSession.getSession(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            return res.json({ session: session });
        }
        
        if (req.method === 'PUT') {
            // Move to next exercise
            if (action === 'next') {
                const exercise = exerciseSession.nextExercise(sessionId);
                return res.json({ exercise: exercise, completed: exercise === null });
            }
        }
        
        if (req.method === 'DELETE') {
            // Delete session
            exerciseSession.deleteSession(sessionId);
            return res.json({ success: true });
        }
        
        res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        console.error('Session API error:', error);
        res.status(500).json({ error: error.message });
    }
};

