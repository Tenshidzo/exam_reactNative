  import * as SQLite from 'expo-sqlite';
  import { Buffer } from 'buffer';
  import pako from 'pako';

  const openAndClose = async (operation) => {
    let db;
    try {
      db = await SQLite.openDatabaseAsync('mydatabase1.db');
      return await operation(db);
    } finally {
      if (db && !db._closed) {
        await db.closeAsync().catch(e => console.warn('Close error:', e));
      }
    }
  };


  export const initDB = async () => {
    try {
      await openAndClose(async (db) => { 
        const tableExists = await db.getFirstAsync(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='violations'"
        );

        if (!tableExists) {
          console.log('Создаем таблицу violations...');
          await db.execAsync(`
            CREATE TABLE violations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              description TEXT NOT NULL,
              image TEXT,
              date TEXT DEFAULT CURRENT_TIMESTAMP,
              userId TEXT NOT NULL,
              latitude REAL NOT NULL,
              longitude REAL NOT NULL,
              isSynced INTEGER DEFAULT 0
            )
          `);

          await db.execAsync(`
            CREATE INDEX idx_violations_isSynced
            ON violations(isSynced)
          `);
          console.log('Таблица и индекс созданы');
        }
      });
    } catch (e) {
      console.error('Ошибка инициализации БД:', e);
      throw e;
    }
  };

  export const getAllLocalViolations = async (userId) => {
    console.log('[DB] Получение нарушений для userId:', userId);
    try {
      return await openAndClose(async (db) => {
        const rows = await db.getAllAsync(
          `SELECT * FROM violations WHERE userId = ? ORDER BY date DESC`,
          [userId]
        );
        console.log('[DB] Найдено нарушений:', rows.length);
        return rows.map(r => {
          console.log('[DB] Обработка записи ID:', r.id);
          return { 
            ...r,
            imageUri: r.image ? `data:image/jpeg;base64,${r.image}` : null
          };
        });
      });
    } catch (e) {
      console.error('[DB] Ошибка получения данных:', e);
      return [];
    }
  };

  export const getUnsyncedViolations = async () => {
    return openAndClose(async (db) => {
      const rows = await db.getAllAsync(`
        SELECT * FROM violations WHERE isSynced = 0
      `);

      return rows.map(r => ({ ...r }));
    });
  };

  export const getImageBase64ById = async (id) => {
    return openAndClose(async (db) => {
      const result = await db.getFirstAsync(
        `SELECT image FROM violations WHERE id = ?`,
        [id]
      );

      if (!result) {
        console.warn(`Нет результата для ID: ${id}`);
        return null;
      }
      if (!result.image) {
        console.warn(`Нет поля image для ID: ${id}`);
        return null;
      }

      try {
        const raw = result.image;
        console.log(`[DEBUG] raw image for id ${id}:`, typeof raw, raw?.slice?.(0, 30));

        if (typeof raw !== 'string') {
          console.warn(`Неверный тип image для ID ${id}:`, typeof raw);
          return null;
        }

        const compressedBytes = Buffer.from(raw, 'base64');
        const decompressed = pako.inflate(compressedBytes);
        const base64 = Buffer.from(decompressed).toString('base64');
        console.log(`Изображение ID: ${id} извлечено, размер: ${base64.length} символов`);
        return base64;

      } catch (e) {
        console.error(`Ошибка декомпрессии изображения ${id}:`, e);
        return null;
      }
    });
  };

  export const saveViolationToDB = async (violation) => {
    console.log('[DB] Сохранение нарушения:', violation.isSynced);
    if (
    !violation ||
    typeof violation.description !== 'string' || violation.description.trim() === '' ||
    typeof violation.userId !== 'string' || violation.userId.trim() === '' ||
    typeof violation.latitude !== 'number' ||
    typeof violation.longitude !== 'number' ||
    isNaN(violation.latitude) || isNaN(violation.longitude)
  ) {
    const message = '[DB] Ошибка валидации: Некорректные данные нарушения';
    console.warn(message, violation);
    throw new Error(message);
  }
    try {
      return await openAndClose(async (db) => {
        const result = await db.runAsync(
          `INSERT INTO violations 
          (description, date, userId, latitude, longitude, image, isSynced)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            violation.description,
            violation.date,
            violation.userId,
            violation.latitude,
            violation.longitude,
            violation.imageUri,
            violation.isSynced ? 1 : 0
          ]
        );
        console.log('[DB] Нарушение сохранено, ID:', result.lastInsertRowId);
        return result;
      });
    } catch (e) {
      console.error('[DB] Ошибка сохранения:', e);
      throw e;
    }
  };

  export const markAsSynced = async (id) => {
    return openAndClose(async (db) => {
      await db.runAsync(
        'UPDATE violations SET isSynced = 1 WHERE id = ?',
        [id]
      );
      console.log(`Нарушение ${id} синхронизировано`);
    });
  };

  export const deleteDatabase = async () => {
    try {
      await SQLite.deleteDatabaseAsync('mydatabase1.db');
      console.log('✅ База данных успешно удалена');
      _db = null; 
      return true;
    } catch (e) {
      console.error('Ошибка удаления БД:', e);
      return false;
    }
  };

  export const deleteViolationFromDB = async (id) => {
    return openAndClose(async (db) => {
      await db.runAsync(
        'DELETE FROM violations WHERE id = ?',
        [id]
      );
      return true;
    });
  };

  export const getAllViolationIds = async () => {
    return openAndClose(async (db) => {
      const rows = await db.getAllAsync(`SELECT id FROM violations`);
      return rows.map(row => row.id);
    });
  };
  export const getLocalViolationsFiltered = async (userId, { date, lat, lng, radius }) => {
  return openAndClose(async (db) => {
    let query = `SELECT * FROM violations WHERE userId = ?`;
    const params = [userId];

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query += ` AND date BETWEEN ? AND ?`;
      params.push(start.toISOString(), end.toISOString());
    }

    if (lat != null && lng != null && radius != null) {
     
      const R = 6371; 
      const r = parseFloat(radius);
      const latFloat = parseFloat(lat);
      const lngFloat = parseFloat(lng);

      const latMin = latFloat - r / 111;
      const latMax = latFloat + r / 111;
      const lngMin = lngFloat - r / (111 * Math.cos(latFloat * Math.PI / 180));
      const lngMax = lngFloat + r / (111 * Math.cos(latFloat * Math.PI / 180));

      query += ` AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`;
      params.push(latMin, latMax, lngMin, lngMax);
    }

    query += ` ORDER BY date DESC`;

    const rows = await db.getAllAsync(query, params);

    return rows.map(r => ({
      ...r,
      imageUri: r.image ? `data:image/jpeg;base64,${r.image}` : null
    }));
  });
};