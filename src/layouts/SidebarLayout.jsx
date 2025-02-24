import Sidebar from "../components/Sidebar";

export default function SidebarLayout({ children }) {
  return (
    <div className="fixed inset-0 flex app-bg transition-colors duration-200">
      <aside className="w-64 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-r border-primary/10 dark:border-dark-primary/10 flex-shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-1 p-8 md:p-12 overflow-auto">
        {children}
      </main>
    </div>
  );
}
