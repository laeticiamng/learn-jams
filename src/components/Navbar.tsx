import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Music, Library, User, LogOut, Plus, CreditCard } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Music className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold gradient-text">StudyBeats</span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/create")} className="gap-2">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t("nav.create")}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-2">
                <Library className="w-4 h-4" /> <span className="hidden sm:inline">{t("nav.library")}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="gap-2">
                <User className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>{t("nav.login")}</Button>
              <Button size="sm" className="gradient-bg" onClick={() => navigate("/signup")}>{t("nav.signup")}</Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
