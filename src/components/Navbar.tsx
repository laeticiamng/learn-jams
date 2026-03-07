import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Music, Library, User, LogOut, Plus, Menu, X } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useState } from "react";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const go = (path: string) => { navigate(path); setOpen(false); };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Music className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold gradient-text">StudyBeats</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSelector />
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/create")} className="gap-2">
                <Plus className="w-4 h-4" /> {t("nav.create")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="gap-2">
                <Library className="w-4 h-4" /> {t("nav.library")}
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
              <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>{t("nav.pricing")}</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>{t("nav.login")}</Button>
              <Button size="sm" className="gradient-bg" onClick={() => navigate("/signup")}>{t("nav.signup")}</Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSelector />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 pt-12">
              <div className="flex flex-col gap-2">
                {user ? (
                  <>
                    <Button variant="ghost" className="justify-start gap-3" onClick={() => go("/create")}>
                      <Plus className="w-4 h-4" /> {t("nav.create")}
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" onClick={() => go("/library")}>
                      <Library className="w-4 h-4" /> {t("nav.library")}
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" onClick={() => go("/profile")}>
                      <User className="w-4 h-4" /> {t("profile.title")}
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 text-destructive" onClick={() => { signOut(); go("/"); }}>
                      <LogOut className="w-4 h-4" /> {t("nav.login")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" onClick={() => go("/pricing")}>{t("nav.pricing")}</Button>
                    <Button variant="ghost" className="justify-start" onClick={() => go("/login")}>{t("nav.login")}</Button>
                    <Button className="gradient-bg mt-2" onClick={() => go("/signup")}>{t("nav.signup")}</Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
