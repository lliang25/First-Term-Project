import BackHome from "./BackHome";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPatch } from "./api";

function EditAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);

  useEffect(() => {
    apiGet("/api/assignments").then(data => {
      const a = data.find(x => x.assignment_id == id);
      if (a) {
        setName(a.name);
        setDeadline(a.deadline ? a.deadline.slice(0,16) : "");;
        setDescription(a.description || "");
        setIsDone(!!a.is_done);
        setHasNotification(!!a.has_notification);
      }
    });
  }, [id]);

  const save = async () => {
    try {
      await apiPatch(`/api/assignments/${id}`, {
        name,
        deadline,
        description,
        is_done: isDone,
        has_notification: hasNotification
      });

      navigate("/");
    } catch (e) {
      console.log("ERROR:", e);

      if (e?.message && e.message !== "{}") {
        alert(e.message);
      }
    }
  };

  return (
    <div className="page">
      <BackHome />
      <h1>Edit Assignment</h1>

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        maxWidth: "500px"
      }}>
        <input value={name} onChange={(e)=>setName(e.target.value)} />

        <input
          type="datetime-local"
          value={deadline}
          onChange={(e)=>setDeadline(e.target.value)}
        />

        <input
          value={description}
          onChange={(e)=>setDescription(e.target.value)}
        />

        <label style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "16px",
          marginTop: "10px"
        }}>
          <input
            type="checkbox"
            checked={isDone}
            onChange={(e)=>setIsDone(e.target.checked)}
            style={{ width: "18px", height: "18px" }}
          />
          Mark as Done
        </label>

       
        <div className="setting-row">
        <span className="setting-label">
            🔔 Reminder Email (1 day before)
        </span>

        <input
            type="checkbox"
            className="setting-toggle"
            checked={hasNotification}
            onChange={(e)=>setHasNotification(e.target.checked)}
        />
        </div>

        <button
          onClick={save}
          style={{
            width: "180px",
            marginTop: "20px"
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default EditAssignment;