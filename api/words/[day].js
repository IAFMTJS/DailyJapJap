const extractPdfContent = require('../_pdf-extractor');

module.exports = async (req, res) => {
    try {
        // Vercel passes the day parameter in req.query or we can extract from URL
        const day = parseInt(req.query.day || req.url.match(/\/words\/(\d+)/)?.[1] || req.url.split('/').pop());
        const data = await extractPdfContent();
        
        if (data.error) {
            return res.status(500).json(data);
        }

        if (!data[day]) {
            return res.status(404).json({ error: `Day ${day} not found` });
        }

        const dayInfo = data[day];
        res.json({
            day: day,
            title: dayInfo.title || "",
            words: dayInfo.words || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

