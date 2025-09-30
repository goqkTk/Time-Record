const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/config');

/**
 * 데이터베이스 관리 클래스
 * SQLite 데이터베이스 연결 및 테이블 관리를 담당
 */
class Database {
  constructor() {
    this.db = null;
    this.dbPath = config.database.filename;
  }

  /**
   * 데이터베이스 초기화
   * 데이터베이스 연결 및 테이블 생성
   * @returns {Promise<Object>} 데이터베이스 인스턴스
   */
  async init() {
    try {
      await this.connect();
      await this.createTables();
      return this.db;
    } catch (error) {
      console.error('데이터베이스 초기화 실패:', error.message);
      throw error;
    }
  }

  /**
   * 데이터베이스 연결
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('데이터베이스 연결 실패:', err.message);
          reject(err);
        } else {
          console.log('SQLite 데이터베이스에 연결되었습니다.');
          resolve();
        }
      });
    });
  }

  /**
   * 테이블 생성
   * @returns {Promise<void>}
   */
  async createTables() {
    try {
      await this.createUsersTable();
      await this.createRecordsTable();
      await this.createUserSettingsTable();
      console.log('데이터베이스 테이블이 성공적으로 생성되었습니다.');
    } catch (error) {
      console.error('테이블 생성 실패:', error.message);
      throw error;
    }
  }

  /**
   * SQL 쿼리 실행 헬퍼 함수
   * @param {string} sql - SQL 쿼리문
   * @param {Array} params - 쿼리 파라미터
   * @returns {Promise<void>}
   */
  executeQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Users 테이블 생성
   * @returns {Promise<void>}
   */
  createUsersTable() {
    const sql = `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`;
    return this.executeQuery(sql);
  }

  /**
   * Records 테이블 생성
   * @returns {Promise<void>}
   */
  createRecordsTable() {
    const sql = `CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time TEXT,
      end_time TEXT,
      duration INTEGER,
      paused_intervals TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;
    return this.executeQuery(sql);
  }

  /**
   * User Settings 테이블 생성
   * @returns {Promise<void>}
   */
  createUserSettingsTable() {
    const sql = `CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, setting_key)
    )`;
    return this.executeQuery(sql);
  }

  /**
   * 데이터베이스 인스턴스 반환
   * @returns {Object} 데이터베이스 인스턴스
   */
  getDatabase() {
    return this.db;
  }

  /**
   * 데이터베이스 연결 종료
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.db) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('데이터베이스 연결 종료 실패:', err.message);
          reject(err);
        } else {
          console.log('데이터베이스 연결이 종료되었습니다.');
          this.db = null;
          resolve();
        }
      });
    });
  }
}

module.exports = Database;