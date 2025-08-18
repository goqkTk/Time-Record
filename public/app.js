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
  // 플로팅 타이머에서는 총 시간 표시 제거
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
  
  // 버튼 상태 변경 (재시작 아이콘으로 변경)
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
      
      await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date(sessionStartTime).toISOString(),
          endTime: sessionEndTime.toISOString(),
          duration: actualWorkDuration,
          paused_intervals: pausedIntervals
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
  dailyTotalEl.textContent = formatDurationShort(dayTotal);
  
  // 분 단위 타임라인 생성 (24시간 * 60분 = 1440분)
  hourlyTimelineEl.innerHTML = '';
  
  // 현재 시간 계산
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // 30분 간격으로 표시 (48개 블록)
  for (let minutes = 0; minutes < 1440; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    
    const timeBlock = document.createElement('div');
    timeBlock.className = 'time-block';
    
    // 현재 시간 표시선
    if (minutes <= currentMinutes && currentMinutes < minutes + 30) {
      const currentTimeLine = document.createElement('div');
      currentTimeLine.className = 'current-time-line';
      const currentTimeOffset = ((currentMinutes - minutes) / 30) * 100;
      currentTimeLine.style.top = `${currentTimeOffset}%`;
      
      // 현재 시간 텍스트 추가
      const currentTimeText = document.createElement('div');
      currentTimeText.className = 'current-time-text';
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
       currentTimeText.textContent = `${displayHour}:${currentMinute.toString().padStart(2, '0')}`;
      currentTimeLine.appendChild(currentTimeText);
      
      timeBlock.appendChild(currentTimeLine);
    }
    
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    
    // AM/PM 형식으로 시간 표시
    if (minute === 0) {
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      timeLabel.textContent = `${displayHour} ${ampm}`;
    } else {
      timeLabel.textContent = '';
    }
    
    const activityArea = document.createElement('div');
    activityArea.className = 'activity-area';
    
    // 해당 시간대의 활동 찾기 (저장된 기록)
    const timeRecords = dayRecords.filter(record => {
      const recordStart = new Date(record.start_time);
      const recordEnd = new Date(recordStart.getTime() + record.duration);
      const recordStartMinutes = recordStart.getHours() * 60 + recordStart.getMinutes();
      const recordEndMinutes = recordEnd.getHours() * 60 + recordEnd.getMinutes();
      
      return recordStartMinutes < minutes + 30 && recordEndMinutes > minutes;
    });
    
    // 현재 진행 중인 세션 확인 (오늘 날짜일 때만)
    let currentSessionRecord = null;
    const isDisplayingToday = displayDate.toDateString() === new Date().toDateString();
    if (isDisplayingToday && sessionStartTime && (totalElapsed > 0 || elapsed > 0)) {
      const sessionStart = new Date(sessionStartTime);
      const sessionEnd = new Date();
      const sessionStartMinutes = sessionStart.getHours() * 60 + sessionStart.getMinutes();
      const sessionEndMinutes = sessionEnd.getHours() * 60 + sessionEnd.getMinutes();
      
      if (sessionStartMinutes < minutes + 30 && sessionEndMinutes > minutes) {
        currentSessionRecord = {
        start_time: sessionStart.toISOString(),
        duration: totalElapsed + elapsed,
        paused_intervals: pausedIntervals
      };
      }
    }
    
    // 모든 활동 기록 (저장된 기록 + 현재 세션)
    const allRecords = [...timeRecords];
    if (currentSessionRecord) {
      allRecords.push(currentSessionRecord);
    }
    
    if (allRecords.length > 0) {
      allRecords.forEach(record => {
        const recordStart = new Date(record.start_time);
        const recordEnd = new Date(recordStart.getTime() + record.duration);
        const recordStartMinutes = recordStart.getHours() * 60 + recordStart.getMinutes();
        const recordEndMinutes = recordEnd.getHours() * 60 + recordEnd.getMinutes();
        
        // 활동 바 생성 (실제 작업 시간)
        const activityBar = document.createElement('div');
        activityBar.className = 'activity-bar-vertical';
        
        // 활동 바의 위치와 높이 계산
        const startOffset = Math.max(0, recordStartMinutes - minutes);
        const endOffset = Math.min(30, recordEndMinutes - minutes);
        const height = ((endOffset - startOffset) / 30) * 100;
        const top = (startOffset / 30) * 100;
        
        activityBar.style.height = `${height}%`;
        activityBar.style.top = `${top}%`;
        
        // 활동 제목 표시 (첫 번째 블록에만)
        if (recordStartMinutes >= minutes && recordStartMinutes < minutes + 30) {
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
              const pauseStartMinutes = pauseStart.getHours() * 60 + pauseStart.getMinutes();
              const pauseEndMinutes = pauseEnd.getHours() * 60 + pauseEnd.getMinutes();
              
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
            if (segment.start < minutes + 30 && segment.end > minutes) {
              const segmentBar = document.createElement('div');
              segmentBar.className = segment.type === 'paused' ? 'activity-bar-paused' : 'activity-bar-vertical';
              
              const segmentStartOffset = Math.max(0, segment.start - minutes);
              const segmentEndOffset = Math.min(30, segment.end - minutes);
              const segmentHeight = ((segmentEndOffset - segmentStartOffset) / 30) * 100;
              const segmentTop = (segmentStartOffset / 30) * 100;
              
              segmentBar.style.height = `${segmentHeight}%`;
              segmentBar.style.top = `${segmentTop}%`;
              
              // 활동 제목은 첫 번째 활성 세그먼트에만 추가
              if (segment.type === 'active' && segment.start >= minutes && segment.start < minutes + 30 && recordStartMinutes >= minutes && recordStartMinutes < minutes + 30) {
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



// 현재 시간으로 스크롤 (초기 로드 시에만 사용)
function scrollToCurrentTime() {
  const currentTime = new Date();
  const scrollCurrentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const currentBlockIndex = Math.floor(scrollCurrentMinutes / 30);
  const currentBlock = hourlyTimelineEl.children[currentBlockIndex];
  
  if (currentBlock) {
    // 현재 시간 블록이 화면 중앙에 오도록 스크롤
    const containerHeight = hourlyTimelineEl.parentElement.clientHeight;
    const blockHeight = currentBlock.offsetHeight;
    const scrollTop = currentBlock.offsetTop - (containerHeight / 2) + (blockHeight / 2);
    
    hourlyTimelineEl.parentElement.scrollTop = Math.max(0, scrollTop);
  }
}

// 현재 시간 표시선 업데이트
function updateCurrentTimeLine() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // 기존 현재 시간 표시선 제거
  const existingLines = document.querySelectorAll('.current-time-line');
  existingLines.forEach(line => line.remove());
  
  // 현재 시간이 속한 30분 블록 찾기
  const currentBlockIndex = Math.floor(currentMinutes / 30);
  const timeBlocks = document.querySelectorAll('.time-block');
  
  if (timeBlocks[currentBlockIndex]) {
    const timeBlock = timeBlocks[currentBlockIndex];
    const blockStartMinutes = currentBlockIndex * 30;
    
    // 현재 시간 표시선 생성
    const currentTimeLine = document.createElement('div');
    currentTimeLine.className = 'current-time-line';
    const currentTimeOffset = ((currentMinutes - blockStartMinutes) / 30) * 100;
    currentTimeLine.style.top = `${currentTimeOffset}%`;
    
    // 현재 시간 텍스트 추가
    const currentTimeText = document.createElement('div');
    currentTimeText.className = 'current-time-text';
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
    currentTimeText.textContent = `${displayHour}:${currentMinute.toString().padStart(2, '0')}`;
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
      const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
      currentTimeText.textContent = `${displayHour}:${currentMinute.toString().padStart(2, '0')}`;
    }
  }, 1000); // 1초마다 업데이트
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
  
  // 초기 로드 시 현재 시간으로 스크롤 (오늘 날짜일 때만)
  if (!selectedDate || selectedDate.toDateString() === new Date().toDateString()) {
    setTimeout(() => {
      scrollToCurrentTime();
    }, 100); // DOM 렌더링 완료 후 스크롤
  }
  
  // 실시간 업데이트 시작
  startRealTimeUpdate();
}

// 앱 시작
init();