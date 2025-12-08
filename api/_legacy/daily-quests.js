const { DAILY_QUESTS } = require('./_game-mechanics');

module.exports = async (req, res) => {
    try {
        const today = new Date().toDateString();
        
        // Get user's quest progress from localStorage (would be from DB in real app)
        // For now, return available quests
        const quests = DAILY_QUESTS.map(quest => ({
            ...quest,
            completed: false, // Would check user progress
            progress: 0, // Would get from user stats
        }));
        
        res.json({
            date: today,
            quests: quests,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

