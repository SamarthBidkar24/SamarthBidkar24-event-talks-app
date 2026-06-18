# BigQuery Release Notes Explorer

A premium, interactive web application designed to track, query, and share Google Cloud BigQuery release notes in real-time. Built with a Python Flask backend and a modern vanilla HTML, JS, and CSS frontend.

## 🚀 Key Features

* **Feed Segmenter**: Automatically parses the daily consolidated RSS feeds from [Google Cloud BigQuery release notes xml](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml) and splits them into individual update logs.
* **Aesthetic Dashboard**: Styled with a dark-mode default glassmorphic layout, using custom CSS variables supporting on-the-fly dark/light theme toggles.
* **Interactive Stats & Category Pills**: Clicking on the dashboard metrics (Features, Announcements, Breaking Changes, Issues) instantly filters the card deck.
* **Instant Keyword Search**: Search across publication dates, category labels, or description bodies dynamically as you type.
* **In-Memory Cache & Force Sync**: Optimizes performance by caching raw data locally for up to 1 hour, paired with a manual **Refresh** button and loading spinner to bust the cache.
* **Dynamic Tweet (X) Composer**:
  * Generate customizable post copy using three styles (**💡 Summary**, **📢 Announcement**, **🚀 Tech Focus**).
  * Automatically compensates for link weights (calculating all URLs as 23 characters matching X's standard link parser).
  * Enforces the 280-character maximum and prevents posting if exceeded.

---

## 📂 Project Structure

```
SamarthBidkar24-event-talks-app/
├── app.py                   # Flask server, Atom feed parsing, and cache handlers
├── requirements.txt         # Python dependency configurations
├── .gitignore               # System, IDE, caching, and venv rules
├── templates/
│   └── index.html           # Core HTML structure & modal layouts
└── static/
    ├── css/
    │   └── style.css        # Premium style layouts & theme palettes
    └── js/
        └── main.js          # Client-side state, render mechanics, & Tweet composer
```

---

## 🛠️ Getting Started & Run Instructions

Follow these instructions to run the application locally on your system.

### Prerequisites
* Python 3.10 or higher.
* Git installed.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/SamarthBidkar24/SamarthBidkar24-event-talks-app.git
   cd SamarthBidkar24-event-talks-app
   ```

2. **Set up a Virtual Environment**:
   * On Windows:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * On macOS/Linux:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Flask Server**:
   ```bash
   python app.py
   ```

5. **Browse the Dashboard**:
   Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🧠 Technical Details

### Backend XML Segmentation
Google's release notes are structured using Atom RSS `<entry>` blocks. Usually, one entry encapsulates all changes made on a particular day:
```html
<entry>
  <title>June 15, 2026</title>
  <content type="html">
    <h3>Feature</h3>
    <p>Use Gemini Cloud Assist...</p>
    <h3>Issue</h3>
    <p>Support for configuring...</p>
  </content>
</entry>
```
The Flask backend splits this content string by `<h3>` tags using `BeautifulSoup` to index them as separate entries in the JSON payload, each containing its own specific metadata (`date`, `type`, `description`, `text_content`, `link`).

### Frontend State Control
State in `main.js` is stored within a single state engine (`appState`). When filters or search keywords change, the client re-runs `applyFiltersAndRender()` on the local cache array instead of querying the backend repeatedly, keeping filtering interactions immediate.

### URL Length Compensation for X
The composer text area uses a regular expression to extract URLs. Since X treats all URL links as exactly 23 characters long regardless of their real length, the calculator runs:
```javascript
let calculatedLength = text.length - url.length + 23;
```
This guarantees that the preview matches X's actual length validator.
