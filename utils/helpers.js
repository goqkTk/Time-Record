// 시간 포맷팅 유틸리티 함수들

/**
 * 밀리초를 HH:MM:SS 형식으로 변환
 * @param {number} ms - 밀리초
 * @returns {string} - 포맷된 시간 문자열
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * 밀리초를 "X시간 Y분" 형식으로 변환
 * @param {number} ms - 밀리초
 * @returns {string} - 포맷된 기간 문자열
 */
function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}시간 ${minutes}분`;
}

/**
 * 밀리초를 "H:MM" 형식으로 변환
 * @param {number} ms - 밀리초
 * @returns {string} - 포맷된 짧은 기간 문자열
 */
function formatDurationShort(ms) {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * 날짜가 오늘인지 확인
 * @param {Date} date - 확인할 날짜
 * @returns {boolean} - 오늘이면 true
 */
function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * 두 날짜가 같은 달인지 확인
 * @param {Date} date1 - 첫 번째 날짜
 * @param {Date} date2 - 두 번째 날짜
 * @returns {boolean} - 같은 달이면 true
 */
function isSameMonth(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() && 
         date1.getMonth() === date2.getMonth();
}

/**
 * 입력 값 검증 함수들
 */
const validation = {
  /**
   * 사용자명 검증
   * @param {string} username - 사용자명
   * @returns {object} - {isValid: boolean, message: string}
   */
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, message: '사용자명을 입력해주세요.' };
    }
    if (username.length < 3) {
      return { isValid: false, message: '사용자명은 3자 이상이어야 합니다.' };
    }
    if (username.length > 20) {
      return { isValid: false, message: '사용자명은 20자 이하여야 합니다.' };
    }
    return { isValid: true, message: '' };
  },

  /**
   * 비밀번호 검증
   * @param {string} password - 비밀번호
   * @returns {object} - {isValid: boolean, message: string}
   */
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: '비밀번호를 입력해주세요.' };
    }
    if (password.length < 4) {
      return { isValid: false, message: '비밀번호는 4자 이상이어야 합니다.' };
    }
    if (password.length > 50) {
      return { isValid: false, message: '비밀번호는 50자 이하여야 합니다.' };
    }
    return { isValid: true, message: '' };
  },

  /**
   * 기록 데이터 검증
   * @param {object} recordData - 기록 데이터
   * @returns {object} - {isValid: boolean, message: string}
   */
  validateRecord(recordData) {
    const { startTime, endTime, duration } = recordData;
    
    if (!startTime || !endTime || !duration) {
      return { isValid: false, message: '필수 데이터가 누락되었습니다.' };
    }
    
    if (typeof duration !== 'number' || duration <= 0) {
      return { isValid: false, message: '올바르지 않은 기간입니다.' };
    }
    
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { isValid: false, message: '올바르지 않은 날짜 형식입니다.' };
      }
      
      if (start >= end) {
        return { isValid: false, message: '시작 시간이 종료 시간보다 늦습니다.' };
      }
    } catch (error) {
      return { isValid: false, message: '날짜 처리 중 오류가 발생했습니다.' };
    }
    
    return { isValid: true, message: '' };
  }
};

module.exports = {
  formatTime,
  formatDuration,
  formatDurationShort,
  isToday,
  isSameMonth,
  validation
};