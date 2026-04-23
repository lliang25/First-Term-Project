const express = require("express");
const cors = require("cors");
const path = require("path");
const { openDb } = require("./db");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer")
const cron = require("node-cron")

const app = express();
app.use(cors());
const db = openDb();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

createTransporter();

// Health check
app.get("/api/health", (req, res) => {
    res.json({ ok: true, message: "Server is running" });
});

// Register student
app.post("/api/students", async (req, res) => {
    const { username, email, password, notifications_enabled } = req.body || {};
    if (!username || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    if (password.length < 12) {
        return res.status(400).json({ error: "Password must be at least 12 characters long"});
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email" });
    }
    try {
        const password_hash = await bcrypt.hash(password, 10);

        const sql = `
        INSERT INTO students (username, email, password_hash, notifications_enabled, created_at)
        VALUES (?, ?, ?, ?, ?)
        `;

        db.run(sql, [username, email, password_hash, notifications_enabled ? 1 : 0, new Date().toISOString()], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // assign json web token to authenticate future requests
            const token = jwt.sign(
                { user_id: this.lastID },
                "secret_key",
                { expiresIn: "1h" }
            );

            res.status(201).json({
                token,
                user_id: this.lastID
            });
        });
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
});

// Login
app.post("/api/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    db.get(
        `SELECT * FROM students WHERE email = ?`, [email], async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!user) return res.status(401).json({ error: "Invalid credentials" });

            try {
                const match = await bcrypt.compare(password, user.password_hash);
                if (!match) {
                    return res.status(401).json({ error: "Invalid credentials" })
                }

                // assign json web token to authenticate future requests
                const token = jwt.sign(
                    { user_id: user.user_id },
                    "secret_key",
                    { expiresIn: "1h" }
                );

                res.json({ token })
            } catch (err) {
                res.status(500).json({ error: err.message })
            }
        }
    );
});

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Missing token" });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ error: "Invalid authorization format" });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, "secret_key");
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
};

// Update student
// only updates fields given
app.patch("/api/students/me", authenticate, async (req, res) => {
    const user_id = req.user.user_id
    const { username, email, password, notifications_enabled } = req.body || {};

    const updates = [];
    const params = [];

    if (username !== undefined) {
        if (username === "") {
            return res.status(400).json({ error: "Invalid username" });
        }
        updates.push("username = ?");
        params.push(username);
    }
    if (email !== undefined) {
        if (email === "") {
            return res.status(400).json({ error: "Invalid email" });
        }
        updates.push("email = ?");
        params.push(email);
    }
    if (notifications_enabled !== undefined) {
        updates.push("notifications_enabled = ?");
        params.push(notifications_enabled ? 1 : 0)
    }

    try {
        if (password !== undefined) {
            if (password === "") {
                return res.status(400).json({ error: "Invalid password" })
            }
            const password_hash = await bcrypt.hash(password, 10);
            updates.push("password_hash = ?");
            params.push(password_hash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        params.push(user_id)
        const sql = `
            UPDATE students
            SET ${updates.join(", ")}
            WHERE user_id = ?
        `;
        
        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Not found" });
            res.json({ ok: true });
        });
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
});

// Create class
app.post("/api/classes", authenticate, (req, res) => {
    const user_id = req.user.user_id
    const { name, meeting_time, location, notes } = req.body || {}
    if (!name) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const sql = `
        INSERT INTO classes (user_id, name, meeting_time, location, notes)
        VALUES (?, ?, ?, ?, ?);
    `
    db.run(sql, [user_id, name, meeting_time || "", location || "", notes || ""], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID })
    })
})

// List classes
app.get("/api/classes", authenticate, (req, res) => {
    const user_id = req.user.user_id;
    db.all("SELECT * FROM classes WHERE user_id = ?", [user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message});
        res.json(rows);
    })
})

// Update class
app.patch("/api/classes/:id", authenticate, (req, res) => {
    const user_id = req.user.user_id
    const class_id = parseInt(req.params.id, 10);
    if (Number.isNaN(class_id)) {
        return res.status(400).json({ error: "Invalid class ID" });
    }
    const { name, meeting_time, location, notes } = req.body || {};

    // verify class belongs to user
    db.get("SELECT * FROM classes WHERE class_id = ? AND user_id = ?", [class_id, user_id], (err, classRow) => {
        if (err) {
            return res.status(500).json({ error: err.message })
        }
        if (!classRow) {
            return res.status(404).json({ error: "Invalid class" })
        }

        const updates = [];
        const params = [];

        if (name !== undefined) {
            if (name === "") {
                return res.status(400).json({ error: "Invalid name" });
            }
            updates.push("name = ?");
            params.push(name);
        }
        const fields = ["meeting_time", "location", "notes"];
        for (const field of fields) {
            const value = req.body[field]
            updates.push(`${field} = ?`);
            params.push(value);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }
        params.push(class_id)
        const sql = `
            UPDATE classes
            SET ${updates.join(", ")}
            WHERE class_id = ? AND user_id = ?
        `;
        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Not found" });
            res.json({ ok: true })
        })
    })
})

