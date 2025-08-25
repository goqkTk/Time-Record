// 인증 미들웨어
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
}

// 로그인 상태에서만 접근 가능한 페이지 미들웨어
function redirectIfNotAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.redirect('/login');
  }
}

// 이미 로그인한 사용자는 로그인 페이지 접근 제한
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  } else {
    return next();
  }
}

module.exports = {
  requireAuth,
  redirectIfNotAuthenticated,
  redirectIfAuthenticated
};