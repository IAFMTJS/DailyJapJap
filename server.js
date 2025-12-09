const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');

const app = express();
const PORT = 3000;

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit - log and continue
});

app.use(cors());
app.use(express.json());

// API routes must come BEFORE static file serving to avoid conflicts
// Use consolidated API handler for all routes
let apiHandler;
try {
    apiHandler = require('./api/index.js');
    console.log('✅ API handler loaded successfully');
} catch (error) {
    console.error('❌ Failed to load API handler:', error);
    console.error('Stack:', error.stack);
    // Create a fallback handler that returns errors
    apiHandler = async (req, res) => {
        res.status(500).json({ 
            error: 'API handler failed to load',
            details: error.message 
        });
    };
}

// Route all API requests to the consolidated handler
app.all('/api/*', async (req, res) => {
    try {
        console.log(`[Server] API Request: ${req.method} ${req.path || req.url}`);
        await apiHandler(req, res);
    } catch (error) {
        console.error('❌ API Error:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Stack:', error.stack);
        // Ensure we always send a response
        if (!res.headersSent) {
            try {
                res.status(500).json({ 
                    error: error.message || 'Internal server error',
                    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            } catch (sendError) {
                console.error('❌ Failed to send error response:', sendError);
            }
        }
    }
});

// Serve static files from public directory
// fallthrough: true (default) ensures that if a file is not found, it passes to the next middleware
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

// All API routes are now handled by the consolidated handler above

// Handle favicon requests (prevent 404 errors)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content, but successful
});

// Service Worker - must be served with correct MIME type
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Manifest - must be served with correct MIME type
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Catch-all handler: serve index.html for all non-API routes
// This allows the client-side router to handle routing
// Must be placed AFTER all other routes and static file serving
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Don't serve index.html for static file requests (images, CSS, JS, etc.)
    // These should be handled by express.static above
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/)) {
        return res.status(404).send('File not found');
    }
    
    // Serve index.html for all other routes (SPA routing)
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('Error loading application');
        }
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📚 Extracting PDF content...');
    try {
        await extractPdfContent();
        console.log('✅ Ready to serve!');
    } catch (error) {
        console.error('⚠️ Warning: PDF extraction failed on startup:', error.message);
        console.error('Server will continue, but some features may not work until PDF is available.');
        console.log('✅ Server running (with warnings)');
    }
});

// Handle server errors gracefully
app.on('error', (error) => {
    console.error('❌ Server error:', error);
});

// Keep server alive even on errors
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

