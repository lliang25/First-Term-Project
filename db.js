const sqlite3 = require("sqlite3").verbose();

function openDb() {
    const db = new sqlite3.Database("./database.sqlite");
    db.serialize(() => {
        db.run("PRAGMA foreign_keys = ON")
        db.run(`
            CREATE TABLE IF NOT EXISTS students (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                notifications_enabled INTEGER NOT NULL DEFAULT 0,
                created_at TEXT
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS classes (
                class_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                meeting_time TEXT,
                location TEXT,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES students(user_id) ON DELETE CASCADE
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS assignments (
                assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                location TEXT,
                deadline TEXT,
                is_done INTEGER NOT NULL DEFAULT 0,
                has_notification INTEGER NOT NULL DEFAULT 0,
                created_at TEXT,
                FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS reminders (
                reminder_id INTEGER PRIMARY KEY AUTOINCREMENT,
                assignment_id INTEGER NOT NULL UNIQUE,
                reminder_time TEXT NOT NULL,
                is_sent INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE
            )
        `)
    });
    return db;
}

module.exports = { openDb };
