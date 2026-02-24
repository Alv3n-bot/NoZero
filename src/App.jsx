import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
   
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
   
  );
}

export default App;