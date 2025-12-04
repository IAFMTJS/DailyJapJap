from flask import Flask, jsonify, send_from_directory, Response
from flask_cors import CORS
import pdfplumber
import json
import os
import re
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app)

# Ensure JSON responses use UTF-8
app.config['JSON_AS_ASCII'] = False

# Cache for extracted data
words_data = None

def extract_pdf_content():
    """Extract content from japwords.pdf and organize by days"""
    global words_data
    if words_data is not None:
        return words_data
    
    pdf_path = 'japwords.pdf'
    if not os.path.exists(pdf_path):
        return {"error": "PDF file not found"}
    
    days_data = {}
    current_day = None
    current_day_title = ""
    current_words = []
    day_counter = 0  # Sequential counter to handle duplicates
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text:
                    continue
                
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    if not line or line == '.':
                        continue
                    
                    # Look for day markers: "Dag X – Title"
                    day_match = re.search(r'Dag\s+(\d+)\s*[–—]\s*(.+)', line, re.IGNORECASE)
                    if day_match:
                        # Save previous day if exists
                        if current_day is not None and current_words:
                            days_data[current_day] = {
                                "title": current_day_title,
                                "words": current_words
                            }
                        
                        # Use sequential counter to avoid duplicates
                        day_counter += 1
                        current_day = day_counter
                        current_day_title = day_match.group(2).strip()
                        current_words = []
                        continue
                    
                    # Parse word entries: "number. japanese – furigana – translation"
                    if current_day is not None:
                        # Pattern: number. japanese – furigana – translation
                        # Try multiple patterns
                        word_match = re.match(r'^\d+\.\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s*[–—]\s*([^–—]+?)\s*[–—]\s*(.+)', line)
                        if word_match:
                            japanese = word_match.group(1).strip()
                            furigana = word_match.group(2).strip()
                            translation = word_match.group(3).strip()
                            
                            # Clean up furigana (remove any extra characters)
                            furigana = re.sub(r'[^\u3040-\u309F\u30A0-\u30FFa-zA-Z\s]', '', furigana).strip()
                            
                            current_words.append({
                                "japanese": japanese,
                                "furigana": furigana,
                                "translation": translation,
                                "sentence": ""
                            })
                        else:
                            # Fallback: try simpler pattern
                            simple_match = re.match(r'^\d+\.\s+([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s*[–—]\s*(.+)', line)
                            if simple_match:
                                japanese = simple_match.group(1).strip()
                                rest = simple_match.group(2).strip()
                                # Try to split rest into furigana and translation
                                parts = re.split(r'\s*[–—]\s*', rest, 1)
                                if len(parts) == 2:
                                    furigana = parts[0].strip()
                                    translation = parts[1].strip()
                                else:
                                    furigana = ""
                                    translation = rest
                                
                                current_words.append({
                                    "japanese": japanese,
                                    "furigana": furigana,
                                    "translation": translation,
                                    "sentence": ""
                                })
            
            # Save last day
            if current_day is not None and current_words:
                days_data[current_day] = {
                    "title": current_day_title,
                    "words": current_words
                }
        
        words_data = days_data
        return days_data
    
    except Exception as e:
        import traceback
        return {"error": f"Error extracting PDF: {str(e)}\n{traceback.format_exc()}"}

