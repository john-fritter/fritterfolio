import Sidebar from "../components/Sidebar";

export default function SidebarLayout({ children }) {
  return (
    <div className="min-h-screen w-screen flex overflow-hidden app-bg transition-colors duration-200">
      <aside className="w-64 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-r border-primary/10 dark:border-dark-primary/10 flex-shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-grow overflow-auto p-8 md:p-12">
        {children}
      </main>
    </div>
  );
}
