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
    paused_intervals TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // 기존 테이블에 paused_intervals 컬럼 추가 (이미 존재하면 무시됨)
  db.run(`ALTER TABLE records ADD COLUMN paused_intervals TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('컬럼 추가 오류:', err);
    }
  });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 기록 저장 API
app.post('/api/record', (req, res) => {
  const { startTime, endTime, duration, pausedIntervals } = req.body;
  if (!startTime || !endTime || !duration) {
    return res.status(400).json({ error: '필수 값 누락' });
  }
  
  // pausedIntervals를 JSON 문자열로 변환
  const pausedIntervalsJson = pausedIntervals ? JSON.stringify(pausedIntervals) : null;
  
  db.run(
    'INSERT INTO records (start_time, end_time, duration, paused_intervals) VALUES (?, ?, ?, ?)',
    [startTime, endTime, duration, pausedIntervalsJson],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB 오류' });
      res.json({ id: this.lastID });
    }
  );
});

// 기록 조회 API
app.get('/api/records', (req, res) => {
  db.all('SELECT * FROM records ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB 오류' });
    
    // paused_intervals JSON 문자열을 객체로 파싱
    const processedRows = rows.map(row => ({
      ...row,
      paused_intervals: row.paused_intervals ? JSON.parse(row.paused_intervals) : []
    }));
    
    res.json(processedRows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});