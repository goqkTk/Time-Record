// 전역 변수
let timerInterval;
let startTime;
let elapsed = 0;
let totalElapsed = 0;
let isPaused = false;
let currentDate = new Date();
let selectedDate = null;
let records = [];
let pausedIntervals = []; // 일시정지된 시간 구간들
let sessionStartTime = null; // 세션 시작 시간

// DOM 요소들
const timerEl = document.getElementById('timer');
const totalTimerEl = document.getElementById('totalTimer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const floatingTimer = document.getElementById('floatingTimer');
const timerDisplay = document.getElementById('timerDisplay');
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthEl = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const timeline = document.getElementById('timeline');
const totalTimeEl = document.getElementById('totalTime');
const todayTimeEl = document.getElementById('todayTime');
const selectedDateTimeEl = document.getElementById('selectedDateTime');
const selectedDateEl = document.getElementById('selectedDate');
const selectedMonthTimeEl = document.getElementById('selectedMonthTime');
const dailyDateEl = document.getElementById('dailyDate');
const dailyTotalEl = document.getElementById('dailyTotal');
const hourlyTimelineEl = document.getElementById('hourlyTimeline');
const logoutBtn = document.getElementById('logoutBtn');
const timerToggle = document.getElementById('timerToggle');
const timerOption = document.getElementById('timerOption');
const timeFormatSelect = document.getElementById('timeFormatSelect');
const weekStartSelect = document.getElementById('weekStartSelect');
const darkModeToggle = document.getElementById('darkModeToggle');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importDataInput = document.getElementById('importDataInput');

// 활동바 수정/삭제 모달 요소들
const activityEditModal = document.getElementById('activityEditModal');
const activityModalClose = document.getElementById('activityModalClose');
const editStartTimeInput = document.getElementById('editStartTimeInput');
const editEndTimeInput = document.getElementById('editEndTimeInput');
const deleteActivityBtn = document.getElementById('deleteActivityBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveEditBtn = document.getElementById('saveEditBtn');



// 현재 수정 중인 활동 레코드 ID
let currentEditingRecordId = null;

// 유틸리티 함수들
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  
  // 타이머 표시는 항상 24시간제 형식으로 표시 (00:00:00)
  const h = String(hours).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}시간 ${minutes}분`;
}

function formatDurationShort(ms) {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  // 항상 24시간제 형식으로 표시
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isSameMonth(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() && 
         date1.getMonth() === date2.getMonth();
}

// 타이머 기능
function updateTimer() {
  const now = Date.now();
  elapsed = now - startTime;
  timerEl.textContent = formatTime(elapsed);
  updateTotalTimer();
}

function resetTimer() {
  timerEl.textContent = '00:00:00';
  elapsed = 0;
}

function updateTotalTimer() {
  if (totalTimerEl) {
    totalTimerEl.textContent = formatTime(totalElapsed + elapsed);
  }
}

startBtn.onclick = () => {
  startTime = Date.now();
  if (sessionStartTime === null) {
    sessionStartTime = startTime;
    pausedIntervals = [];
  } else if (isPaused && pausedIntervals.length > 0) {
    // 일시정지에서 재시작할 때 일시정지 구간의 끝 시간 기록
    const lastPausedInterval = pausedIntervals[pausedIntervals.length - 1];
    if (!lastPausedInterval.end) {
      lastPausedInterval.end = startTime;
    }
  }
  timerInterval = setInterval(updateTimer, 1000);
  isPaused = false;
  
  // 타이머 UI 확장 애니메이션
  floatingTimer.classList.add('expanded');
  timerDisplay.style.display = 'block';
  
  // 버튼 상태 변경
  startBtn.style.display = 'none';
  pauseBtn.style.display = 'flex';
  stopBtn.style.display = 'flex';
};



pauseBtn.onclick = () => {
  clearInterval(timerInterval);
  totalElapsed += elapsed;
  
  // 일시정지 구간 기록
  const pauseStartTime = Date.now();
  pausedIntervals.push({ start: pauseStartTime });
  
  isPaused = true;
  timerInterval = null;
  
  // 현재 타이머 리셋하고 총 시간 업데이트
  resetTimer();
  updateTotalTimer();
  
  // 버튼 상태 변경 (재시작 ��이콘으로 변경)
  startBtn.innerHTML = '⏯';
  startBtn.style.display = 'flex';
  pauseBtn.style.display = 'none';
  stopBtn.style.display = 'flex';
};

stopBtn.onclick = async () => {
  clearInterval(timerInterval);
  
  // 현재 일시정지 중이면 마지막 일시정지 구간 종료
  if (isPaused && pausedIntervals.length > 0) {
    const lastPausedInterval = pausedIntervals[pausedIntervals.length - 1];
    if (!lastPausedInterval.end) {
      lastPausedInterval.end = Date.now();
    }
  }
  
  // 총 시간 계산 (일시정지 시간 제외)
  const finalDuration = totalElapsed + elapsed;
  
  if (finalDuration > 0 && sessionStartTime) {
    // 일시정지된 총 시간 계산
    let totalPausedTime = 0;
    pausedIntervals.forEach(interval => {
      if (interval.start && interval.end) {
        totalPausedTime += interval.end - interval.start;
      }
    });
    
    // 실제 작업 시간 (일시정지 시간 제외)
    const actualWorkDuration = finalDuration;
    
    // 서버로 기록 전송
    try {
      const sessionEndTime = new Date();
      
      // 선택된 날짜가 있으면 해당 날짜를 사용하고, 없으면 현재 날짜 사용
      const targetDate = selectedDate || new Date();
      
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date(sessionStartTime).toISOString(),
          endTime: sessionEndTime.toISOString(),
          duration: actualWorkDuration,
          paused_intervals: pausedIntervals,
          targetDate: targetDate.toISOString() // 선택된 날짜 정보 추가
        })
      });
      
      // 로컬 기록 업데이트
      await loadRecords();
      updateStats();
      renderCalendar();
      renderDailyView();
    } catch (error) {
      console.error('기록 저장 실패:', error);
    }
  }
  
  // 모든 타이머 리셋
  resetTimer();
  totalElapsed = 0;
  elapsed = 0;
  isPaused = false;
  sessionStartTime = null;
  pausedIntervals = [];
  timerInterval = null;
  updateTotalTimer();
  
  // UI 초기 상태로 복원
  floatingTimer.classList.remove('expanded');
  timerDisplay.style.display = 'none';
  
  // 버튼 상태 초기화
  startBtn.innerHTML = '▶';
  startBtn.style.display = 'flex';
  pauseBtn.style.display = 'none';
  stopBtn.style.display = 'none';
};

// 달력 기능
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // 월 표시 업데이트
  currentMonthEl.textContent = `${year}년 ${month + 1}월`;
  
  // 달력 그리드 초기화
  calendarGrid.innerHTML = '';
  
  // 주간 시작일 설정 적용
  let weekStartSetting = '0'; // 기본값: 일요일(0)
  if (window.userSettings && window.userSettings.weekStart) {
    weekStartSetting = window.userSettings.weekStart;
  }
  weekStartSetting = parseInt(weekStartSetting);
  
  // 요일 헤더 추가 (주간 시작일 설정에 따라 조정)
  let dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
  if (weekStartSetting === 1) { // 월요일부터 시작
    dayHeaders = ['월', '화', '수', '목', '금', '토', '일'];
  }
  
  dayHeaders.forEach((day, index) => {
    const dayEl = document.createElement('div');
    dayEl.className = 'day-header';
    
    // 일요일에만 색상 적용
    if ((weekStartSetting === 0 && index === 0) || 
        (weekStartSetting === 1 && index === 6)) {
      // 일요일은 빨간색
      dayEl.classList.add('sunday-header');
    }
    
    dayEl.textContent = day;
    calendarGrid.appendChild(dayEl);
  });

  
  // 첫 번째 날의 요일 구하기
  let firstDay = new Date(year, month, 1).getDay();
  
  // 주간 시작일이 월요일인 경우 요일 조정
  if (weekStartSetting === 1) {
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // 일요일(0)은 6으로, 나머지는 -1
  }
  
  // 이전 달의 마지막 날들 추가
  const prevMonth = new Date(year, month, 0);
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    
    // 이전 달의 날짜 계산
    const prevMonthDay = prevMonth.getDate() - i;
    dayEl.textContent = prevMonthDay;
    
    // 요일 계산 (이전 달의 해당 날짜)
    const prevMonthDate = new Date(year, month - 1, prevMonthDay);
    const dayOfWeek = prevMonthDate.getDay();
    
    // 일요일인 경우에만 클래스 추가
    if (dayOfWeek === 0) {
      dayEl.classList.add('sunday');
    }
    
    calendarGrid.appendChild(dayEl);
  }
  
  // 현재 달의 날들 추가
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    const currentDay = new Date(year, month, day);
    
    // 일요일인 경우에만 클래스 추가 (일요일: 0)
    const dayOfWeek = currentDay.getDay();
    if (dayOfWeek === 0) {
      dayEl.classList.add('sunday');
    }
    
    // 날짜 숫자
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);
    
    // 해당 날짜의 총 시간 계산
    const dayRecords = records.filter(record => {
      const recordDate = new Date(record.start_time);
      return recordDate.toDateString() === currentDay.toDateString();
    });
    
    if (dayRecords.length > 0) {
      const totalDuration = dayRecords.reduce((sum, record) => sum + record.duration, 0);
      const timeDisplay = document.createElement('div');
      timeDisplay.className = 'day-time';
      // daily total은 시간 형식 설정과 관계없이 항상 시간:분 형식으로 표시
      const totalMinutes = Math.floor(totalDuration / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      timeDisplay.textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
      dayEl.appendChild(timeDisplay);
      dayEl.classList.add('has-record');
    }
    
    // 오늘 날짜 표시
     if (isToday(currentDay)) {
       dayEl.classList.add('today');
       // 다른 날짜가 선택된 경우에만 today-unselected 클래스 추가
       if (selectedDate && !isToday(selectedDate)) {
         dayEl.classList.add('today-unselected');
       }
     }
     
     // 선택된 날짜 표시
     if (selectedDate && selectedDate.toDateString() === currentDay.toDateString()) {
       dayEl.classList.add('selected');
     }
     
     // 날짜 클릭 이벤트
     dayEl.addEventListener('click', () => {
       selectedDate = new Date(currentDay);
       renderCalendar();
       renderDailyView();
       updateStats();
     });
     
     calendarGrid.appendChild(dayEl);
  }
  
  // 다음 달의 첫 번째 날들로 채우기
  const totalCells = calendarGrid.children.length;
  const remainingCells = 42 - totalCells + 7; // 6주 * 7일 + 헤더
  for (let day = 1; day <= remainingCells; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    dayEl.textContent = day;
    
    // 요일 계산 (다음 달의 해당 날짜)
    const nextMonthDate = new Date(year, month + 1, day);
    const dayOfWeek = nextMonthDate.getDay();
    
    // 일요일인 경우에만 클래스 추가
    if (dayOfWeek === 0) {
      dayEl.classList.add('sunday');
    }
    
    calendarGrid.appendChild(dayEl);
  }
}

prevMonthBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  // selectedDate가 있으면 같은 날짜로 이동
  if (selectedDate) {
    selectedDate = new Date(selectedDate);
    selectedDate.setMonth(selectedDate.getMonth() - 1);
  }
  renderCalendar();
  renderDailyView();
  updateStats();
};

nextMonthBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  // selectedDate가 있으면 같은 날짜로 이동
  if (selectedDate) {
    selectedDate = new Date(selectedDate);
    selectedDate.setMonth(selectedDate.getMonth() + 1);
  }
  renderCalendar();
  renderDailyView();
  updateStats();
};



// 일간뷰 렌더링
function renderDailyView() {
  // 선택된 날짜가 있으면 해당 날짜를, 없으면 오늘 날짜를 사용
  const displayDate = selectedDate || new Date();
  dailyDateEl.textContent = displayDate.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });
  
  // 선택된 날짜의 총 시간 계산
  const dayRecords = records.filter(record => {
    const recordDate = new Date(record.start_time);
    return recordDate.toDateString() === displayDate.toDateString();
  });
  
  const dayTotal = dayRecords.reduce((sum, record) => sum + record.duration, 0);
  // daily total은 시간 형식 설정과 관계없이 항상 시간:분 형식으로 표시
  const totalMinutes = Math.floor(dayTotal / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  dailyTotalEl.textContent = `${hours}:${minutes.toString().padStart(2, '0')}`;
  
  // 분 단위 타임라인 생성 (24시간 * 60분 = 1440분)
  hourlyTimelineEl.innerHTML = '';
  
  // 현재 시간 계산
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // 1시간 간격으로 표시 (24개 블록)
  for (let minutes = 0; minutes < 1440; minutes += 60) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    
    const timeBlock = document.createElement('div');
    timeBlock.className = 'time-block';
    
    // 현재 시간 표시선 (1시간 블록에서 표시) - 오늘 날짜일 때만 표시
    const today = new Date();
    const isToday = displayDate.toDateString() === today.toDateString();
    
    if (isToday && minutes <= currentMinutes && currentMinutes < minutes + 60) {
      const currentTimeLine = document.createElement('div');
      currentTimeLine.className = 'current-time-line';
      const currentTimeOffset = ((currentMinutes - minutes) / 60) * 100;
      currentTimeLine.style.top = `${currentTimeOffset}%`;
      
      // 현재 시간 텍스트 추가
      const currentTimeText = document.createElement('div');
      currentTimeText.className = 'current-time-text';
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // 시간 형식 설정 적용
      let timeFormatSetting = window.userSettings?.timeFormat;
      if (!timeFormatSetting) {
        // 기본값은 사용자가 선택한 값을 유지하기 위해 localStorage에서 확인
        timeFormatSetting = localStorage.getItem('timeFormat') || '24';
      }
      
      let displayHour;
      if (timeFormatSetting === '12') {
        displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
        const ampm = currentHour < 12 ? 'AM' : 'PM';
        currentTimeText.textContent = `${displayHour}:${currentMinute.toString().padStart(2, '0')} ${ampm}`;
      } else {
        displayHour = currentHour;
        currentTimeText.textContent = `${displayHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      }
      currentTimeLine.appendChild(currentTimeText);
      
      timeBlock.appendChild(currentTimeLine);
    }
    
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    
    // 시간 형식 설정 적용
    let timeFormatSetting = window.userSettings?.timeFormat;
    if (!timeFormatSetting) {
      // 기본값은 사용자가 선택한 값을 유지하기 위해 localStorage에서 확인
      timeFormatSetting = localStorage.getItem('timeFormat') || '12';
    }
    
    // 시간 형식에 따라 시간 표시
    if (minute === 0) {
      let displayHour;
      if (timeFormatSetting === '12') {
        displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? 'AM' : 'PM';
        timeLabel.textContent = `${displayHour} ${ampm}`;
      } else {
        displayHour = hour;
        timeLabel.textContent = `${displayHour.toString().padStart(2, '0')}:00`;
      }
    } else {
      timeLabel.textContent = '';
    }
    
    const activityArea = document.createElement('div');
    activityArea.className = 'activity-area';
    
    // 해당 시간대의 활동 찾기 (저장된 기록)
    // 전체 타임라인에 대한 활동 기록을 가져옴 (필터링하지 않음)
    const timeRecords = dayRecords;
    
    // 현재 진행 중인 세션 확인 (오늘 날짜일 때만)
    let currentSessionRecord = null;
    const isDisplayingToday = displayDate.toDateString() === new Date().toDateString();
    if (isDisplayingToday && sessionStartTime && (totalElapsed > 0 || elapsed > 0)) {
      const sessionStart = new Date(sessionStartTime);
      const sessionEnd = new Date();
      
      // 현재 세션을 항상 포함
      currentSessionRecord = {
        start_time: sessionStart.toISOString(),
        duration: totalElapsed + elapsed,
        paused_intervals: pausedIntervals
      };
    }
    
    // 모든 활동 기록 (저장된 기록 + 현재 세션)
    const allRecords = [...timeRecords];
    if (currentSessionRecord) {
      allRecords.push(currentSessionRecord);
    }
    
    // 현재 시간 블록에 해당하는 활동만 필터링
    const blockRecords = allRecords.filter(record => {
      const recordStart = new Date(record.start_time);
      const recordEnd = new Date(recordStart.getTime() + record.duration);
      const recordStartMinutes = recordStart.getHours() * 60 + recordStart.getMinutes();
      const recordEndMinutes = recordEnd.getHours() * 60 + recordEnd.getMinutes();
      
      return recordStartMinutes < minutes + 60 && recordEndMinutes > minutes;
    });
    
    if (blockRecords.length > 0) {
      blockRecords.forEach(record => {
        const recordStart = new Date(record.start_time);
        const recordEnd = new Date(recordStart.getTime() + record.duration);
        
        // 날짜 비교를 위해 표시 날짜와 기록 시작/종료 날짜 가져오기
        const displayDateStr = displayDate.toDateString();
        const recordStartDateStr = recordStart.toDateString();
        const recordEndDateStr = recordEnd.toDateString();
        
        // 시작 시간과 종료 시간의 분 계산
        let recordStartMinutes = recordStart.getHours() * 60 + recordStart.getMinutes();
        let recordEndMinutes = recordEnd.getHours() * 60 + recordEnd.getMinutes();
        
        // 종료 시간이 자정(00:00)인 경우 처리
        if (recordEnd.getHours() === 0 && recordEnd.getMinutes() === 0) {
          recordEndMinutes = 24 * 60; // 24:00으로 설정
        }
        
        // 날짜가 다른 경우 처리 (자정을 넘어가는 경우)
        if (recordStartDateStr !== recordEndDateStr) {
          // 표시 날짜가 시작 날짜와 같으면 종료 시간을 23:59로 설정
          if (displayDateStr === recordStartDateStr) {
            recordEndMinutes = 24 * 60 - 1; // 23:59
          }
          // 표시 날짜가 종료 날짜와 같으면 시작 시간을 00:00으로 설정
          else if (displayDateStr === recordEndDateStr) {
            recordStartMinutes = 0; // 00:00
          }
        }
        
        // 활동 바 생성 (실제 작업 시간)
        const activityBar = document.createElement('div');
        activityBar.className = 'activity-bar-vertical';
        
        // 레코드 ID 설정
        const recordId = record.id || record._id;
        
        // 활동바에 레코드 ID 저장
        activityBar.dataset.recordId = recordId;
        activityBar.dataset.startTime = record.start_time;
        activityBar.dataset.duration = record.duration;
        
        // 활동바에 고유 식별자 클래스 추가 - 같은 활동의 모든 바에 동일한 클래스 적용
        activityBar.classList.add(`activity-${recordId}`);
        
        // 활동바 클릭 이벤트 추가
        activityBar.addEventListener('click', function(e) {
          e.stopPropagation();
          openActivityEditModal(recordId, record.start_time, record.duration);
        });
        
        // 호버 이벤트 추가
        activityBar.addEventListener('mouseenter', function() {
          // 같은 활동에 속한 모든 활동바에 호버 효과 적용
          document.querySelectorAll(`.activity-${recordId}`).forEach(bar => {
            bar.classList.add('activity-hover');
          });
        });
        
        activityBar.addEventListener('mouseleave', function() {
          // 호버 효과 제거
          document.querySelectorAll(`.activity-${recordId}`).forEach(bar => {
            bar.classList.remove('activity-hover');
          });
        });
        
        // 활동 바의 위치와 높이 계산 - 분 단위로 정확하게 계산
        // 현재 시간 블록 내에서의 상대적 위치 계산
        const startOffset = Math.max(0, recordStartMinutes - minutes);
        // 활동이 현재 시간 블록을 넘어가는 경우 처리
        const endOffset = recordEndMinutes - minutes;
        // 높이 계산 - 시간 블록을 넘어가는 경우 처리
        let height;
        
        // 현재 시간 블록이 시작 시간을 포함하는 경우
        if (recordStartMinutes >= minutes && recordStartMinutes < minutes + 60) {
          // 현재 시간 블록이 종료 시간도 포함하는 경우
          if (recordEndMinutes <= minutes + 60) {
            // 시작과 종료가 모두 현재 블록 내에 있는 경우
            height = ((recordEndMinutes - recordStartMinutes) / 60) * 100;
          } else {
            // 시작은 현재 블록, 종료는 다음 블록인 경우
            height = ((minutes + 60 - recordStartMinutes) / 60) * 100;
          }
        }
        // 현재 시간 블록이 종료 시간만 포함하는 경우
        else if (recordEndMinutes > minutes && recordEndMinutes <= minutes + 60) {
          height = (recordEndMinutes - minutes) / 60 * 100;
        }
        // 활동이 현재 블록을 완전히 포함하는 경우
        else if (recordStartMinutes < minutes && recordEndMinutes > minutes + 60) {
          height = 100; // 블록 전체 높이
        }
        // 그 외의 경우 (활동이 현재 블록과 겹치지 않음)
        else {
          height = 0;
        }
        
        const top = (startOffset / 60) * 100;
        
        // 소수점 2자리까지 정확하게 계산하여 위치 오차 최소화
        // 높이를 약간 늘려서 활동바 사이의 1픽셀 간격 제거
        activityBar.style.height = `calc(${height.toFixed(2)}% + 1px)`;
        activityBar.style.top = `${top.toFixed(2)}%`;
        
        // 활동바가 시간 블록 경계를 넘어갈 수 있도록 position과 z-index 설정
        activityBar.style.position = 'absolute';
        activityBar.style.zIndex = '5';
        activityBar.style.clipPath = 'none';
        activityBar.style.overflow = 'visible';
        
        // 활동바 상단과 하단에 둥근 모서리 적용
        
        // 현재 시간 블록이 활동의 시작 시간을 포함하는 경우 상단 둥근 모서리 적용
        if (recordStartMinutes >= minutes && recordStartMinutes < minutes + 60) {
          activityBar.classList.add('activity-bar-top');
        }
        
        // 현재 시간 블록이 활동의 종료 시간을 포함하는 경우 하단 둥근 모서리 적용
        if (recordEndMinutes > minutes && recordEndMinutes <= minutes + 60) {
          activityBar.classList.add('activity-bar-bottom');
        }
        
        // 활동 제목 표시 (첫 번째 블록에만)
        if (recordStartMinutes >= minutes && recordStartMinutes < minutes + 60) {
          const activityTitle = document.createElement('div');
          activityTitle.className = 'activity-title';
          
          // 활동 시간 계산 (밀리초를 분으로 변환)
          const durationMinutes = Math.round(record.duration / (1000 * 60));
          let timeText = '';
          
          if (durationMinutes >= 60) {
            const hours = Math.floor(durationMinutes / 60);
            const mins = durationMinutes % 60;
            timeText = mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
          } else if (durationMinutes > 0) {
            timeText = `${durationMinutes}분`;
          }
          
          if (timeText) {
            activityTitle.textContent = timeText;
            activityBar.appendChild(activityTitle);
          }
        }
        
        activityArea.appendChild(activityBar);
        
        // 일시정지된 시간 구간을 활동 바에서 제외하고 별도로 표시
        if (record.paused_intervals && record.paused_intervals.length > 0) {
          // 활동 시간을 세그먼트로 나누기
          const segments = [];
          let currentStart = recordStartMinutes;
          
          record.paused_intervals.forEach(pausedInterval => {
            if (pausedInterval.start && pausedInterval.end) {
              const pauseStart = new Date(pausedInterval.start);
              const pauseEnd = new Date(pausedInterval.end);
              
              // 날짜 비교를 위해 표시 날짜와 일시정지 시작/종료 날짜 가져오기
              const pauseStartDateStr = pauseStart.toDateString();
              const pauseEndDateStr = pauseEnd.toDateString();
              
              // 시작 시간과 종료 시간의 분 계산
              let pauseStartMinutes = pauseStart.getHours() * 60 + pauseStart.getMinutes();
              let pauseEndMinutes = pauseEnd.getHours() * 60 + pauseEnd.getMinutes();
              
              // 날짜가 다른 경우 처리 (자정을 넘어가는 경우)
              if (pauseStartDateStr !== pauseEndDateStr) {
                // 표시 날짜가 시작 날짜와 같으면 종료 시간을 23:59로 설정
                if (displayDateStr === pauseStartDateStr) {
                  pauseEndMinutes = 24 * 60 - 1; // 23:59
                }
                // 표시 날짜가 종료 날짜와 같으면 시작 시간을 00:00으로 설정
                else if (displayDateStr === pauseEndDateStr) {
                  pauseStartMinutes = 0; // 00:00
                }
              }
              
              // 일시정지 전까지의 활동 세그먼트
              if (currentStart < pauseStartMinutes) {
                segments.push({ start: currentStart, end: pauseStartMinutes, type: 'active' });
              }
              
              // 일시정지 세그먼트
              segments.push({ start: pauseStartMinutes, end: pauseEndMinutes, type: 'paused' });
              
              currentStart = pauseEndMinutes;
            }
          });
          
          // 마지막 활동 세그먼트
          if (currentStart < recordEndMinutes) {
            segments.push({ start: currentStart, end: recordEndMinutes, type: 'active' });
          }
          
          // 기존 활동 바 제거하고 세그먼트별로 다시 생성
          activityArea.removeChild(activityBar);
          
          segments.forEach(segment => {
            // 현재 시간 블록에 표시할 세그먼트인지 확인
            if (segment.start < minutes + 60 && segment.end > minutes) {
                const segmentBar = document.createElement('div');
                segmentBar.className = segment.type === 'paused' ? 'activity-bar-paused' : 'activity-bar-vertical';
                
                // 활성 세그먼트에만 클릭 이벤트 추가
                const recordId = record.id || record._id;
                if (segment.type === 'active') {
                  segmentBar.dataset.recordId = recordId;
                  segmentBar.dataset.startTime = record.start_time;
                  segmentBar.dataset.duration = record.duration;
                  
                  segmentBar.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openActivityEditModal(recordId, record.start_time, record.duration);
                  });
                }
                
                // 세그먼트 바에 고유 식별자 클래스 추가 - 같은 활동의 모든 바에 동일한 클래스 적용
                segmentBar.classList.add(`activity-${recordId}`);
                
                // 호버 이벤트 추가
                segmentBar.addEventListener('mouseenter', function() {
                  // 같은 활동에 속한 모든 활동바에 호버 효과 적용
                  document.querySelectorAll(`.activity-${recordId}`).forEach(bar => {
                    bar.classList.add('activity-hover');
                  });
                });
                
                segmentBar.addEventListener('mouseleave', function() {
                  // 호버 효과 제거
                  document.querySelectorAll(`.activity-${recordId}`).forEach(bar => {
                    bar.classList.remove('activity-hover');
                  });
                });
                
                const segmentStartOffset = Math.max(0, segment.start - minutes);
                // 세그먼트가 현재 시간 블록을 넘어가는 경우 처리
                const segmentEndOffset = segment.end - minutes;
                // 높이 계산 - 시간 블록을 넘어가는 경우 처리
                let segmentHeight;
                
                // 현재 시간 블록이 세그먼트 시작 시간을 포함하는 경우
                if (segment.start >= minutes && segment.start < minutes + 60) {
                  // 현재 시간 블록이 세그먼트 종료 시간도 포함하는 경우
                  if (segment.end <= minutes + 60) {
                    // 시작과 종료가 모두 현재 블록 내에 있는 경우
                    segmentHeight = ((segment.end - segment.start) / 60) * 100;
                  } else {
                    // 시작은 현재 블록, 종료는 다음 블록인 경우
                    segmentHeight = ((minutes + 60 - segment.start) / 60) * 100;
                  }
                }
                // 현재 시간 블록이 세그먼트 종료 시간만 포함하는 경우
                else if (segment.end > minutes && segment.end <= minutes + 60) {
                  segmentHeight = (segment.end - minutes) / 60 * 100;
                }
                // 세그먼트가 현재 블록을 완전히 포함하는 경우
                else if (segment.start < minutes && segment.end > minutes + 60) {
                  segmentHeight = 100; // 블록 전체 높이
                }
                // 그 외의 경우 (세그먼트가 현재 블록과 겹치지 않음)
                else {
                  segmentHeight = 0;
                }
                const segmentTop = (segmentStartOffset / 60) * 100;
                
                // 높이를 약간 늘려서 활동바 사이의 1픽셀 간격 제거
                segmentBar.style.height = `calc(${segmentHeight.toFixed(2)}% + 1px)`;
                segmentBar.style.top = `${segmentTop.toFixed(2)}%`;
                
                // 세그먼트 바가 시간 블록 경계를 넘어갈 수 있도록 position과 z-index 설정
                segmentBar.style.position = 'absolute';
                segmentBar.style.zIndex = segment.type === 'paused' ? '4' : '5';
                segmentBar.style.clipPath = 'none';
                segmentBar.style.overflow = 'visible';
                
                // 세그먼트 바 상단과 하단에 둥근 모서리 적용
                // 세그먼트 바가 실제 활동의 시작 부분에 위치하면 상단 둥근 모서리 적용
                // 실제 활동의 시작 부분인 경우에만 상단 둥근 모서리 적용
                if (segment.start === recordStartMinutes) {
                  if (segment.type === 'paused') {
                    segmentBar.classList.add('activity-bar-paused-top');
                  } else {
                    segmentBar.classList.add('activity-bar-top');
                  }
                }
                
                // 세그먼트 바가 시간 블록의 끝 부분에 위치하는 경우 하단 둥근 모서리 적용
                // 현재 시간 블록이 세그먼트 종료 시간을 포함하는 경우에만 적용
                if (segment.end > minutes && segment.end <= minutes + 60) {
                  if (segment.type === 'paused') {
                    segmentBar.classList.add('activity-bar-paused-bottom');
                  } else {
                    segmentBar.classList.add('activity-bar-bottom');
                  }
                }
                
                // 활동 제목은 첫 번째 활성 세그먼트에만 추가
                if (segment.type === 'active' && segment.start >= minutes && segment.start < minutes + 60 && recordStartMinutes >= minutes && recordStartMinutes < minutes + 60) {
                  const activityTitle = document.createElement('div');
                  activityTitle.className = 'activity-title';
                  
                  // 활동 시간 계산 (밀리초를 분으로 변환)
                  const durationMinutes = Math.round(record.duration / (1000 * 60));
                  let timeText = '';
                  
                  if (durationMinutes >= 60) {
                    const hours = Math.floor(durationMinutes / 60);
                    const mins = durationMinutes % 60;
                    timeText = mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
                  } else if (durationMinutes > 0) {
                    timeText = `${durationMinutes}분`;
                  }
                  
                  // 활동 시간이 있으면 텍스트 표시
                  if (timeText) {
                    activityTitle.textContent = timeText;
                    segmentBar.appendChild(activityTitle);
                  }
                }
                
                activityArea.appendChild(segmentBar);
            }
          });
        }
      });
    }
    
    timeBlock.appendChild(timeLabel);
    timeBlock.appendChild(activityArea);
    hourlyTimelineEl.appendChild(timeBlock);
  }
  
  // 현재 시간 표시선 초기 생성
  updateCurrentTimeLine();
}

