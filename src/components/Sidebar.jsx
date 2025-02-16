import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <nav className="h-full flex flex-col items-start p-4 space-y-4">
      <div className="font-bold text-xl mb-4">John Fritter</div>

      <NavLink to="/about" className="text-gray-700 hover:text-blue-600">
        About Me
      </NavLink>
      <NavLink to="/adventure" className="text-gray-700 hover:text-blue-600">
        Adventure
      </NavLink>
    </nav>
  );
}
