const express = require('express');
const path = require('path');
const session = require('express-session');

// 설정 파일 및 모듈 import
const config = require('./config/config');
const Database = require('./db/database');
const { redirectIfAuthenticated, requireAuth } = require('./middleware/auth');

// 라우트 import
const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = config.server.port || 3000;

/**
 * 미들웨어 설정
 */
// 기본 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(config.session));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 라우트 설정
 */
// 페이지 라우트
app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/settings', settingsRoutes);

/**
 * 에러 처리 미들웨어
 */
// 404 에러 처리
app.use((req, res, next) => {
  res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다.' });
});

// 서버 에러 처리
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

/**
 * 서버 시작
 */
const startServer = async () => {
  try {
    // 데이터베이스 초기화
    const database = new Database();
    const db = await database.init();
    
    // 데이터베이스를 앱에 설정 (라우트에서 사용할 수 있도록)
    app.set('db', db);
    
    // 서버 시작
    app.listen(PORT, () => {
      console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    });
  } catch (err) {
    console.error('서버 시작 실패:', err);
    process.exit(1);
  }
};

// 서버 시작 실행
startServer();