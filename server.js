require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// DB 초기화
const db = new sqlite3.Database('./time-record.db');
db.serialize(() => {
  // users 테이블 생성
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT,
    end_time TEXT,
    duration INTEGER,
    paused_intervals TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(express.json());
app.use(session({
  secret: 'time-record-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24시간
}));
app.use(express.static(path.join(__dirname, 'public')));



// /login 라우트 추가
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 인증 미들웨어
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
}

// 회원가입 API
app.post('/api/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  
  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ error: '비밀번호가 일치하지 않습니다.' });
  }
  
  if (password.length < 4) {
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ error: '아이디는 3자 이상이어야 합니다.' });
  }
  
  try {
    // 사용자명 중복 확인
    const usernameCheck = await new Promise((resolve, reject) => {
      db.get('SELECT username FROM users WHERE username = ?',
        [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (usernameCheck) {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 새 사용자 생성
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
      [username, hashedPassword], function(err) {
      if (err) {
        return res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
      }
      
      res.json({ message: '회원가입이 완료되었습니다.' });
    });
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});









// 로그인 API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }
  
  // 아이디로 사용자 찾기
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
    
    if (!user) {
      return res.status(400).json({ error: '존재하지 않는 아이디입니다.' });
    }
    
    try {
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({ error: '비밀번호가 올바르지 않습니다.' });
      }
      
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ success: true, message: '로그인되었습니다.' });
    } catch (error) {
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  });
});

// 로그아웃 API
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다.' });
    }
    res.json({ success: true, message: '로그아웃되었습니다.' });
  });
});

// 인증 상태 확인 API
app.get('/api/auth/check', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

// 기록 저장 API
app.post('/api/record', requireAuth, (req, res) => {
  const { startTime, endTime, duration, pausedIntervals } = req.body;
  if (!startTime || !endTime || !duration) {
    return res.status(400).json({ error: '필수 값 누락' });
  }
  
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
app.get('/api/records', requireAuth, (req, res) => {
  const userId = req.session.userId;
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});