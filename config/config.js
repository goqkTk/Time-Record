require('dotenv').config();

module.exports = {
  // 서버 설정
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // 세션 설정
  session: {
    secret: process.env.SKEY || 'superduperholymolylegendpublickey',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000 // 24시간
    }
  },

  // 데이터베이스 설정
  database: {
    filename: './db/time-record.db'
  },

  // 보안 설정
  security: {
    bcryptRounds: 10,
    minPasswordLength: 4,
    minUsernameLength: 3
  }
};