const express = require('express');
const router = express.Router();

/**
 * 인증 미들웨어 - 사용자 로그인 상태 확인
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 * @returns {void}
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }
}

/**
 * 레코드 소유권 확인 미들웨어
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 함수
 * @returns {Promise<void>}
 */
async function checkRecordOwnership(req, res, next) {
  try {
    const recordId = req.params.id;
    const userId = req.session.userId;
    const db = req.app.get('db');
    
    const row = await executeSelectOne(db, 'SELECT * FROM records WHERE id = ? AND user_id = ?', [recordId, userId]);
    
    if (!row) {
      return res.status(404).json({ 
        success: false, 
        error: '레코드를 찾을 수 없거나 접근 권한이 없습니다.' 
      });
    }
    
    // 레코드 정보를 요청 객체에 저장하여 다음 미들웨어에서 사용할 수 있게 함
    req.record = row;
    next();
  } catch (err) {
    console.error('레코드 소유권 확인 중 오류 발생:', err.message);
    return res.status(500).json({ 
      success: false, 
      error: '데이터베이스 오류', 
      message: err.message 
    });
  }
}

/**
 * 날짜와 시간을 결합하는 유틸리티 함수
 * @param {string} targetDate - 대상 날짜 문자열
 * @param {string} startTime - 시작 시간 문자열
 * @returns {string} - 결합된 ISO 형식 날짜/시간 문자열
 */
function combineDateAndTime(targetDate, startTime) {
  if (!targetDate) return startTime;
  
  const targetDateObj = new Date(targetDate);
  const startTimeObj = new Date(startTime);
  
  targetDateObj.setHours(
    startTimeObj.getHours(),
    startTimeObj.getMinutes(),
    startTimeObj.getSeconds(),
    startTimeObj.getMilliseconds()
  );
  
  return targetDateObj.toISOString();
}

/**
 * 데이터베이스 쿼리 실행 헬퍼 함수
 * @param {Object} db - 데이터베이스 객체
 * @param {string} sql - SQL 쿼리문
 * @param {Array} params - 쿼리 파라미터
 * @returns {Promise<Object>} - 쿼리 결과
 */
function executeQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('데이터베이스 쿼리 실행 오류:', err.message);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * 데이터베이스 조회 헬퍼 함수
 * @param {Object} db - 데이터베이스 객체
 * @param {string} sql - SQL 쿼리문
 * @param {Array} params - 쿼리 파라미터
 * @returns {Promise<Array>} - 조회 결과
 */
