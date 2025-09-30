/**
 * Time-Record 애플리케이션 서버
 * 메인 엔트리 포인트
 * @module server
 */

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

/**
 * Express 애플리케이션 인스턴스
 * @type {import('express').Application}
 */
const app = express();

/**
 * 서버 포트 설정
 * @type {number}
 */
const PORT = config.server.port || 3000;

/**
 * 미들웨어 설정
 * 
 * 요청 처리를 위한 기본 미들웨어를 설정합니다.
 * - JSON 요청 본문 파싱
 * - URL 인코딩된 요청 본문 파싱
 * - 세션 관리
 * - 정적 파일 제공
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(config.session));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 라우트 설정
 * 
 * 웹 페이지 및 API 엔드포인트에 대한 라우트를 설정합니다.
 */

/**
 * 로그인 페이지 라우트
 * 이미 인증된 사용자는 대시보드로 리디렉션됩니다.
 * 
 * @param {import('express').Request} req - 요청 객체
 * @param {import('express').Response} res - 응답 객체
 */
app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/**
 * 메인 페이지(대시보드) 라우트
 * 인증되지 않은 사용자는 로그인 페이지로 리디렉션됩니다.
 * 
 * @param {import('express').Request} req - 요청 객체
 * @param {import('express').Response} res - 응답 객체
 */
app.get('/', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

/**
 * API 라우트 등록
 * 각 기능별 라우터를 특정 경로에 마운트합니다.
 */
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/settings', settingsRoutes);

/**
 * 에러 처리 미들웨어
 */

/**
 * 404 에러 처리 미들웨어
 * 요청한 리소스를 찾을 수 없을 때 404 응답을 반환합니다.
 * 
 * @param {import('express').Request} req - 요청 객체
 * @param {import('express').Response} res - 응답 객체
 * @param {import('express').NextFunction} next - 다음 미들웨어 함수
 */
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: '요청한 리소스를 찾을 수 없습니다.' });
});

/**
 * 서버 에러 처리 미들웨어
 * 서버 내부 오류 발생 시 500 응답을 반환합니다.
 * 
 * @param {Error} err - 발생한 에러 객체
 * @param {import('express').Request} req - 요청 객체
 * @param {import('express').Response} res - 응답 객체
 * @param {import('express').NextFunction} next - 다음 미들웨어 함수
 */
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({ success: false, error: '서버 내부 오류가 발생했습니다.' });
});

/**
 * 서버 시작 함수
 * 데이터베이스를 초기화하고 Express 서버를 시작합니다.
 * 
 * @async
 * @returns {Promise<void>}
 */
const startServer = async () => {
  try {
    // 데이터베이스 초기화
    const database = new Database();
    
    // 데이터베이스 경로 확인
    const fs = require('fs');
    const dbDir = path.dirname(config.database.filename);
    
    // db 디렉토리가 없으면 생성
    if (!fs.existsSync(dbDir) && dbDir !== '.') {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`데이터베이스 디렉토리 생성: ${dbDir}`);
    }
    
    const db = await database.init();
    
    // 데이터베이스를 앱에 설정 (라우트에서 사용할 수 있도록)
    app.set('db', db);
    
    // 서버 시작
    app.listen(PORT, () => {
      console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    });
  } catch (err) {
    console.error('서버 시작 실패:', err);
    console.error('오류 세부 정보:', err.stack);
    process.exit(1);
  }
};

// 서버 시작 실행
startServer();