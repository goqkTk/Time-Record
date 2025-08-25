const express = require('express');
const path = require('path');
const session = require('express-session');

// 설정 파일 및 모듈 import
const config = require('./config/config');
const Database = require('./db/database');
const { redirectIfAuthenticated } = require('./middleware/auth');

// 라우트 import
const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = config.server.port;

// 데이터베이스 초기화
const database = new Database();

// 미들웨어 설정
app.use(express.json());
app.use(session(config.session));
app.use(express.static(path.join(__dirname, 'public')));

// 데이터베이스 초기화 및 서버 시작
database.init().then((db) => {
  // 데이터베이스를 앱에 설정 (라우트에서 사용할 수 있도록)
  app.set('db', db);
  
  // 서버 시작
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('데이터베이스 초기화 실패:', err);
  process.exit(1);
});

// 라우트 설정
app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API 라우트 연결
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/settings', settingsRoutes);

// 메인 페이지 (인증 필요)
app.get('/', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});