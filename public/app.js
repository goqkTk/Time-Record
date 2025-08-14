// 전역 변수
let timerInterval;
let startTime;
let elapsed = 0;
let totalElapsed = 0;
let isPaused = false;
let currentDate = new Date();
let selectedDate = null;
let records = [];

// DOM 요소들
const timerEl = document.getElementById('timer');
const totalTimerEl = document.getElementById('totalTimer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
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

// 유틸리티 함수들
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
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
  totalTimerEl.textContent = '총: ' + formatTime(totalElapsed + elapsed);
}

function resetTimer() {
  timerEl.textContent = '00:00:00';
  elapsed = 0;
}

function updateTotalTimer() {
  totalTimerEl.textContent = '총: ' + formatTime(totalElapsed);
}

startBtn.onclick = () => {
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
  isPaused = false;
  
  // 버튼 상태 변경
  startBtn.style.display = 'none';
  pauseBtn.style.display = 'flex';
  stopBtn.style.display = 'flex';
};

pauseBtn.onclick = () => {
  clearInterval(timerInterval);
  totalElapsed += elapsed;
  isPaused = true;
  
  // 현재 타이머 리셋하고 총 시간 업데이트
  resetTimer();
  updateTotalTimer();
  
  // 버튼 상태 변경
  startBtn.style.display = 'flex';
  pauseBtn.style.display = 'none';
  stopBtn.style.display = 'flex';
};

stopBtn.onclick = async () => {
  clearInterval(timerInterval);
  
  // 총 시간 계산
  const finalDuration = totalElapsed + elapsed;
  
  if (finalDuration > 0) {
    // 서버로 기록 전송
    try {
      const sessionStartTime = new Date(Date.now() - finalDuration);
      const sessionEndTime = new Date();
      
      await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: sessionStartTime.toISOString(),
          endTime: sessionEndTime.toISOString(),
          duration: finalDuration
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
  updateTotalTimer();
  
  // 버튼 상태 변경
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
  
  // 요일 헤더 추가
  const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
  dayHeaders.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'day-header';
    dayEl.textContent = day;
    calendarGrid.appendChild(dayEl);
  });
  
  // 첫 번째 날의 요일 구하기
  const firstDay = new Date(year, month, 1).getDay();
  
  // 이전 달의 마지막 날들 추가
  const prevMonth = new Date(year, month, 0);
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    dayEl.textContent = prevMonth.getDate() - i;
    calendarGrid.appendChild(dayEl);
  }
  
  // 현재 달의 날들 추가
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    const currentDay = new Date(year, month, day);
    
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
      timeDisplay.textContent = formatDurationShort(totalDuration);
      dayEl.appendChild(timeDisplay);
      dayEl.classList.add('has-record');
    }
    
    // 오늘 날짜 표시
     if (isToday(currentDay)) {
       dayEl.classList.add('today');
     }
     
     // 선택된 날짜 표시
     if (selectedDate && selectedDate.toDateString() === currentDay.toDateString()) {
       dayEl.classList.add('selected');
     }
     
     // 날짜 클릭 이벤트
     dayEl.addEventListener('click', () => {
       selectedDate = new Date(currentDay);
       renderCalendar();
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
    calendarGrid.appendChild(dayEl);
  }
}

prevMonthBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

nextMonthBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};



// 일간뷰 렌더링
function renderDailyView() {
  const today = new Date();
  dailyDateEl.textContent = today.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });
  
  // 오늘의 총 시간 계산
  const todayRecords = records.filter(record => {
    const recordDate = new Date(record.start_time);
    return recordDate.toDateString() === today.toDateString();
  });
  
  const todayTotal = todayRecords.reduce((sum, record) => sum + record.duration, 0);
  dailyTotalEl.textContent = formatDurationShort(todayTotal);
  
  // 24시간 타임라인 생성
  hourlyTimelineEl.innerHTML = '';
  
  for (let hour = 0; hour < 24; hour++) {
    const hourBlock = document.createElement('div');
    hourBlock.className = 'hour-block';
    
    const hourTime = document.createElement('div');
    hourTime.className = 'hour-time';
    hourTime.textContent = `${hour.toString().padStart(2, '0')}:00`;
    
    const hourActivity = document.createElement('div');
    hourActivity.className = 'hour-activity';
    
    // 해당 시간대의 활동 찾기
    const hourRecords = todayRecords.filter(record => {
      const recordStart = new Date(record.start_time);
      const recordHour = recordStart.getHours();
      return recordHour === hour;
    });
    
    if (hourRecords.length > 0) {
      hourBlock.classList.add('has-activity');
      
      const totalDuration = hourRecords.reduce((sum, record) => sum + record.duration, 0);
      
      const activityBar = document.createElement('div');
      activityBar.className = 'activity-bar';
      // 바의 너비를 시간에 비례하여 설정 (최대 1시간 = 100%)
      const maxWidth = Math.min(100, (totalDuration / (60 * 60 * 1000)) * 100);
      activityBar.style.width = `${maxWidth}%`;
      
      const activityDuration = document.createElement('div');
      activityDuration.className = 'activity-duration';
      activityDuration.textContent = formatDurationShort(totalDuration);
      
      hourActivity.appendChild(activityBar);
      hourActivity.appendChild(activityDuration);
    }
    
    hourBlock.appendChild(hourTime);
    hourBlock.appendChild(hourActivity);
    hourlyTimelineEl.appendChild(hourBlock);
  }
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
    const response = await fetch('/api/records');
    if (response.ok) {
      records = await response.json();
    }
  } catch (error) {
    console.error('기록 로드 실패:', error);
    records = [];
  }
}

// 네비게이션 기능
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.dataset.view;
      
      // 모든 네비게이션 아이템에서 active 클래스 제거
      navItems.forEach(nav => nav.classList.remove('active'));
      // 클릭된 아이템에 active 클래스 추가
      item.classList.add('active');
      
      // 모든 뷰 숨기기
      views.forEach(view => view.classList.remove('active'));
      // 선택된 뷰 보이기
      document.getElementById(targetView).classList.add('active');
      
      // 시간 뷰로 전환할 때 타임라인 업데이트
      if (targetView === 'time-view') {
        updateTimeline();
      }
    });
  });
}



// 초기화
async function init() {
  // 기록 로드
  await loadRecords();
  
  // UI 초기화
  updateTotalTimer();
  renderCalendar();
  renderDailyView();
  updateStats();
  initNavigation();
}

// 앱 시작
init();