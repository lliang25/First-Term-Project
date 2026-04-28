import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();

  const submit = async () => {
    setErr("");

    const url = isSignup
      ? "http://localhost:3000/api/students"
      : "http://localhost:3000/api/login";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          isSignup
            ? {
                username: email.split("@")[0], 
                email,
                password,
                notifications_enabled: 1
              }
            : {
                email,
                password
              }
        )
      });

      const data = await res.json();

      if (!res.ok) throw data;

      
      localStorage.setItem("token", data.token);

      navigate("/home");
    } catch (e) {
      setErr(e?.error || "Something went wrong");
    }
  };

  return (
  <div className="center-card">
    <div className="auth-card">
      <h1 style={{ textAlign: "center"}}>
        School Task Tracker
      </h1>

      <h2 style={{ textAlign: "center"}}>
        {isSignup ? "Create Account" : "Login"}
      </h2>

      <input style={({ width: "80%", border: "1px solid rgb(164, 175, 198)" })}
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input style={({ width: "80%", border: "1px solid rgb(164, 175, 198)" })}
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={submit} style={{ width: "70%", marginTop: "10px"}}>
        {isSignup ? "Sign Up" : "Login"}
      </button>

      <p
        style={{ cursor: "pointer", textAlign: "center" }}
        onClick={() => setIsSignup(!isSignup)}
      >
        {isSignup
          ? "Already have an account? Login"
          : "Create an account"}
      </p>

      {err && <div style={{ color: "red", marginTop: "10px" }}>{err}</div>}
    </div>
  </div>
);
}

export default Login;