import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import { apiGet, apiDelete, apiPatch } from "./api";

function Home() {
  const [assignments, setAssignments] = useState([]);
  const [view, setView] = useState("calendar");
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await apiGet("/api/assignments");
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      setAssignments([]);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleDone = async (a) => {
    await apiPatch(`/api/assignments/${a.assignment_id}`, {
      is_done: !a.is_done
    });
    load();
  };

  const toggleNotification = async (a) => {
    try {
      await apiPatch(`/api/assignments/${a.assignment_id}`, {
        has_notification: !a.has_notification
      });
      load();
    } catch (e) {
      console.log(e);
      if (e?.message && e.message !== "{}") {
        alert(e.message);
      }
    }
  };

  const getClassColor = (classId) => {
    const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
    return colors[classId % colors.length];
  };

  return (
    <div className="page">
      <div className="top-bar">
        <button onClick={() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}>
          Logout
        </button>

        <button onClick={() => setView(view === "calendar" ? "list" : "calendar")}>
          {view === "calendar" ? "List View" : "Calendar View"}
        </button>

        <button onClick={() => navigate("/add")}>Add Assignment</button>
        <button onClick={() => navigate("/classes")}>Classes</button>
      </div>

      <h1>Homepage</h1>

      {view === "calendar" ? (
        <Calendar
          tileContent={({ date }) => {
            const dateStr = date.toISOString().split("T")[0];
            const day = assignments.filter(a =>
              a.deadline && a.deadline.startsWith(dateStr)
            );

            return (
              <div
                className="tile-content"
                style={{
                  maxHeight: "60px",
                  overflowY: "scroll",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px"
                }}
              >
                {day.map(a => (
                  <div
                    key={a.assignment_id}
                    className="tile-item"
                    style={{
                      background: getClassColor(a.class_id),
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "2px 4px",
                      fontSize: "10px",
                      textDecoration: a.is_done ? "line-through" : "none",
                    }}
                  >
                    <span onClick={() => navigate(`/edit/${a.assignment_id}`)}>
                      {a.name}
                    </span>

                    <span
                      onClick={(e) => {
                        e.stopPropagation(); 
                        toggleNotification(a);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {a.has_notification ? "🔔" : "🔕"}
                    </span>
                  </div>
                ))}
              </div>
            );
          }}
        />
      ) : (

        <div className="card">
          {assignments.map(a => (
            <div key={a.assignment_id} className="list-item">

              <div>
                <strong style={{
                  textDecoration: a.is_done ? "line-through" : "none"
                }}>
                  {a.name} {a.has_notification ? "🔔" : "🔕"}
                </strong>

                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  {a.deadline}
                </div>

                {a.description && (
                  <div style={{ marginTop: "5px", fontSize: "13px" }}>
                    {a.description}
                  </div>
                )}
              </div>

              <div className="row-actions">
                <button onClick={() => toggleNotification(a)}>
                  {a.has_notification ? "Turn Reminders Off" : "Turn Reminders On"}
                </button>

                <button onClick={() => navigate(`/edit/${a.assignment_id}`)}>
                  Edit
                </button>

                <button onClick={() => toggleDone(a)}>
                  {a.is_done ? "Undo done" : "Mark as done"}
                </button>

                <button onClick={async () => {
                  await apiDelete(`/api/assignments/${a.assignment_id}`);
                  load();
                }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;