import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeContext } from "./context/ThemeContext";
import SidebarLayout from "./layouts/SidebarLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Adventure from "./pages/Adventure";
import Grocery from "./pages/Grocery";
import Login from "./components/Login";
import PropTypes from 'prop-types';
import { AuthProvider } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import NetworkTest from "./pages/NetworkTest";
import AuthDebug from "./pages/AuthDebug";

export default function App({ mode, cycleMode, isDark }) {
  return (
    <ThemeContext.Provider value={{ mode, cycleMode, isDark }}>
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
            <Route path="/network-test" element={<NetworkTest />} />
            <Route path="/auth-debug" element={<AuthDebug />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}

App.propTypes = {
  mode: PropTypes.string.isRequired,
  cycleMode: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
};
