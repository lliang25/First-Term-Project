import BackHome from "./BackHome";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

function Classes() {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    try {
      const data = await apiGet("/api/classes");
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
  console.log("ERROR:", e);

  if (e?.message && e.message !== "{}") {
    alert(e.message);
  }
}
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;

    await apiPost("/api/classes", {
      name,
      location,
      meeting_time: meetingTime,
      notes
    });

    setName("");
    setLocation("");
    setMeetingTime("");
    setNotes("");

    load();
  };

  const deleteClass = async (classId) => {
    const confirmDelete = window.confirm(
      "Delete this class and all its assignments?"
    );
    if (!confirmDelete) return;

    await apiDelete(`/api/classes/${classId}`);
    load();
  };

  return (
    <div className="page">
        <BackHome />
      <h1>Classes</h1>
      <div className="top-bar">
        <input
          placeholder="Class Name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />

        <input
          placeholder="Location"
          value={location}
          onChange={(e)=>setLocation(e.target.value)}
        />

        <input
          placeholder="Meeting Time"
          value={meetingTime}
          onChange={(e)=>setMeetingTime(e.target.value)}
        />

        <input
          placeholder="Description"
          value={notes}
          onChange={(e)=>setNotes(e.target.value)}
        />

        <button onClick={add}>Add</button>
      </div>

      <div className="card">
        {classes.map(c => (
          <div key={c.class_id} className="list-item">


            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <strong style={{ fontSize: "16px" }}>{c.name}</strong>

              {c.location && (
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  📍 {c.location}
                </div>
              )}

              {c.meeting_time && (
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  ⏰ {c.meeting_time}
                </div>
              )}

              {c.notes && (
                <div style={{ fontSize: "13px", marginTop: "4px" }}>
                  {c.notes}
                </div>
              )}
            </div>

        
            <div style={{ marginTop: "10px" }}>
              

              <button
                onClick={() => deleteClass(c.class_id)}
                style={{ background: "#ef4444", marginLeft: "10px" }}
              >
                Delete
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

export default Classes;