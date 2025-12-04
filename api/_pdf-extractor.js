const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');

// Cache for extracted data
let wordsData = null;

async function extractPdfContent() {
    if (wordsData !== null) {
        return wordsData;
    }

    // Try multiple possible paths for Vercel
    const possiblePaths = [
        path.join(__dirname, '..', 'japwords.pdf'),
        path.join(process.cwd(), 'japwords.pdf'),
        path.join('/var/task', 'japwords.pdf'),
        path.join('/var/task', '..', 'japwords.pdf')
    ];
    
    let pdfPath = null;
    for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
            pdfPath = testPath;
            break;
        }
    }
    
    if (!pdfPath) {
        console.error('PDF not found. Tried paths:', possiblePaths);
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
                let wordMatch = line.match(/^\d+\.\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s*[–—]\s*([^–—]+)\s*[–—]\s*(.+)/);
                
                if (wordMatch) {
                    const japanese = wordMatch[1].trim();
                    let furigana = wordMatch[2].trim();
                    const translation = wordMatch[3].trim();
                    
                    // Clean up furigana but preserve long vowels (ō, ū, ē, ā, ī) and macrons
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

module.exports = extractPdfContent;

