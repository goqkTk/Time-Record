let isLoginMode = true;

const authForm = document.getElementById('authForm');
const authButton = document.getElementById('authButton');
const buttonText = document.getElementById('buttonText');
const loading = document.getElementById('loading');
const switchLink = document.getElementById('switchLink');
const switchText = document.getElementById('switchText');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');

// 모드 전환
switchLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    updateUI();
    clearMessages();
});

function updateUI() {
    if (isLoginMode) {
        buttonText.textContent = '로그인';
        switchText.textContent = '계정이 없으신가요?';
        switchLink.textContent = '회원가입';
        
        confirmPasswordGroup.style.display = 'none';
        confirmPasswordInput.removeAttribute('required');
    } else {
        buttonText.textContent = '회원가입';
        switchText.textContent = '이미 계정이 있으신가요?';
        switchLink.textContent = '로그인';
        
        confirmPasswordGroup.style.display = 'block';
        confirmPasswordInput.setAttribute('required', 'required');
    }
}

function setLoading(loading) {
    const loadingSpinner = document.getElementById('loading');
    const buttonTextEl = document.getElementById('buttonText');
    
    if (loading) {
        authButton.disabled = true;
        buttonTextEl.style.display = 'none';
        loadingSpinner.style.display = 'block';
    } else {
        authButton.disabled = false;
        buttonTextEl.style.display = 'block';
        loadingSpinner.style.display = 'none';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

function clearMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

// 폼 제출
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!username || !password) {
        showError('모든 필드를 입력해주세요');
        return;
    }
    
    if (!isLoginMode) {
        const confirmPassword = confirmPasswordInput.value;
        if (!confirmPassword) {
            showError('모든 필드를 입력해주세요');
            return;
        }
        if (password !== confirmPassword) {
            showError('아이디 또는 비밀번호가 일치하지 않습니다');
            return;
        }
    }
    
    setLoading(true);
    clearMessages();
    
    try {
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const body = isLoginMode 
            ? { username, password }
            : { username, password, confirmPassword: confirmPasswordInput.value };
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (isLoginMode) {
                showSuccess('로그인되었습니다');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                showSuccess('회원가입이 완료되었습니다');
                setTimeout(() => {
                    isLoginMode = true;
                    updateUI();
                    clearMessages();
                    usernameInput.value = '';
                    passwordInput.value = '';
                    confirmPasswordInput.value = '';
                }, 1500);
            }
        } else {
            showError(data.error || '오류가 발생했습니다.');
        }
    } catch (error) {
        showError('서버 연결에 실패했습니다.');
    } finally {
        setLoading(false);
    }
});