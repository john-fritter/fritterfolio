import Sidebar from "../components/Sidebar";

export default function SidebarLayout({ children }) {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100">
      <aside className="w-60 bg-white border-r flex-shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-grow overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
