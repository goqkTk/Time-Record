const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

/**
 * 사용자 유효성 검사 함수
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
 * 데이터베이스 쿼리 프로미스 래퍼
 */
const dbQuery = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

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
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    // 유효성 검사
    const validationErrors = validateUser(username, password, confirmPassword);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }
    
    const db = req.app.get('db');
    
    // 사용자명 중복 확인
    const existingUser = await dbQuery(db, 'SELECT username FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 새 사용자 생성
    await dbRun(db, 'INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    
    res.status(201).json({ success: true, message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/**
 * 로그인 API
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 유효성 검사
    const validationErrors = validateUser(username, password);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }
    
    const db = req.app.get('db');
    
    // 아이디로 사용자 찾기
    const user = await dbQuery(db, 'SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ error: '존재하지 않는 아이디입니다.' });
    }
    
    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: '비밀번호가 올바르지 않습니다.' });
    }
    
    // 세션에 사용자 정보 저장
    req.session.userId = user.id;
    req.session.username = user.username;
    
    res.json({ success: true, message: '로그인되었습니다.' });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/**
 * 로그아웃 API
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('로그아웃 오류:', err);
      return res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다.' });
    }
    res.json({ success: true, message: '로그아웃되었습니다.' });
  });
});

// 인증 상태 확인 API
router.get('/check', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;