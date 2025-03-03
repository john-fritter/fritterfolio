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

export default function App({ mode, cycleMode, isDark }) {
  return (
    <ThemeContext.Provider value={{ mode, cycleMode, isDark }}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<SidebarLayout><Home /></SidebarLayout>} />
            <Route path="/about" element={<SidebarLayout><About /></SidebarLayout>} />
            <Route path="/adventure" element={<SidebarLayout><Adventure /></SidebarLayout>} />
            <Route path="/grocery" element={<SidebarLayout><Grocery /></SidebarLayout>} />
            <Route path="/login" element={<SidebarLayout><Login /></SidebarLayout>} />
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