// 통계 업데이트
function updateStats() {
  // 총 시간 계산
  const totalDuration = records.reduce((sum, record) => sum + record.duration, 0);
  totalTimeEl.textContent = formatDuration(totalDuration);
  
  // 오늘 시간 계산
  const today = new Date();
  const todayDuration = records
    .filter(record => {
      const recordDate = new Date(record.start_time);
      return recordDate.toDateString() === today.toDateString();
    })
    .reduce((sum, record) => sum + record.duration, 0);
  
  todayTimeEl.textContent = formatDuration(todayDuration);
  
  // 선택한 날짜 시간 계산
  if (selectedDate) {
    const selectedDuration = records
      .filter(record => {
        const recordDate = new Date(record.start_time);
        return recordDate.toDateString() === selectedDate.toDateString();
      })
      .reduce((sum, record) => sum + record.duration, 0);
    
    selectedDateTimeEl.textContent = formatDuration(selectedDuration);
    selectedDateEl.textContent = selectedDate.toLocaleDateString('ko-KR');
  } else {
    selectedDateTimeEl.textContent = '0시간 0분';
    selectedDateEl.textContent = '날짜를 선택하세요';
  }
  
  // 선택한 달 시간 계산
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthDuration = records
    .filter(record => {
      const recordDate = new Date(record.start_time);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    })
    .reduce((sum, record) => sum + record.duration, 0);
  
  selectedMonthTimeEl.textContent = formatDuration(monthDuration);
}

