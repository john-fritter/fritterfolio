export default function Home() {  
  return (
    <div className="space-y-8">
      <h1 className="text-primary-dm text-4xl font-bold">
        Welcome
      </h1>

      <section className="space-y-4">
        <h2 className="text-accent-dm text-3xl font-semibold">
          Color Palette
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg">
            <span className="text-primary-dm font-medium">Primary</span>
          </div>
          <div className="p-4 bg-secondary/10 rounded-lg">
            <span className="text-secondary-dm font-medium">Secondary</span>
          </div>
          <div className="p-4 bg-accent/10 rounded-lg">
            <span className="text-accent-dm font-medium">Accent</span>
          </div>
          <div className="p-4 bg-highlight/10 rounded-lg">
            <span className="text-highlight font-medium">Highlight</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-secondary-dm text-3xl font-semibold">
          Typography
        </h2>
        <div className="space-y-6">
          <p className="text-primary-dm text-2xl">
            Large text in primary color
          </p>
          <p className="text-secondary-dm text-lg leading-relaxed">
            Body text in secondary color with relaxed line height. 
            This demonstrates the main text style used throughout the site.
          </p>
          <p className="text-accent-dm italic">
            Accent text with emphasis
          </p>
          <div className="text-secondary-dm hover:text-highlight-dm transition-colors">
            Interactive text with hover effect
          </div>
        </div>
      </section>
    </div>
  );
} 