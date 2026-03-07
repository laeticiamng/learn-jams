import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Music, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" style={{ background: "var(--gradient-glow)" }}>
      <div className="glass-card p-12 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
          <Music className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-5xl font-bold gradient-text mb-4">404</h1>
        <p className="text-xl text-foreground mb-2">Page introuvable</p>
        <p className="text-muted-foreground mb-8">Cette page n'existe pas ou a été déplacée.</p>
        <Button asChild className="gradient-bg gap-2">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> Retour à l'accueil</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
