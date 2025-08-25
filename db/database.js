const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  // 데이터베이스 초기화
  init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database('./db/time-record.db', (err) => {
        if (err) {
          console.error('데이터베이스 연결 실패:', err.message);
          reject(err);
        } else {
          console.log('SQLite 데이터베이스에 연결되었습니다.');
          this.createTables()
            .then(() => resolve(this.db))
            .catch(reject);
        }
      });
    });
  }

  // 테이블 생성
  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // users 테이블 생성
        this.db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL
        )`, (err) => {
          if (err) {
            console.error('users 테이블 생성 실패:', err.message);
            reject(err);
            return;
          }
        });
        
        // records 테이블 생성
        this.db.run(`CREATE TABLE IF NOT EXISTS records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time TEXT,
          end_time TEXT,
          duration INTEGER,
          paused_intervals TEXT,
          user_id INTEGER REFERENCES users(id),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('records 테이블 생성 실패:', err.message);
            reject(err);
            return;
          }
        });
        
        // user_settings 테이블 생성
        this.db.run(`CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id),
          setting_key TEXT NOT NULL,
          setting_value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, setting_key)
        )`, (err) => {
          if (err) {
            console.error('user_settings 테이블 생성 실패:', err.message);
            reject(err);
            return;
          }
          console.log('데이터베이스 테이블이 성공적으로 생성되었습니다.');
          resolve();
        });
      });
    });
  }

  // 데이터베이스 인스턴스 반환
  getDatabase() {
    return this.db;
  }

  // 데이터베이스 연결 종료
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('데이터베이스 연결 종료 실패:', err.message);
            reject(err);
          } else {
            console.log('데이터베이스 연결이 종료되었습니다.');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = Database;