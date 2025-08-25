const express = require('express');
const router = express.Router();

// 사용자 설정 조회
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const db = req.app.get('db');
    
    db.all(
      'SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?',
      [userId],
      (err, rows) => {
        if (err) {
          console.error('설정 조회 실패:', err);
          return res.status(500).json({ error: '설정 조회에 실패했습니다.' });
        }
        
        // 설정을 객체 형태로 변환
        const settings = {};
        rows.forEach(row => {
          settings[row.setting_key] = row.setting_value;
        });
        
        res.json(settings);
      }
    );
  } catch (error) {
    console.error('설정 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 설정 저장/업데이트
router.post('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const { settingKey, settingValue } = req.body;
    
    if (!settingKey || settingValue === undefined) {
      return res.status(400).json({ error: '설정 키와 값이 필요합니다.' });
    }

    const db = req.app.get('db');
    
    // UPSERT (INSERT OR REPLACE) 쿼리
    db.run(
      `INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, settingKey, settingValue],
      function(err) {
        if (err) {
          console.error('설정 저장 실패:', err);
          return res.status(500).json({ error: '설정 저장에 실패했습니다.' });
        }
        
        res.json({ 
          success: true, 
          message: '설정이 저장되었습니다.',
          settingKey,
          settingValue
        });
      }
    );
  } catch (error) {
    console.error('설정 저장 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;