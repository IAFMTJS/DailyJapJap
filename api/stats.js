const extractPdfContent = require('./_pdf-extractor');

module.exports = async (req, res) => {
    try {
        const data = await extractPdfContent();
        if (data.error) {
            return res.status(500).json(data);
        }

        const totalWords = Object.values(data).reduce((sum, dayInfo) => {
            return sum + (dayInfo.words ? dayInfo.words.length : 0);
        }, 0);
        const totalDays = Object.keys(data).length;

        res.json({
            totalDays: totalDays,
            totalWords: totalWords,
            averageWordsPerDay: totalDays > 0 ? Math.round(totalWords / totalDays * 10) / 10 : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