// 기록 로드
async function loadRecords() {
  try {
    const response = await fetch('/api/records', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    if (response.ok) {
      records = await response.json();
    } else if (response.status === 401) {
      // 인증 오류 - 로그인 페이지로 리디렉션
      alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
      window.location.href = '/login';
      return;
    } else {
      records = [];
    }
  } catch (error) {
    records = [];
  }
}

// 활동바 수정 모달 열기
function openActivityEditModal(recordId, startTime, duration) {
  currentEditingRecordId = recordId;
  
  // 시작 시간과 종료 시간 계산
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + parseInt(duration));
  
  // 시간 입력 필드에 값 설정 (항상 24시간제로 표시)
  // 시간 입력은 내부적으로 24시간제로 처리하기 위해 형식 설정과 관계없이 24시간제로 표시
  const startHours = startDate.getHours().toString().padStart(2, '0');
  const startMinutes = startDate.getMinutes().toString().padStart(2, '0');
  editStartTimeInput.value = `${startHours}:${startMinutes}`;
  
  const endHours = endDate.getHours().toString().padStart(2, '0');
  const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
  editEndTimeInput.value = `${endHours}:${endMinutes}`;
  
  // 모달 표시
  activityEditModal.style.display = 'flex';
  activityEditModal.style.opacity = '1';
  activityEditModal.style.visibility = 'visible';
}





