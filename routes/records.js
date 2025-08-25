const express = require('express');
const router = express.Router();

// 인증 미들웨어
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
}

// 기록 저장 API
router.post('/', requireAuth, (req, res) => {
  const { startTime, endTime, duration, pausedIntervals } = req.body;
  if (!startTime || !endTime || !duration) {
    return res.status(400).json({ error: '필수 값 누락' });
  }
  
  const db = req.app.get('db');
  
  // pausedIntervals를 JSON 문자열로 변환
  const pausedIntervalsJson = pausedIntervals ? JSON.stringify(pausedIntervals) : null;
  const userId = req.session.userId;
  
  db.run(
    'INSERT INTO records (start_time, end_time, duration, paused_intervals, user_id) VALUES (?, ?, ?, ?, ?)',
    [startTime, endTime, duration, pausedIntervalsJson, userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB 오류' });
      res.json({ id: this.lastID });
    }
  );
});

// 기록 조회 API
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const db = req.app.get('db');
  
  db.all('SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB 오류' });
    
    // paused_intervals JSON 문자열을 객체로 파싱
    const processedRows = rows.map(row => ({
      ...row,
      paused_intervals: row.paused_intervals ? JSON.parse(row.paused_intervals) : []
    }));
    
    res.json(processedRows);
  });
});



module.exports = router;