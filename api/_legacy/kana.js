const { hiragana, katakana, getAllHiragana, getAllKatakana, hiraganaLessons, katakanaLessons } = require('./_kana-data');

module.exports = async (req, res) => {
    try {
        const { type, day } = req.query;
        
        if (type === 'hiragana') {
            if (day) {
                // Get specific lesson
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
            // Return all hiragana
            return res.json({
                type: 'hiragana',
                all: getAllHiragana(),
                lessons: hiraganaLessons
            });
        }
        
        if (type === 'katakana') {
            if (day) {
                // Get specific lesson
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
            // Return all katakana
            return res.json({
                type: 'katakana',
                all: getAllKatakana(),
                lessons: katakanaLessons
            });
        }
        
        // Return both
        res.json({
            hiragana: {
                all: getAllHiragana(),
                lessons: hiraganaLessons
            },
            katakana: {
                all: getAllKatakana(),
                lessons: katakanaLessons
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