// 활동바 수정 모달 닫기
function closeActivityEditModal() {
  activityEditModal.style.display = 'none';
  activityEditModal.style.opacity = '0';
  activityEditModal.style.visibility = 'hidden';
  currentEditingRecordId = null;
}

// 활동 시간 수정
async function updateActivity() {
  if (!currentEditingRecordId) {
    return;
  }
  
  // 선택된 날짜 가져오기 (selectedDate가 없으면 오늘 날짜 사용)
  const baseDate = selectedDate || new Date();
  
  // 시작 시간과 종료 시간 파싱
  const [startHours, startMinutes] = editStartTimeInput.value.split(':').map(Number);
  const [endHours, endMinutes] = editEndTimeInput.value.split(':').map(Number);
  
  // 시작 시간과 종료 시간 설정
  const startTime = new Date(baseDate);
  startTime.setHours(startHours, startMinutes, 0, 0);
  
  const endTime = new Date(baseDate);
  endTime.setHours(endHours, endMinutes, 0, 0);
  
  // 종료 시간이 시작 시간보다 이전인 경우 다음 날로 설정
  if (endTime < startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }
  
  // 활동 시간 계산 (밀리초)
  const duration = endTime.getTime() - startTime.getTime();
  
  try {
    // 서버에 업데이트 요청
    const response = await fetch(`/api/records/${currentEditingRecordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
        targetDate: baseDate.toISOString() // 선택된 날짜 정보 추가
      })
    });
    
    if (response.status === 401) {
      // 인증 오류 - 로그인 페이지로 리디렉션
      alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
      window.location.href = '/login';
      return;
    } else if (!response.ok) {
      throw new Error('활동 시간 수정에 실패했습니다.');
    }
    
    // 데이터 다시 로드 및 화면 갱신
    await loadRecords();
    renderDailyView();
    renderCalendar();
    updateStats();
    
    // 모달 닫기
    closeActivityEditModal();
  } catch (error) {
    console.error('활동 시간 수정 실패:', error);
    alert('활동 시간 수정에 실패했습니다.');
  }
}

// 활동 삭제
async function deleteActivity() {
  if (!currentEditingRecordId) {
    return;
  }
  
  if (!confirm('이 활동을 삭제하시겠습니까?')) {
    return;
  }
  
  try {
    // 서버에 삭제 요청
    const response = await fetch(`/api/records/${currentEditingRecordId}`, {
      method: 'DELETE'
    });
    
    if (response.status === 401) {
      // 인증 오류 - 로그인 페이지로 리디렉션
      alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
      window.location.href = '/login';
      return;
    } else if (!response.ok) {
      throw new Error('활동 삭제에 실패했습니다.');
    }
    
    // 데이터 다시 로드 및 화면 갱신
    await loadRecords();
    renderDailyView();
    renderCalendar();
    updateStats();
    
    // 모달 닫기
    closeActivityEditModal();
  } catch (error) {
    console.error('활동 삭제 실패:', error);
    alert('활동 삭제에 실패했습니다.');
  }
}

// 네비게이션 기능
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');
  const timeCalendarToggle = document.getElementById('time-calendar-toggle');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // 시간/달력 토글 버튼인 경우 특별 처리
      if (item.id === 'time-calendar-toggle') {
        // 이미 활성화된 상태에서 클릭하면 토글
        if (item.classList.contains('active')) {
          handleTimeCalendarToggle(item);
        } else {
          // 다른 탭에서 시간/달력 탭으로 돌아올 때는 기본 시간 모드로 설정
          resetTimeCalendarToDefault(item);
          // 모든 네비게이션 아이템에서 active 클래스 제거
          navItems.forEach(nav => nav.classList.remove('active'));
          // 클릭된 아이템에 active 클래스 추가
          item.classList.add('active');
          // 모든 뷰 숨기기
          views.forEach(view => view.classList.remove('active'));
          // 시간 뷰 활성화
          document.getElementById('time-view').classList.add('active');
        }
        return;
      }
      
      const targetView = item.dataset.view;
      
      // 모든 네비게이션 아이템에서 active 클래스 제거
      navItems.forEach(nav => nav.classList.remove('active'));

      // 시간/달력 탭이 비활성화될 때 모든 아이콘을 회색으로 설정
      if (timeCalendarToggle && !timeCalendarToggle.classList.contains('active')) {
        const navIcon = timeCalendarToggle.querySelector('.nav-icon');
        const navLabel = timeCalendarToggle.querySelector('.nav-label');
        
        // 모든 아이콘과 텍스트를 회색으로 설정
        navLabel.textContent = '시간 / 달력';
        
        const timeSvg = navIcon.querySelector('.time-icon');
        const calSvg = navIcon.querySelector('.calendar-icon');
        const sep = navIcon.querySelector('.icon-separator');
        if (timeSvg && calSvg && sep) {
          timeSvg.setAttribute('stroke', '#6b7280');
          calSvg.setAttribute('stroke', '#6b7280');
          sep.style.color = '#6b7280';
        }
      }

      // 클릭된 아이템에 active 클래스 추가
      item.classList.add('active');
      // 클릭된 아이템에 active 클래스 추가
      item.classList.add('active');
      
      // 모든 뷰 숨기기
      views.forEach(view => view.classList.remove('active'));
      // 선택된 뷰 보이기
      document.getElementById(targetView).classList.add('active');
      
      // 달력 뷰로 전환 시 기록 새로 로드하고 달력 및 통계 업데이트
      if (targetView === 'calendar-view') {
        loadRecords().then(() => {
          renderCalendar();
          updateStats();
        });
      }
    });
  });
}

// 시간/달력 탭을 기본 시간 모드로 리셋
function resetTimeCalendarToDefault(toggleBtn) {
  const navIcon = toggleBtn.querySelector('.nav-icon');
  const navLabel = toggleBtn.querySelector('.nav-label');
  
  // 기본 시간 모드로 설정
  toggleBtn.dataset.mode = 'time';
  toggleBtn.dataset.view = 'time-view';
  
  // 시간만 선택된 상태로 표시 (시간: 초록색, 달력: 회색)
  navLabel.textContent = '시간 / 달력';
  
  const timeSvg = navIcon.querySelector('.time-icon');
  const calSvg = navIcon.querySelector('.calendar-icon');
  const sep = navIcon.querySelector('.icon-separator');
  if (timeSvg && calSvg && sep) {
    timeSvg.setAttribute('stroke', '#4CAF50');
    calSvg.setAttribute('stroke', '#6b7280');
    sep.style.color = '#6b7280';
  }
}

// 시간/달력 토글 처리
function handleTimeCalendarToggle(toggleBtn) {
  const currentMode = toggleBtn.dataset.mode;
  const navIcon = toggleBtn.querySelector('.nav-icon');
  const navLabel = toggleBtn.querySelector('.nav-label');
  const views = document.querySelectorAll('.view');
  
  views.forEach(view => view.classList.remove('active'));
  
  if (currentMode === 'time') {
    toggleBtn.dataset.mode = 'calendar';
    toggleBtn.dataset.view = 'calendar-view';
    navLabel.textContent = '시간 / 달력';

    const timeSvg = navIcon.querySelector('.time-icon');
    const calSvg = navIcon.querySelector('.calendar-icon');
    const sep = navIcon.querySelector('.icon-separator');
    if (timeSvg && calSvg && sep) {
      timeSvg.setAttribute('stroke', '#6b7280');
      calSvg.setAttribute('stroke', '#4CAF50');
      sep.style.color = '#6b7280';
    }

    document.getElementById('calendar-view').classList.add('active');
    
    // 달력 뷰로 전환 시 기록 새로 로드하고 달력 및 통계 업데이트
    loadRecords().then(() => {
      renderCalendar();
      updateStats();
    });
  } else {
    toggleBtn.dataset.mode = 'time';
    toggleBtn.dataset.view = 'time-view';
    navLabel.textContent = '시간 / 달력';

    const timeSvg = navIcon.querySelector('.time-icon');
    const calSvg = navIcon.querySelector('.calendar-icon');
    const sep = navIcon.querySelector('.icon-separator');
    if (timeSvg && calSvg && sep) {
      timeSvg.setAttribute('stroke', '#4CAF50');
      calSvg.setAttribute('stroke', '#6b7280');
      sep.style.color = '#6b7280';
    }

    document.getElementById('time-view').classList.add('active');
  }
}



// 현재 시간으로 스크롤 (초기 로드 시에만 사용)
function scrollToCurrentTime() {
  const currentTime = new Date();
  const scrollCurrentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const currentBlockIndex = Math.floor(scrollCurrentMinutes / 60);
  
  if (!hourlyTimelineEl) {
    console.log('타임라인 요소를 찾을 수 없습니다.');
    return;
  }
  
  const currentBlock = hourlyTimelineEl.children[currentBlockIndex];
  
  if (currentBlock) {
    // hourlyTimelineEl 자체가 스크롤 컨테이너입니다
    const containerHeight = hourlyTimelineEl.clientHeight;
    const blockHeight = currentBlock.offsetHeight;
    const scrollTop = currentBlock.offsetTop - (containerHeight / 2) + (blockHeight / 2);
    
    hourlyTimelineEl.scrollTop = Math.max(0, scrollTop);
    console.log(`현재 시간(${currentTime.getHours()}:${currentTime.getMinutes()})으로 스크롤 완료 - scrollTop: ${hourlyTimelineEl.scrollTop}`);
  } else {
    console.log('현재 시간 블록을 찾을 수 없습니다. 블록 인덱스:', currentBlockIndex, '총 블록 수:', hourlyTimelineEl.children.length);
  }
}

// 현재 시간 표시선 업데이트
function updateCurrentTimeLine() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // 기존 현재 시간 표시선 제거
  const existingLines = document.querySelectorAll('.current-time-line');
  existingLines.forEach(line => line.remove());
  
  // 선택된 날짜가 오늘이 아니면 현재 시간 표시선을 표시하지 않음
  const today = new Date();
  const displayDate = selectedDate || today;
  if (displayDate.toDateString() !== today.toDateString()) {
    return; // 오늘 날짜가 아니면 함수 종료
  }
  
  // 현재 시간이 속한 60분 블록 찾기
  const currentBlockIndex = Math.floor(currentMinutes / 60);
  const timeBlocks = document.querySelectorAll('.time-block');
  
  if (timeBlocks[currentBlockIndex]) {
    const timeBlock = timeBlocks[currentBlockIndex];
    const blockStartMinutes = currentBlockIndex * 60;
    
    // 현재 시간 표시선 생성
    const currentTimeLine = document.createElement('div');
    currentTimeLine.className = 'current-time-line';
    const currentTimeOffset = ((currentMinutes - blockStartMinutes) / 60) * 100;
    currentTimeLine.style.top = `${currentTimeOffset}%`;
    
    // 현재 시간 텍스트 추가
    const currentTimeText = document.createElement('div');
    currentTimeText.className = 'current-time-text';
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 시간 형식 설정 적용
    let timeFormatSetting = window.userSettings?.timeFormat;
    if (!timeFormatSetting) {
      // 기본값은 사용자가 선택한 값을 유지하기 위해 localStorage에서 확인
      timeFormatSetting = localStorage.getItem('timeFormat') || '24';
    }
    
    if (timeFormatSetting === '12') {
      // 12시간제 형식
      const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
      const ampm = currentHour < 12 ? 'AM' : 'PM';
      currentTimeText.textContent = `${displayHour}:${currentMinute.toString().padStart(2, '0')} ${ampm}`;
    } else {
      // 24시간제 형식
      const displayHour = currentHour;
      currentTimeText.textContent = `${displayHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    }
    
    currentTimeLine.appendChild(currentTimeText);
    
    timeBlock.appendChild(currentTimeLine);
  }
}

// 실시간 현재 시간 업데이트
function startRealTimeUpdate() {
  // 매분마다 현재 시간 표시선만 업데이트
  setInterval(() => {
    updateCurrentTimeLine();
  }, 60000); // 60초마다 업데이트
  
  // 매초마다 현재 시간 텍스트만 업데이트
  setInterval(() => {
    const currentTimeText = document.querySelector('.current-time-text');
    
    if (currentTimeText) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // 시간 형식 설정 적용
      let timeFormatSetting = '12'; // 기본값을 12시간제로 변경
      if (window.userSettings && window.userSettings.timeFormat) {
        timeFormatSetting = window.userSettings.timeFormat;
      }
      
      if (timeFormatSetting === '12') {
        // 12시간제 형식
        const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
        const ampm = currentHour < 12 ? 'AM' : 'PM';
        currentTimeText.textContent = `${displayHour}:${currentMinute.toString().padStart(2, '0')} ${ampm}`;
      } else {
        // 24시간제 형식
        const displayHour = currentHour;
        currentTimeText.textContent = `${displayHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      }
    }
  }, 1000); // 1초마다 업데이트
}

// 인증 상태 확인 함수
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/check');
    const data = await response.json();
    
    if (!data.authenticated) {
      window.location.href = '/login';
      return false;
    }
    
    // 사용자 정보 표시 (선택사항)
    if (data.username) {
      console.log('로그인된 사용자:', data.username);
    }
    
    return true;
  } catch (error) {
    console.error('인증 확인 실패:', error);
    window.location.href = '/login';
    return false;
  }
}

// 로그아웃 함수
async function logout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('로그아웃 실패:', error);
  }
}

// 플로팅 메뉴 기능
function initFloatingMenu() {
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const menuOptions = document.getElementById('menuOptions');
  const timeInputBtn = document.getElementById('timeInputBtn');
  const timeInputModal = document.getElementById('timeInputModal');
  const modalClose = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveTimeBtn = document.getElementById('saveTimeBtn');
  const startTimeInput = document.getElementById('startTimeInput');
  const endTimeInput = document.getElementById('endTimeInput');
  
  // 활동바 수정 모달 이벤트 리스너 초기화
  console.log('활동 수정 모달 이벤트 리스너 초기화');
  console.log('DOM 요소 확인:', {
    activityModalClose: activityModalClose,
    saveEditBtn: saveEditBtn,
    deleteActivityBtn: deleteActivityBtn
  });
  
  activityModalClose.addEventListener('click', function() {
    closeActivityEditModal();
  });
  
  saveEditBtn.addEventListener('click', function() {
    updateActivity();
  });
  
  deleteActivityBtn.addEventListener('click', function() {
    deleteActivity();
  });
  
  // 활동 수정 모달 배경 클릭 시 닫기
  activityEditModal.addEventListener('click', (e) => {
    if (e.target === activityEditModal) {
      closeActivityEditModal();
    }
  });
  
  let isMenuOpen = false;
  
  // 메뉴 토글
  menuToggleBtn.addEventListener('click', () => {
    isMenuOpen = !isMenuOpen;
    menuToggleBtn.classList.toggle('active', isMenuOpen);
    menuOptions.classList.toggle('active', isMenuOpen);
  });
  
  // 메뉴 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.floating-menu') && isMenuOpen) {
      isMenuOpen = false;
      menuToggleBtn.classList.remove('active');
      menuOptions.classList.remove('active');
    }
  });
  
  // 시간 입력 버튼 클릭
  timeInputBtn.addEventListener('click', () => {
    timeInputModal.classList.add('active');
    // 현재 시간으로 기본값 설정
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    startTimeInput.value = currentTime;
    endTimeInput.value = currentTime;
  });
  
  // 모달 닫기
  const closeModal = () => {
    timeInputModal.classList.remove('active');
    startTimeInput.value = '';
    endTimeInput.value = '';
  };
  
  modalClose.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  
  // 모달 배경 클릭 시 닫기
  timeInputModal.addEventListener('click', (e) => {
    if (e.target === timeInputModal) {
      closeModal();
    }
  });
  
  // 시간 저장
  saveTimeBtn.addEventListener('click', async () => {
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    
    if (!startTime || !endTime) {
      alert('시작 시간과 종료 시간을 모두 입력해주세요.');
      return;
    }
    
    if (startTime >= endTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }
    
    try {
      // 현재 선택된 날짜 또는 오늘 날짜 사용
      const targetDate = selectedDate || new Date();
      const dateStr = targetDate.toISOString().split('T')[0];
      
      // 시작 시간과 종료 시간을 Date 객체로 변환
      const startDateTime = new Date(`${dateStr}T${startTime}:00`);
      let endDateTime = new Date(`${dateStr}T${endTime}:00`);
      
      // 종료 시간이 시작 시간보다 이전인 경우 다음 날로 설정
      if (endDateTime < startDateTime) {
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDateStr = nextDay.toISOString().split('T')[0];
        endDateTime = new Date(`${nextDateStr}T${endTime}:00`);
      }
      
      const duration = endDateTime.getTime() - startDateTime.getTime();
      
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          duration: duration,
          pausedIntervals: [],
          targetDate: targetDate.toISOString() // 선택된 날짜 정보 추가
        })
      });
      
      if (response.ok) {
        await loadRecords();
        renderDailyView();
        updateStats();
        closeModal();
      } else if (response.status === 401) {
        // 인증 오류 - 로그인 페이지로 리디렉션
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/login';
      } else {
        throw new Error('저장 실패');
      }
    } catch (error) {
      console.error('시간 저장 중 오류:', error);
      alert('시간 저장 중 오류가 발생했습니다.');
    }
  });
}

// 사용자 설정 로드
async function loadUserSettings() {
  try {
    const response = await fetch('/api/settings');
    if (response.ok) {
      const settings = await response.json();
      // 전역 변수에 설정 저장하여 다른 함수에서 접근 가능하게 함
      window.userSettings = settings;
      return settings;
    } else {
      console.error('설정 로드 실패:', response.status);
      window.userSettings = {};
      return {};
    }
  } catch (error) {
    console.error('설정 로드 오류:', error);
    window.userSettings = {};
    return {};
  }
}

// 사용자 설정 저장
async function saveUserSetting(settingKey, settingValue) {
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        settingKey,
        settingValue
      })
    });
    
    if (response.ok) {
      // 전역 설정 객체에도 즉시 반영
      if (!window.userSettings) {
        window.userSettings = {};
      }
      window.userSettings[settingKey] = settingValue;
    } else {
      console.error('설정 저장 실패:', response.status);
    }
  } catch (error) {
    console.error('설정 저장 오류:', error);
  }
}

// 타이머 토글 기능
async function initTimerToggle() {
  // 서버에서 사용자 설정 불러오기
  const settings = await loadUserSettings();
  const isVisible = settings.timerVisible === undefined ? true : settings.timerVisible === 'true';
  
  // 토글 상태 설정
  timerToggle.checked = isVisible;
  
  // 타이머 옵션 표시/숨김
  timerOption.style.display = isVisible ? 'block' : 'none';
  
  // 토글 이벤트 리스너
  timerToggle.addEventListener('change', async () => {
    const visible = timerToggle.checked;
    timerOption.style.display = visible ? 'block' : 'none';
    
    // 서버에 설정 저장
    await saveUserSetting('timerVisible', visible.toString());
    
    // 타이머가 실행 중이고 숨김으로 변경된 경우 타이머 정지
    if (!visible && timerInterval) {
      stopBtn.click();
    }
  });
}

// 추가 설정들 초기화
async function initAdditionalSettings() {
  const settings = await loadUserSettings();
  
  // 시간 형식 설정
  // 서버 설정, localStorage, 기본값 순으로 확인
  const timeFormat = settings.timeFormat || localStorage.getItem('timeFormat') || '12';
  timeFormatSelect.value = timeFormat;
  timeFormatSelect.addEventListener('change', async () => {
    await saveUserSetting('timeFormat', timeFormatSelect.value);
    // localStorage에도 저장하여 새로고침 시 설정 유지
    localStorage.setItem('timeFormat', timeFormatSelect.value);
    // 시간 표시 업데이트
    updateTimeDisplay();
  });
  
  // 주간 시작일 설정
  const weekStart = settings.weekStart || '0';
  weekStartSelect.value = weekStart;
  weekStartSelect.addEventListener('change', async () => {
    await saveUserSetting('weekStart', weekStartSelect.value);
    // 캘린더 다시 렌더링
    renderCalendar();
  });
  
  // 다크 모드 설정
  const darkMode = settings.darkMode === 'true';
  darkModeToggle.checked = darkMode;
  if (darkMode) {
    document.body.classList.add('dark-mode');
  }
  darkModeToggle.addEventListener('change', async () => {
    const isDark = darkModeToggle.checked;
    document.body.classList.toggle('dark-mode', isDark);
    await saveUserSetting('darkMode', isDark.toString());
  });
  
  // 데이터 내보내기 버튼
  exportDataBtn.addEventListener('click', exportData);
  
  // 데이터 불러오기 버튼
  importDataBtn.addEventListener('click', () => {
    importDataInput.click();
  });
  
  // 파일 선택 시 데이터 불러오기
  importDataInput.addEventListener('change', importData);
}

// 시간 표시 업데이트 (시간 형식 변경 시)
function updateTimeDisplay() {
  // 기존 시간 표시들을 새로운 형식으로 업데이트
  updateStats();
  renderDailyView();
}

// 데이터 내보내기
async function exportData() {
  try {
    const response = await fetch('/api/records');
    const records = await response.json();
    
    const dataStr = JSON.stringify(records, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `time-records-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert('데이터가 성공적으로 내보내졌습니다.');
  } catch (error) {
    console.error('데이터 내보내기 오류:', error);
    alert('데이터 내보내기에 실패했습니다.');
  }
}

// 데이터 불러오기
async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.endsWith('.json')) {
    alert('JSON 파일만 업로드할 수 있습니다.');
    return;
  }
  
  try {
    const text = await file.text();
    const importedRecords = JSON.parse(text);
    
    if (!Array.isArray(importedRecords)) {
      throw new Error('올바른 형식이 아닙니다.');
    }
    
    // 데이터 유효성 검사
    const validRecords = importedRecords.filter(record => {
      return record.start_time && record.end_time && record.duration;
    });
    
    if (validRecords.length === 0) {
      alert('유효한 기록이 없습니다.');
      return;
    }
    
    if (!confirm(`${validRecords.length}개의 기록을 불러오시겠습니까?`)) {
      return;
    }
    
    // 선택된 날짜가 있으면 해당 날짜를 사용하고, 없으면 현재 날짜 사용
    const targetDate = selectedDate || new Date();
    
    // 서버에 데이터 업로드
    for (const record of validRecords) {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: record.start_time,
          endTime: record.end_time,
          duration: record.duration,
          pausedIntervals: record.paused_intervals || [],
          targetDate: targetDate.toISOString() // 선택된 날짜 정보 추가
        })
      });
      
      if (!response.ok) {
        console.error('기록 업로드 실패:', record);
      }
    }
    
    // 데이터 다시 로드
    await loadRecords();
    updateStats();
    renderCalendar();
    renderDailyView();
    
    alert(`${validRecords.length}개의 기록을 성공적으로 불러왔습니다.`);
    
    // 파일 입력 초기화
    event.target.value = '';
    
  } catch (error) {
    console.error('데이터 불러오기 오류:', error);
    alert('데이터 불러오기에 실패했습니다. 파일 형식을 확인해주세요.');
    event.target.value = '';
  }
}

