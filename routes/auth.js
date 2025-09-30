const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

/**
 * 표준화된 응답 생성 함수
 * @param {boolean} success - 요청 성공 여부
 * @param {string} message - 응답 메시지
 * @param {object|null} data - 응답 데이터 (선택적)
 * @param {string|null} error - 에러 메시지 (선택적)
 * @returns {object} - 표준화된 응답 객체
 */
const createResponse = (success, message, data = null, error = null) => {
  const response = { success, message };
  if (data) response.data = data;
  if (error) response.error = error;
  return response;
};

/**
 * 사용자 유효성 검사 함수
 * @param {string} username - 사용자명
 * @param {string} password - 비밀번호
 * @param {string} [confirmPassword] - 비밀번호 확인 (선택적)
 * @returns {Array<string>} - 유효성 검사 오류 메시지 배열
 */
const validateUser = (username, password, confirmPassword) => {
  const errors = [];
  
  if (!username || !password) {
    errors.push('아이디와 비밀번호를 입력해주세요.');
  }
  
  if (confirmPassword !== undefined && password !== confirmPassword) {
    errors.push('비밀번호가 일치하지 않습니다.');
  }
  
  if (password && password.length < 4) {
    errors.push('비밀번호는 4자 이상이어야 합니다.');
  }
  
  if (username && username.length < 3) {
    errors.push('아이디는 3자 이상이어야 합니다.');
  }
  
  return errors;
};

/**
 * 데이터베이스 단일 행 조회 프로미스 래퍼
 * @param {object} db - 데이터베이스 연결 객체
 * @param {string} query - SQL 쿼리문
 * @param {Array} [params=[]] - 쿼리 파라미터
 * @returns {Promise<object|null>} - 조회 결과
 */
const dbQuery = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

/**
 * 데이터베이스 실행 프로미스 래퍼
 * @param {object} db - 데이터베이스 연결 객체
 * @param {string} query - SQL 쿼리문
 * @param {Array} [params=[]] - 쿼리 파라미터
 * @returns {Promise<{id: number, changes: number}>} - 실행 결과
 */
const dbRun = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

/**
 * 회원가입 API
 * POST /api/auth/register
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 * @returns {object} - 회원가입 결과
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    // 유효성 검사
    const validationErrors = validateUser(username, password, confirmPassword);
    if (validationErrors.length > 0) {
      return res.status(400).json(createResponse(false, validationErrors[0], null, validationErrors[0]));
    }
    
    const db = req.app.get('db');
    
    // 사용자명 중복 확인
    const existingUser = await dbQuery(db, 'SELECT username FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json(createResponse(false, '이미 존재하는 아이디입니다.', null, '이미 존재하는 아이디입니다.'));
    }
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 새 사용자 생성
    await dbRun(db, 'INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    
    res.status(201).json(createResponse(true, '회원가입이 완료되었습니다.'));
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json(createResponse(false, '서버 오류가 발생했습니다.', null, '서버 오류가 발생했습니다.'));
  }
});

/**
 * 로그인 API
 * POST /api/auth/login
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 * @returns {object} - 로그인 결과
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 유효성 검사
    const validationErrors = validateUser(username, password);
    if (validationErrors.length > 0) {
      return res.status(400).json(createResponse(false, validationErrors[0], null, validationErrors[0]));
    }
    
    const db = req.app.get('db');
    
    // 아이디로 사용자 찾기
    const user = await dbQuery(db, 'SELECT * FROM users WHERE username = ?', [username]);
    
    // 보안을 위해 아이디나 비밀번호가 틀렸을 때 동일한 메시지 반환
    if (!user || !(await bcrypt.compare(password, user?.password || ''))) {
      return res.status(400).json(createResponse(false, '아이디 또는 비밀번호가 올바르지 않습니다.', null, '아이디 또는 비밀번호가 올바르지 않습니다.'));
    }
    
    // 세션에 사용자 정보 저장
    req.session.userId = user.id;
    req.session.username = user.username;
    
    res.json(createResponse(true, '로그인되었습니다.'));
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json(createResponse(false, '서버 오류가 발생했습니다.', null, '서버 오류가 발생했습니다.'));
  }
});

/**
 * 로그아웃 API
 * POST /api/auth/logout
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 * @returns {object} - 로그아웃 결과
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('로그아웃 오류:', err);
      return res.status(500).json(createResponse(false, '로그아웃 중 오류가 발생했습니다.', null, '로그아웃 중 오류가 발생했습니다.'));
    }
    res.json(createResponse(true, '로그아웃되었습니다.'));
  });
});

/**
 * 인증 상태 확인 API
 * GET /api/auth/check
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 * @returns {object} - 인증 상태
 */
router.get('/check', (req, res) => {
  try {
    // 세션 객체가 존재하는지 확인
    if (!req.session) {
      console.error('세션 객체가 존재하지 않습니다.');
      return res.status(500).json({ 
        success: false, 
        authenticated: false,
        error: '세션 오류가 발생했습니다.' 
      });
    }
    
    // 인증 상태 확인
    if (req.session.userId) {
      return res.json({ 
        success: true, 
        authenticated: true, 
        username: req.session.username 
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        authenticated: false 
      });
    }
  } catch (error) {
    console.error('인증 확인 중 오류 발생:', error);
    return res.status(500).json({ 
      success: false, 
      authenticated: false,
      error: '인증 확인 중 서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;