function executeSelect(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('데이터베이스 조회 오류:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * 단일 레코드 조회 헬퍼 함수
 * @param {Object} db - 데이터베이스 객체
 * @param {string} sql - SQL 쿼리문
 * @param {Array} params - 쿼리 파라미터
 * @returns {Promise<Object|null>} - 조회 결과
 */
function executeSelectOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('데이터베이스 단일 레코드 조회 오류:', err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * 입력 유효성 검사 함수
 * @param {Object} data - 검사할 데이터 객체
 * @param {Array<string>} requiredFields - 필수 필드 배열
 * @returns {string|null} - 오류 메시지 또는 null
 */
function validateInput(data, requiredFields) {
  for (const field of requiredFields) {
    if (!data[field]) {
      return `${field} 값이 누락되었습니다.`;
    }
  }
  
  // 시간 형식 검사
  if (data.startTime && !isValidDateTimeFormat(data.startTime)) {
    return 'startTime 형식이 올바르지 않습니다. ISO 형식이어야 합니다.';
  }
  
  if (data.endTime && !isValidDateTimeFormat(data.endTime)) {
    return 'endTime 형식이 올바르지 않습니다. ISO 형식이어야 합니다.';
  }
  
  // duration은 양수여야 함
  if (data.duration !== undefined && (isNaN(data.duration) || data.duration < 0)) {
    return 'duration은 0 이상의 숫자여야 합니다.';
  }
  
  return null;
}

/**
 * 날짜/시간 문자열이 유효한 ISO 형식인지 검사
 * @param {string} dateTimeStr - 검사할 날짜/시간 문자열
 * @returns {boolean} - 유효 여부
 */
function isValidDateTimeFormat(dateTimeStr) {
  try {
    const date = new Date(dateTimeStr);
    return !isNaN(date.getTime());
  } catch (e) {
    return false;
  }
}

/**
 * 표준화된 API 응답 생성 함수
 * @param {boolean} success - 성공 여부
 * @param {Object} data - 응답 데이터
 * @param {string} [error] - 오류 메시지
 * @returns {Object} - 표준화된 응답 객체
 */
function createResponse(success, data = {}, error = null) {
  const response = { success };
  
  if (success) {
    return { ...response, data };
  } else {
    return { ...response, error, ...(data.message ? { message: data.message } : {}) };
  }
}

/**
 * @route POST /api/records
 * @desc 새로운 시간 기록 생성
 * @access Private
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { startTime, endTime, duration, pausedIntervals, targetDate } = req.body;
    
    // 입력 유효성 검사
    const validationError = validateInput(req.body, ['startTime', 'endTime', 'duration']);
    if (validationError) {
      return res.status(400).json(createResponse(false, {}, validationError));
    }
    
    const db = req.app.get('db');
    const userId = req.session.userId;
    
    // pausedIntervals를 JSON 문자열로 변환
    const pausedIntervalsJson = pausedIntervals ? JSON.stringify(pausedIntervals) : null;
    
    // 날짜와 시간 결합
    const finalStartTime = combineDateAndTime(targetDate, startTime);
    
    // 데이터베이스에 기록 저장
    const sql = 'INSERT INTO records (start_time, end_time, duration, paused_intervals, user_id) VALUES (?, ?, ?, ?, ?)';
    const params = [finalStartTime, endTime, duration, pausedIntervalsJson, userId];
    
    try {
      const result = await executeQuery(db, sql, params);
      res.json(createResponse(true, { id: result.id }));
    } catch (err) {
      res.status(500).json(createResponse(false, { message: err.message }, '데이터베이스 오류'));
    }
  } catch (error) {
    console.error('기록 저장 중 오류 발생:', error);
    res.status(500).json(createResponse(false, { message: error.message }, '서버 오류'));
  }
});

/**
 * @route GET /api/records
 * @desc 사용자의 모든 시간 기록 조회
 * @access Private
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const db = req.app.get('db');
    
    const sql = 'SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC';
    
    try {
      const rows = await executeSelect(db, sql, [userId]);
      
      // paused_intervals JSON 문자열을 객체로 파싱
      const processedRows = rows.map(row => {
        return {
          ...row,
          paused_intervals: row.paused_intervals ? JSON.parse(row.paused_intervals) : []
        };
      });
      
      res.json(createResponse(true, { records: processedRows }));
    } catch (err) {
      res.status(500).json(createResponse(false, { message: err.message }, '데이터베이스 오류'));
    }
  } catch (error) {
    console.error('기록 조회 중 오류 발생:', error);
    res.status(500).json(createResponse(false, { message: error.message }, '서버 오류'));
  }
});

/**
 * @route PUT /api/records/:id
 * @desc 특정 시간 기록 수정
 * @access Private
 */
router.put('/:id', requireAuth, checkRecordOwnership, async (req, res) => {
  try {
    const recordId = req.params.id;
    const userId = req.session.userId;
    const { startTime, endTime, duration, targetDate } = req.body;
    
    // 입력 유효성 검사
    const validationError = validateInput(req.body, ['startTime', 'endTime', 'duration']);
    if (validationError) {
      return res.status(400).json(createResponse(false, {}, validationError));
    }
    
    const db = req.app.get('db');
    
    // 날짜와 시간 결합
    const finalStartTime = combineDateAndTime(targetDate, startTime);
    
    // 레코드 업데이트
    const updateSql = 'UPDATE records SET start_time = ?, end_time = ?, duration = ? WHERE id = ? AND user_id = ?';
    const updateParams = [finalStartTime, endTime, duration, recordId, userId];
    
    const result = await executeQuery(db, updateSql, updateParams);
    
    if (result.changes === 0) {
      return res.status(404).json(createResponse(false, {}, '레코드를 찾을 수 없거나 접근 권한이 없습니다.'));
    }
    
    res.json(createResponse(true, { id: recordId }));
  } catch (error) {
    console.error('기록 수정 중 오류 발생:', error);
    res.status(500).json(createResponse(false, { message: error.message }, '서버 오류'));
  }
});

/**
 * @route DELETE /api/records/:id
 * @desc 특정 시간 기록 삭제
 * @access Private
 */
router.delete('/:id', requireAuth, checkRecordOwnership, async (req, res) => {
  try {
    const recordId = req.params.id;
    const userId = req.session.userId;
    const db = req.app.get('db');
    
    // 레코드 삭제
    const deleteSql = 'DELETE FROM records WHERE id = ? AND user_id = ?';
    const result = await executeQuery(db, deleteSql, [recordId, userId]);
    
    if (result.changes === 0) {
      return res.status(404).json(createResponse(false, {}, '레코드를 찾을 수 없거나 접근 권한이 없습니다.'));
    }
    
    res.json(createResponse(true, { id: recordId }));
  } catch (error) {
    console.error('기록 삭제 중 오류 발생:', error);
    res.status(500).json(createResponse(false, { message: error.message }, '서버 오류'));
  }
});

module.exports = router;