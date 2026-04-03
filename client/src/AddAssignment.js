import BackHome from "./BackHome";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "./api";

function AddAssignment() {
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [classId, setClassId] = useState("");
  const [description, setDescription] = useState("");
  const [classes, setClasses] = useState([]);
  const [hasNotification, setHasNotification] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    apiGet("/api/classes").then(setClasses).catch(()=>setClasses([]));
  }, []);

  const submit = async () => {
    if (!classId) {
      alert("Select a class");
      return;
    }

    try {
      await apiPost("/api/assignments", {
        name,
        deadline,
        description,
        class_id: Number(classId),
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
      <h1>Add Assignment</h1>

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        maxWidth: "500px"
      }}>
        <input
          placeholder="Assignment Name"
          onChange={(e)=>setName(e.target.value)}
        />

        <input
          type="datetime-local"
          onChange={(e)=>setDeadline(e.target.value)}
        />

        <input
          placeholder="Description"
          onChange={(e)=>setDescription(e.target.value)}
        />

        <select onChange={(e)=>setClassId(e.target.value)}>
          <option value="">Select Class</option>
          {classes.map(c => (
            <option key={c.class_id} value={c.class_id}>
              {c.name} (ID: {c.class_id})
            </option>
          ))}
        </select>

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
          onClick={submit}
          style={{ width: "180px", marginTop: "10px" }}
        >
          Add Assignment
        </button>
      </div>
    </div>
  );
}

export default AddAssignment;