def parse_word_line(line):
    """Parse a line to extract Japanese word, furigana, and translation"""
    # Remove extra whitespace
    line = re.sub(r'\s+', ' ', line).strip()
    
    # Skip if line is too short or doesn't contain Japanese
    if len(line) < 3 or not re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', line):
        return None
    
    # Pattern 1: Japanese (furigana) - translation
    # Matches: 日本語（にほんご）- English translation
    pattern1 = r'([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s*[（(]?([\u3040-\u309F]+)?[）)]?\s*[-–—]\s*(.+)'
    match = re.search(pattern1, line)
    if match:
        japanese = match.group(1).strip()
        furigana = match.group(2).strip() if match.group(2) else ""
        translation = match.group(3).strip()
        # Clean up translation (remove any trailing Japanese)
        translation = re.sub(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+.*$', '', translation).strip()
        if translation:
            return {
                "japanese": japanese,
                "furigana": furigana,
                "translation": translation,
                "sentence": ""
            }
    
    # Pattern 2: Japanese - translation (no furigana)
    pattern2 = r'([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s*[-–—]\s*(.+)'
    match = re.search(pattern2, line)
    if match:
        japanese = match.group(1).strip()
        translation = match.group(2).strip()
        # Clean up translation
        translation = re.sub(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+.*$', '', translation).strip()
        if translation:
            return {
                "japanese": japanese,
                "furigana": "",
                "translation": translation,
                "sentence": ""
            }
    
    # Pattern 3: Japanese with furigana in brackets: 日本語[にほんご] - translation
    pattern3 = r'([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)\s*\[([\u3040-\u309F]+)\]\s*[-–—]\s*(.+)'
    match = re.search(pattern3, line)
    if match:
        japanese = match.group(1).strip()
        furigana = match.group(2).strip()
        translation = match.group(3).strip()
        translation = re.sub(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+.*$', '', translation).strip()
        if translation:
            return {
                "japanese": japanese,
                "furigana": furigana,
                "translation": translation,
                "sentence": ""
            }
    
    # Pattern 4: Just Japanese word (might be standalone)
    # Only accept if it's a reasonable length (not a full sentence)
    japanese_only = re.match(r'^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{1,10}$', line)
    if japanese_only:
        return {
            "japanese": line,
            "furigana": "",
            "translation": "",
            "sentence": ""
        }
    
    return None

def parse_alternative_structure(pdf_path):
    """Alternative parsing method if day structure isn't clear"""
    days_data = {}
    try:
        with pdfplumber.open(pdf_path) as pdf:
            all_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    all_text += text + "\n"
            
            # Try to find any numbered sections
            lines = all_text.split('\n')
            current_section = 1
            current_words = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Look for any number that might indicate a section
                if re.match(r'^\d+[\.\)]\s', line) or re.match(r'^第\d+', line):
                    if current_words:
                        days_data[current_section] = current_words
                        current_section += 1
                        current_words = []
                
                # Try to parse as word
                if re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', line):
                    word_entry = parse_word_line(line)
                    if word_entry:
                        current_words.append(word_entry)
            
            if current_words:
                days_data[current_section] = current_words
    
    except Exception as e:
        print(f"Alternative parsing error: {e}")
    
    return days_data

def parse_by_pages(pdf_path):
    """Parse by pages as last resort"""
    days_data = {}
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for day, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if not text:
                    continue
                
                words = []
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Look for Japanese characters
                    if re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', line):
                        word_entry = parse_word_line(line)
                        if word_entry:
                            words.append(word_entry)
                
                if words:
                    days_data[day] = words
    
    except Exception as e:
        print(f"Page parsing error: {e}")
    
    return days_data

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/days')
def get_days():
    """Get all available days with titles"""
    data = extract_pdf_content()
    if "error" in data:
        return jsonify(data), 500
    
    days_list = []
    for day_num in sorted(data.keys()):
        day_info = data[day_num]
        days_list.append({
            "day": day_num,
            "title": day_info.get("title", ""),
            "wordCount": len(day_info.get("words", []))
        })
    
    return jsonify({"days": days_list})

@app.route('/api/words/<int:day>')
def get_words(day):
    """Get words for a specific day"""
    data = extract_pdf_content()
    if "error" in data:
        return jsonify(data), 500
    
    if day not in data:
        return jsonify({"error": f"Day {day} not found"}), 404
    
    day_info = data[day]
    return jsonify({
        "day": day,
        "title": day_info.get("title", ""),
        "words": day_info.get("words", [])
    })

@app.route('/api/all-words')
def get_all_words():
    """Get all words from all days"""
    data = extract_pdf_content()
    if "error" in data:
        return jsonify(data), 500
    
    return jsonify(data)

@app.route('/api/stats')
def get_stats():
    """Get learning statistics"""
    data = extract_pdf_content()
    if "error" in data:
        return jsonify(data), 500
    
    total_words = sum(len(day_info.get("words", [])) for day_info in data.values())
    total_days = len(data)
    
    return jsonify({
        "totalDays": total_days,
        "totalWords": total_words,
        "averageWordsPerDay": round(total_words / total_days, 1) if total_days > 0 else 0
    })

if __name__ == '__main__':
    # Extract data on startup
    print("Extracting PDF content...")
    extract_pdf_content()
    print("Starting server...")
    app.run(debug=True, port=5000)

