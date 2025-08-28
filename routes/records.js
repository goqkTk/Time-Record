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

// 기록 수정 API
router.put('/:id', requireAuth, (req, res) => {
  const recordId = req.params.id;
  const userId = req.session.userId;
  const { startTime, endTime, duration } = req.body;
  
  if (!startTime || !endTime || !duration) {
    return res.status(400).json({ error: '필수 값 누락' });
  }
  
  const db = req.app.get('db');
  
  // 먼저 해당 레코드가 현재 사용자의 것인지 확인
  db.get('SELECT * FROM records WHERE id = ? AND user_id = ?', [recordId, userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB 오류' });
    if (!row) return res.status(404).json({ error: '레코드를 찾을 수 없거나 접근 권한이 없습니다.' });
    
    // 레코드 업데이트
    db.run(
      'UPDATE records SET start_time = ?, end_time = ?, duration = ? WHERE id = ? AND user_id = ?',
      [startTime, endTime, duration, recordId, userId],
      function(err) {
        if (err) return res.status(500).json({ error: 'DB 오류' });
        if (this.changes === 0) return res.status(404).json({ error: '레코드를 찾을 수 없거나 접근 권한이 없습니다.' });
        res.json({ success: true });
      }
    );
  });
});

// 기록 삭제 API
router.delete('/:id', requireAuth, (req, res) => {
  const recordId = req.params.id;
  const userId = req.session.userId;
  const db = req.app.get('db');
  
  // 먼저 해당 레코드가 현재 사용자의 것인지 확인
  db.get('SELECT * FROM records WHERE id = ? AND user_id = ?', [recordId, userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB 오류' });
    if (!row) return res.status(404).json({ error: '레코드를 찾을 수 없거나 접근 권한이 없습니다.' });
    
    // 레코드 삭제
    db.run(
      'DELETE FROM records WHERE id = ? AND user_id = ?',
      [recordId, userId],
      function(err) {
        if (err) return res.status(500).json({ error: 'DB 오류' });
        if (this.changes === 0) return res.status(404).json({ error: '레코드를 찾을 수 없거나 접근 권한이 없습니다.' });
        res.json({ success: true });
      }
    );
  });
});



module.exports = router;