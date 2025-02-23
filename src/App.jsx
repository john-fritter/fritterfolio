import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeContext } from "./context/ThemeContext";
import SidebarLayout from "./layouts/SidebarLayout";
import About from "./pages/About";
import Adventure from "./pages/Adventure";

export default function App({ darkMode, toggleDarkMode }) {
  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <Router>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<About />} />
            <Route path="/about" element={<About />} />
            <Route path="/adventure" element={<Adventure />} />
          </Routes>
        </SidebarLayout>
      </Router>
    </ThemeContext.Provider>
  );
}