// Delete class
app.delete("/api/classes/:id", authenticate, (req, res) => {
    const user_id = req.user.user_id;
    const class_id = Number(req.params.id);
    if (Number.isNaN(class_id)) {
        return res.status(400).json({ error: "Invalid class ID" });
    }
    db.run("DELETE FROM classes WHERE class_id = ? AND user_id = ?", [class_id, user_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true })
    })
})

// Add assignment
app.post("/api/assignments", authenticate, (req, res) => {
    const user_id = req.user.user_id
    const { class_id, name, description, deadline, has_notification } = req.body || {};
    if (!class_id || !name) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // verify class belongs to user
    db.get("SELECT * FROM classes WHERE class_id = ? AND user_id = ?", [class_id, user_id], (err, classRow) => {
        if (err) {
            return res.status(500).json({ error: err.message })
        }
        if (!classRow) {
            return res.status(400).json({ error: "Invalid class" })
        }

        const sql = `
            INSERT INTO assignments (class_id, name, description, deadline, created_at)
            VALUES (?, ?, ?, ?, ?);
        `;
        db.run(sql, [class_id, name, description || "", deadline || null, new Date().toISOString()], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const assignmentID = this.lastID;

            if (deadline && has_notification) {
                const reminderTime = new Date(new Date(deadline).getTime() - 24 * 60 * 60 * 1000);

                db.run(`INSERT INTO reminders (assignment_id, reminder_time) VALUES (?, ?)`, 
                    [assignmentID, reminderTime.toISOString()],
                    function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.status(201).json({ assignmentID: assignmentID, reminderID: this.lastID});
                    }
                )
            } else {
                res.status(201).json({ assignmentID: assignmentID });
            }
        })
    })
});

// List all assignments
app.get("/api/assignments", authenticate, (req, res) => {
    const user_id = req.user.user_id;
    db.all(`
        SELECT a.*
        FROM assignments a
        JOIN classes c ON a.class_id = c.class_id
        WHERE user_id = ?
        ORDER BY a.deadline
    `, [user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message});
        res.json(rows);
    })
})

// List assignments for class
app.get("/api/classes/:id/assignments", authenticate, (req, res) => {
    const user_id = req.user.user_id;
    const class_id = Number(req.params.id);
    if (Number.isNaN(class_id)) {
        return res.status(404).json({ error: "Class not found" });
    }
    
    // verify class belongs to user
    db.get(`SELECT *
            FROM classes
            WHERE class_id = ? AND user_id = ?
            ORDER BY deadline IS NULL, deadline ASC
        `, [class_id, user_id], (err, classRow) => {
        if (err) {
            return res.status(500).json({ error: err.message })
        }
        if (!classRow) {
            return res.status(400).json({ error: "Invalid class" })
        }

        db.all("SELECT * FROM assignments WHERE class_id = ?", [class_id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message});
            res.json(rows);
        })
    })
})

