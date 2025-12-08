const { ACHIEVEMENTS } = require('./_game-mechanics');

module.exports = async (req, res) => {
    try {
        if (req.method === 'GET') {
            // Return all achievements
            return res.json({ achievements: Object.values(ACHIEVEMENTS) });
        }
        
        if (req.method === 'POST') {
            // Unlock achievement
            const { achievementId, userId } = req.body;
            
            if (!ACHIEVEMENTS[achievementId]) {
                return res.status(404).json({ error: 'Achievement not found' });
            }
            
            // In a real app, you'd save this to a database
            // For now, just return the achievement
            return res.json({
                achievement: ACHIEVEMENTS[achievementId],
                unlocked: true,
            });
        }
        
        res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

