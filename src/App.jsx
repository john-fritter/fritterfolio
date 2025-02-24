import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeContext } from "./context/ThemeContext";
import SidebarLayout from "./layouts/SidebarLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Adventure from "./pages/Adventure";
import PropTypes from 'prop-types';

export default function App({ mode, cycleMode }) {
  return (
    <ThemeContext.Provider value={{ mode, cycleMode }}>
      <Router>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/adventure" element={<Adventure />} />
          </Routes>
        </SidebarLayout>
      </Router>
    </ThemeContext.Provider>
  );
}

App.propTypes = {
  mode: PropTypes.string.isRequired,
  cycleMode: PropTypes.func.isRequired,
};