// Update assignment
app.patch("/api/assignments/:id", authenticate, (req, res) => {
    const user_id = req.user.user_id;
    const assignment_id = parseInt(req.params.id, 10);
    if (Number.isNaN(assignment_id)) {
        return res.status(400).json({ error: "Invalid assignment ID" });
    }

    const { class_id, name, description, location, deadline, is_done, has_notification } = req.body || {};

    // verify assignment belongs to user
    db.get(`SELECT a.assignment_id, a.class_id, a.deadline, a.has_notification
            FROM assignments a
            JOIN classes c ON a.class_id = c.class_id
            WHERE a.assignment_id = ? AND c.user_id = ?
        `, [assignment_id, user_id], (err, assignmentRow) => {
        if (err) {
            return res.status(500).json({ error: err.message })
        }
        if (!assignmentRow) {
            return res.status(404).json({ error: "Assignment not found" })
        }

        const updates = [];
        const params = [];

        if (name !== undefined) {
            if (name === "") {
                return res.status(400).json({ error: "Invalid name" });
            }
            updates.push("name = ?");
            params.push(name);
        }
        const textFields = ["description", "location", "deadline"];
        for (const field of textFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(req.body[field]);
            }
        }
        if (is_done !== undefined) {
            updates.push("is_done = ?");
            params.push(is_done ? 1 : 0)
        }
        if (has_notification !== undefined) {
            updates.push("has_notification = ?");
            params.push(has_notification ? 1 : 0)
        }

        const syncReminderAndRespond = () => {
            const finalDeadline = deadline !== undefined ? deadline : assignmentRow.deadline;
            const finalHasNotification = has_notification !== undefined
                ? (has_notification ? 1 : 0)
                : assignmentRow.has_notification

            if (finalDeadline && finalHasNotification) {
                const reminderTime = new Date(new Date(finalDeadline).getTime() - 24 * 60 * 60 * 1000);

                db.run(
                    `INSERT INTO reminders (assignment_id, reminder_time, is_sent)
                    VALUES (?, ?, 0)
                    ON CONFLICT(assignment_id)
                    DO UPDATE SET
                        reminder_time = excluded.reminder_time,
                        is_sent = 0`,
                    [assignment_id, reminderTime.toISOString()],
                    function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ ok: true })
                    }
                );
            } else {
                db.run(`DELETE FROM reminders WHERE assignment_id = ?`, [assignment_id], function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ ok: true })
                });
            }
        }

        const finishUpdate = () => {
            if (updates.length === 0) {
                return res.status(400).json({ error: "No fields to update" });
            }
            const sql = `
                UPDATE assignments
                SET ${updates.join(", ")}
                WHERE assignment_id = ?
            `;
            params.push(assignment_id);
            db.run(sql, params, function (err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: "Not found" });

                syncReminderAndRespond();
            });
        };

        // if class_id is being modified, verify updated class belongs to user
        if (class_id !== undefined) {
            db.get("SELECT class_id FROM classes WHERE user_id = ? AND class_id = ?", [user_id, class_id], (err, newClassRow) => {
                if (err) {
                    return res.status(500).json({ error: err.message })
                }
                if (!newClassRow) {
                    return res.status(404).json({ error: "Invalid new class ID" })
                }

                updates.push("class_id = ?");
                params.push(class_id);
                finishUpdate();
            })
        } else {
            finishUpdate();
        }
    })
})

// Delete assignment
app.delete("/api/assignments/:id", authenticate, (req, res) => {
    const user_id = req.user.user_id;
    const assignment_id = parseInt(req.params.id, 10);
    if (Number.isNaN(assignment_id)) {
        return res.status(400).json({ error: "Invalid assignment ID" });
    }

    // verify assignment belongs to user
    db.run(`DELETE FROM assignments
            WHERE assignment_id = ?
            AND class_id IN (
                SELECT class_id
                FROM classes
                WHERE user_id = ?
            )
    `, [assignment_id, user_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true })
    })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Starter app running: http://localhost:${PORT}`);
});

let transporter;

async function createTransporter() {
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    })

    console.log("Ethereal account created:");
    console.log("User:", testAccount.user);
    console.log("Pass:", testAccount.pass);
}

cron.schedule("* * * * *", () => {
    const now = new Date().toISOString()

    const sql = `
        SELECT
            r.reminder_id,
            r.reminder_time,
            a.name as assignment_name,
            a.deadline,
            s.email,
            s.username
        FROM reminders r
        JOIN assignments a ON r.assignment_id = a.assignment_id
        JOIN classes c on a.class_id = c.class_id
        JOIN students s on c.user_id = s.user_id
        WHERE r.is_sent = 0 AND r.reminder_time <= ? AND s.notifications_enabled = 1 AND a.has_notification = 1
    `;

    db.all(sql, [now], async (err, rows) => {
        if (err) {
            console.error("Error:", err.message);
            return;
        }

        for (const row of rows) {
            try {
                const formattedDeadline = new Date(row.deadline).toLocaleString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                });

                const info = await transporter.sendMail({
                    from: '"School Task Tracker" <no-reply@test.com>',
                    to: row.email,
                    subject: "Assignment Reminder",
                    text: `Reminder: Your assignment "${row.assignment_name}" is due on ${formattedDeadline}.`
                });

                console.log("Test Email URL:", nodemailer.getTestMessageUrl(info));

                db.run("UPDATE reminders SET is_sent = 1 WHERE reminder_id = ?",
                    [row.reminder_id],
                    (err) => {
                        if (err) {
                            console.error("Error:", err.message);
                            return;
                        }
                    }
                )
            } catch (err) {
                console.error("Error:", err.message);
                return;
            }
        }
    })
})
