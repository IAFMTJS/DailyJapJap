const extractPdfContent = require('./_pdf-extractor');

module.exports = async (req, res) => {
    try {
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

        res.json({ days: daysList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

