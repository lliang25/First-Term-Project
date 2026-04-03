import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home";
import Classes from "./Classes";
import AddAssignment from "./AddAssignment";
import EditAssignment from "./EditAssignment";
import Login from "./Login";
import { getToken } from "./api";
import "./App.css";


function Private({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Private><Home /></Private>} />
        <Route path="/classes" element={<Private><Classes /></Private>} />
        <Route path="/add" element={<Private><AddAssignment /></Private>} />
        <Route path="/edit/:id" element={<Private><EditAssignment /></Private>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;