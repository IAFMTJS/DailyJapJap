# 🇯🇵 Daily Japanese Learning Platform

A modern, sophisticated Japanese learning platform built with Node.js and Express. Learn Japanese words day by day with an advanced interface featuring flashcards, quizzes, and progress tracking.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Make sure `japwords.pdf` is in the root directory**

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 🌐 Vercel Deployment

### Framework Selection
When deploying to Vercel, select: **Other** or **Node.js**

The project is configured with:
- **Backend:** Node.js with Express (serverless functions)
- **Frontend:** Vanilla JavaScript (static files)

### Deployment Steps

1. **Connect your repository to Vercel**
2. **Framework Preset:** Select **"Other"** or **"Node.js"**
3. **Root Directory:** Leave as default (root)
4. **Build Command:** Leave empty (no build needed)
5. **Output Directory:** Leave empty
6. **Install Command:** `npm install`

Vercel will automatically:
- Detect the `vercel.json` configuration
- Deploy API routes from `/api` as serverless functions
- Serve static files from `/public`

### Important Files for Vercel
- `vercel.json` - Vercel configuration
- `api/index.js` - Serverless API handler
- `public/` - Static frontend files
- `package.json` - Dependencies

## ✨ Features

### 📖 Study Mode
- Browse words organized by days
- Toggle furigana and translation visibility
- Japanese text-to-speech pronunciation
- Beautiful card-based interface

### 🃏 Flashcard Mode
- Interactive 3D flip cards
- Rate difficulty (Easy/Hard)
- Progress tracking
- Study all days or specific days

### ✏️ Quiz Mode
- Multiple-choice questions
- Instant feedback
- Score tracking
- Randomized questions

### 📊 Analytics Dashboard
- Learning statistics
- Progress by day
- Study streak tracking
- Words mastered counter

## 🎨 Design Features

- **Glassmorphism UI** - Modern frosted glass effects
- **Animated Background** - Floating gradient orbs
- **Smooth Animations** - Polished transitions throughout
- **Responsive Design** - Works on all devices
- **Dark Theme** - Easy on the eyes

## 📁 Project Structure

```
DailyJapJap/
├── api/
│   └── index.js          # Vercel serverless function
├── server.js             # Local Express server
├── package.json          # npm dependencies
├── vercel.json           # Vercel configuration
├── japwords.pdf          # Source PDF file
├── public/               # Frontend files
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```

## 🔧 API Endpoints

- `GET /api/days` - Get all available days
- `GET /api/words/:day` - Get words for a specific day
- `GET /api/stats` - Get learning statistics

## 🛠️ Development

The server uses `pdf-parse` to extract content from the PDF file. The data is cached after first extraction for better performance.

## 📝 Notes

- Japanese text-to-speech requires browser support (Chrome/Edge recommended, iOS Chrome supported)
- Progress is saved in browser localStorage
- The PDF is parsed automatically on server start
- Long vowels (ō, ū, etc.) are preserved in furigana

## 🎯 Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla JavaScript, Modern CSS
- **PDF Parsing:** pdf-parse
- **Deployment:** Vercel (serverless)
- **Styling:** Custom CSS with CSS Variables

---

Made with ❤️ for learning Japanese
