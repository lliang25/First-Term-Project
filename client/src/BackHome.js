import { useNavigate } from "react-router-dom";

function BackHome() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/home")}
      style={{
        marginBottom: "20px",
        background: "#64748b"
      }}
    >
      ← Home
    </button>
  );
}

export default BackHome;