import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SidebarLayout from "./layouts/SidebarLayout";
import About from "./pages/About";
import Adventure from "./pages/Adventure";

export default function App() {
  return (
    <Router>
      <SidebarLayout>
        <Routes>
          <Route path="/" element={<About />} />
          <Route path="/about" element={<About />} />
          <Route path="/adventure" element={<Adventure />} />
        </Routes>
      </SidebarLayout>
    </Router>
  );
}
