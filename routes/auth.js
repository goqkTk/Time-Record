const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// 회원가입 API
router.post('/register', async (req, res) => {
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
    const db = req.app.get('db');
    
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
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }
  
  const db = req.app.get('db');
  
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
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
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