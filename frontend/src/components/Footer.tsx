import { format } from "date-fns";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full border-t border-border bg-card/95 backdrop-blur-sm py-4 px-6 mt-auto">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>v1.0.0</span>
            <span>|</span>
            <span>© {currentYear} CodeArena</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
