import SQLite from 'react-native-sqlite-storage';

const db = SQLite.openDatabase({ name: 'violations.db', location: 'default' });

export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT,
        imageUri TEXT,
        date TEXT,
        userId TEXT,
        latitude REAL,
        longitude REAL,
        synced INTEGER DEFAULT 0
      );
    `);
  });
};

export const saveViolationToDB = (violation) => {
  db.transaction(tx => {
    tx.executeSql(
      `INSERT INTO violations (description, imageUri, date, userId, latitude, longitude, synced)
       VALUES (?, ?, ?, ?, ?, ?, 0);`,
      [
        violation.description,
        violation.imageUri,
        violation.date,
        violation.userId,
        violation.latitude,
        violation.longitude
      ],
      () => console.log('[DB] ✔ Violation saved'),
      (_, error) => { console.error('[DB] ❌ Insert error:', error); return false; }
    );
  });
};

export const getUnsyncedViolations = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM violations WHERE synced = 0;',
        [],
        (_, results) => {
          const rows = results.rows;
          const violations = [];
          for (let i = 0; i < rows.length; i++) {
            violations.push(rows.item(i));
          }
          resolve(violations);
        },
        (_, error) => { reject(error); return false; }
      );
    });
  });
};

export const markAsSynced = (id) => {
  db.transaction(tx => {
    tx.executeSql(
      `UPDATE violations SET synced = 1 WHERE id = ?;`,
      [id],
      () => console.log('[DB] ✔ Marked as synced'),
      (_, error) => { console.error('[DB] ❌ Sync update error:', error); return false; }
    );
  });
};
