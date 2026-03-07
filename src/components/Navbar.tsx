import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Music, Library, User, LogOut, Plus } from "lucide-react";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Music className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold gradient-text">StudyBeats</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/create")} className="gap-2">
              <Plus className="w-4 h-4" /> Créer
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-2">
              <Library className="w-4 h-4" /> Bibliothèque
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="gap-2">
              <User className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Connexion</Button>
            <Button size="sm" className="gradient-bg" onClick={() => navigate("/signup")}>S'inscrire</Button>
          </div>
        )}
      </div>
    </nav>
  );
}
