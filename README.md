# 🇯🇵 Daily Japanese Learning Platform

A modern, sophisticated Japanese learning platform built with Node.js and Express. Learn Japanese words day by day with an advanced interface featuring flashcards, quizzes, and progress tracking.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

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
├── server.js          # Express server
├── package.json       # npm dependencies
├── japwords.pdf       # Source PDF file
├── public/            # Frontend files
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

- Japanese text-to-speech requires browser support (Chrome/Edge recommended)
- Progress is saved in browser localStorage
- The PDF is parsed automatically on server start

## 🎯 Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla JavaScript, Modern CSS
- **PDF Parsing:** pdf-parse
- **Styling:** Custom CSS with CSS Variables

---

Made with ❤️ for learning Japanese
