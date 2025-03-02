import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeContext } from "./context/ThemeContext";
import SidebarLayout from "./layouts/SidebarLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Adventure from "./pages/Adventure";
import Grocery from "./pages/Grocery";
import Login from "./components/Login";
import PropTypes from 'prop-types';
import { AuthProvider } from './context/AuthContext';

export default function App({ mode, cycleMode, isDark }) {
  return (
    <ThemeContext.Provider value={{ mode, cycleMode, isDark }}>
      <AuthProvider>
        <Router>
          <SidebarLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/adventure" element={<Adventure />} />
              <Route path="/grocery" element={<Grocery />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </SidebarLayout>
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
