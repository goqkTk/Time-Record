const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// DB 초기화
const db = new sqlite3.Database('./time-record.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT,
    end_time TEXT,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 기록 저장 API
app.post('/api/record', (req, res) => {
  const { startTime, endTime, duration } = req.body;
  if (!startTime || !endTime || !duration) {
    return res.status(400).json({ error: '필수 값 누락' });
  }
  db.run(
    'INSERT INTO records (start_time, end_time, duration) VALUES (?, ?, ?)',
    [startTime, endTime, duration],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB 오류' });
      res.json({ id: this.lastID });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 