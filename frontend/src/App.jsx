import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SidebarLayout from "./layouts/SidebarLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Adventure from "./pages/Adventure";
import Grocery from "./pages/Grocery";
import Login from "./components/Login";
import { AuthProvider } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';

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
            element={
              <ProtectedRoute>
                <SidebarLayout><Grocery /></SidebarLayout>
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<SidebarLayout><Login /></SidebarLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
