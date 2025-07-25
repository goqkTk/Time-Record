let timerInterval;
let startTime;
let elapsed = 0;

const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function updateTimer() {
  const now = Date.now();
  elapsed = now - startTime;
  timerEl.textContent = formatTime(elapsed);
}

startBtn.onclick = () => {
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
  startBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = async () => {
  clearInterval(timerInterval);
  updateTimer();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  const endTime = Date.now();
  const duration = elapsed;
  // 서버로 기록 전송
  await fetch('/api/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration
    })
  });
  // 타이머 리셋
  timerEl.textContent = '00:00:00';
  elapsed = 0;
}; 