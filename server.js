const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cache for extracted data
let wordsData = null;

async function extractPdfContent() {
    if (wordsData !== null) {
        return wordsData;
    }

    const pdfPath = path.join(__dirname, 'japwords.pdf');
    
    if (!fs.existsSync(pdfPath)) {
        return { error: "PDF file not found" };
    }

    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdf(dataBuffer);
        const text = pdfData.text;

        const daysData = {};
        let currentDay = null;
        let currentDayTitle = "";
        let currentWords = [];
        let dayCounter = 0;

        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line === '.') continue;

            // Look for day markers: "Dag X – Title"
            const dayMatch = line.match(/Dag\s+(\d+)\s*[–—]\s*(.+)/i);
            if (dayMatch) {
                // Save previous day if exists
                if (currentDay !== null && currentWords.length > 0) {
                    daysData[currentDay] = {
                        title: currentDayTitle,
                        words: currentWords
                    };
                }

                dayCounter++;
                currentDay = dayCounter;
                currentDayTitle = dayMatch[2].trim();
                currentWords = [];
                continue;
            }

            // Parse word entries: "number. japanese – furigana – translation"
            if (currentDay !== null) {
                // Pattern: number. japanese – furigana – translation
                // Use a more precise pattern that captures everything between the dashes
                let wordMatch = line.match(/^\d+\.\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s*[–—]\s*([^–—]+)\s*[–—]\s*(.+)/);
                
                if (wordMatch) {
                    const japanese = wordMatch[1].trim();
                    let furigana = wordMatch[2].trim();
                    const translation = wordMatch[3].trim();
                    
                    // Clean up furigana but preserve long vowels (ō, ū, ē, ā, ī) and macrons
                    // Allow hiragana, katakana, romaji (including long vowels), spaces, and common punctuation
                    // Only remove truly unwanted characters, keep long vowels
                    furigana = furigana.replace(/[^\u3040-\u309F\u30A0-\u30FFa-zA-ZāēīōūĀĒĪŌŪ\s\-]/g, '').trim();
                    
                    currentWords.push({
                        japanese: japanese,
                        furigana: furigana,
                        translation: translation,
                        sentence: ""
                    });
                } else {
                    // Fallback: try simpler pattern
                    const simpleMatch = line.match(/^\d+\.\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s*[–—]\s*(.+)/);
                    if (simpleMatch) {
                        const japanese = simpleMatch[1].trim();
                        const rest = simpleMatch[2].trim();
                        const parts = rest.split(/[–—]/).map(p => p.trim());
                        
                        let furigana = "";
                        let translation = "";
                        
                        if (parts.length === 2) {
                            furigana = parts[0];
                            translation = parts[1];
                        } else {
                            translation = rest;
                        }
                        
                        // Clean furigana but preserve long vowels
                        if (furigana) {
                            furigana = furigana.replace(/[^\u3040-\u309F\u30A0-\u30FFa-zA-ZāēīōūĀĒĪŌŪ\s]/g, '').trim();
                        }
                        
                        currentWords.push({
                            japanese: japanese,
                            furigana: furigana,
                            translation: translation,
                            sentence: ""
                        });
                    }
                }
            }
        }

        // Save last day
        if (currentDay !== null && currentWords.length > 0) {
            daysData[currentDay] = {
                title: currentDayTitle,
                words: currentWords
            };
        }

        wordsData = daysData;
        console.log(`Extracted ${Object.keys(daysData).length} days with words`);
        return daysData;

    } catch (error) {
        console.error('Error extracting PDF:', error);
        return { error: `Error extracting PDF: ${error.message}` };
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/days', async (req, res) => {
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
});

app.get('/api/words/:day', async (req, res) => {
    try {
        const day = parseInt(req.params.day);
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
});

app.get('/api/stats', async (req, res) => {
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
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📚 Extracting PDF content...');
    await extractPdfContent();
    console.log('✅ Ready to serve!');
});