// 실시간 업데이트 함수
function startRealTimeUpdate() {
  // 1분마다 현재 시간 표시선 업데이트 및 달력 데이터 갱신
  setInterval(async () => {
    // 현재 시간 표시선 업데이트
    updateCurrentTimeLine();
    
    // 기록 새로 로드
    await loadRecords();
    
    // 달력 및 통계 업데이트
    renderCalendar();
    updateStats();
    
    // 현재 보고 있는 날짜의 일간 뷰 업데이트
    renderDailyView();
  }, 60000); // 1분마다 업데이트
}

// 초기화
async function init() {
  // 인증 상태 확인
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    return;
  }
  
  // 기록 로드
  await loadRecords();
  
  // 실시간 업데이트 시작
  startRealTimeUpdate();
  
  // UI 초기화
  updateTotalTimer();
  renderCalendar();
  renderDailyView();
  updateStats();
  initNavigation();
  initFloatingMenu();
  await initTimerToggle();
  await initAdditionalSettings();
  
  // 초기 로드 시 현재 시간으로 스크롤 (오늘 날짜일 때만)
  if (!selectedDate || selectedDate.toDateString() === new Date().toDateString()) {
    setTimeout(() => {
      scrollToCurrentTime();
    }, 500); // DOM 렌더링 완료 후 스크롤 (지연시간 증가)
  }
  
  // 실시간 업데이트 시작
  startRealTimeUpdate();
  
  // 로그아웃 버튼 이벤트
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// 앱 시작
init();