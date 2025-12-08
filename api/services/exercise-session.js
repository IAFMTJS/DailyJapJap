// Exercise session management service
// Handles session state, progress tracking, and persistence

class ExerciseSession {
    constructor() {
        this.sessions = new Map(); // In-memory session storage
    }
    
    /**
     * Create a new exercise session
     * @param {string} userId - User identifier
     * @param {string} skillId - Skill identifier
     * @param {Array} exercises - Array of exercises
     * @returns {object} Session object
     */
    createSession(userId, skillId, exercises) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const session = {
            id: sessionId,
            userId: userId,
            skillId: skillId,
            exercises: exercises,
            currentIndex: 0,
            answers: [],
            score: 0,
            mistakes: 0,
            hearts: 5,
            startTime: Date.now(),
            lastActivity: Date.now(),
            completed: false,
            progress: 0
        };
        
        this.sessions.set(sessionId, session);
        return session;
    }
    
    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    /**
     * Get current exercise in session
     */
    getCurrentExercise(sessionId) {
        const session = this.getSession(sessionId);
        if (!session || session.completed) return null;
        
        return session.exercises[session.currentIndex] || null;
    }
    
    /**
     * Submit answer for current exercise
     */
    submitAnswer(sessionId, userAnswer, validationResult) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        const currentExercise = this.getCurrentExercise(sessionId);
        if (!currentExercise) {
            throw new Error('No current exercise');
        }
        
        const answer = {
            exerciseId: currentExercise.id,
            userAnswer: userAnswer,
            correct: validationResult.correct,
            score: validationResult.score,
            timestamp: Date.now()
        };
        
        session.answers.push(answer);
        
        if (validationResult.correct) {
            session.score += validationResult.score * (currentExercise.points || 10);
        } else {
            session.mistakes++;
            session.hearts = Math.max(0, session.hearts - 1);
        }
        
        // Update progress
        session.progress = ((session.currentIndex + 1) / session.exercises.length) * 100;
        session.lastActivity = Date.now();
        
        return {
            answer: answer,
            session: session,
            isComplete: session.currentIndex >= session.exercises.length - 1
        };
    }
    
    /**
     * Move to next exercise
     */
    nextExercise(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        
        if (session.currentIndex < session.exercises.length - 1) {
            session.currentIndex++;
            session.lastActivity = Date.now();
            return this.getCurrentExercise(sessionId);
        } else {
            session.completed = true;
            return null;
        }
    }
    
    /**
     * Get session summary
     */
    getSessionSummary(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) return null;
        
        const correctAnswers = session.answers.filter(a => a.correct).length;
        const totalAnswers = session.answers.length;
        const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
        const timeSpent = Date.now() - session.startTime;
        
        return {
            sessionId: session.id,
            skillId: session.skillId,
            totalExercises: session.exercises.length,
            completedExercises: session.answers.length,
            correctAnswers: correctAnswers,
            mistakes: session.mistakes,
            accuracy: Math.round(accuracy),
            score: Math.round(session.score),
            hearts: session.hearts,
            timeSpent: timeSpent,
            progress: session.progress,
            completed: session.completed
        };
    }
    
    /**
     * Save session to storage (for persistence)
     */
    saveSession(sessionId) {
        const session = this.getSession(sessionId);
        if (!session) return null;
        
        // In a real app, this would save to database
        // For now, return session data for client-side storage
        return {
            id: session.id,
            userId: session.userId,
            skillId: session.skillId,
            exercises: session.exercises,
            currentIndex: session.currentIndex,
            answers: session.answers,
            score: session.score,
            mistakes: session.mistakes,
            hearts: session.hearts,
            startTime: session.startTime,
            lastActivity: session.lastActivity,
            completed: session.completed
        };
    }
    
    /**
     * Restore session from storage
     */
    restoreSession(sessionData) {
        const session = {
            ...sessionData,
            progress: (sessionData.currentIndex / sessionData.exercises.length) * 100
        };
        
        this.sessions.set(session.id, session);
        return session;
    }
    
    /**
     * Delete session
     */
    deleteSession(sessionId) {
        return this.sessions.delete(sessionId);
    }
    
    /**
     * Clean up old sessions (older than 24 hours)
     */
    cleanupOldSessions() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > maxAge) {
                this.sessions.delete(sessionId);
            }
        }
    }
}

module.exports = new ExerciseSession();

