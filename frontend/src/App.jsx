import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SidebarLayout from "./layouts/SidebarLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Adventure from "./pages/Adventure";
import GroceryLanding from "./pages/GroceryLanding";
import Login from "./components/Login";
import { AuthProvider } from './context/AuthProvider';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SidebarLayout><Home /></SidebarLayout>} />
          <Route path="/about" element={<SidebarLayout><About /></SidebarLayout>} />
          <Route path="/adventure" element={<SidebarLayout><Adventure /></SidebarLayout>} />
          <Route 
            path="/grocery" 
            element={<SidebarLayout><GroceryLanding /></SidebarLayout>} 
          />
          <Route path="/login" element={<SidebarLayout><Login /></SidebarLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
