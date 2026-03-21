import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Brain, Library, User, LogOut, Plus, Menu, Search, ClipboardCheck, BookOpen } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import NotificationBell from "@/components/NotificationBell";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isMac = useMemo(() => typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent), []);

  const go = (path: string) => { navigate(path); setOpen(false); };
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const navButtonClass = (path: string) =>
    `gap-2 rounded-xl transition-all duration-300 ${
      isActive(path)
        ? "bg-primary/10 text-primary hover:bg-primary/15"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav border-b border-border/10" aria-label="Navigation principale">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Brain className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <span className="font-display text-xl font-bold gradient-text">COGNITIO</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1.5">
          {user && (
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="flex items-center gap-2 px-3 h-9 rounded-xl border border-border/20 bg-muted/20 text-muted-foreground text-sm hover:bg-muted/40 hover:text-foreground transition-all duration-300 mr-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-xs">{t("command.search_placeholder", "Rechercher...")}</span>
              <kbd className="pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/30 bg-muted/30 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>
          )}
          <LanguageSelector />
          <AccessibilityPanel />
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/create")} className={navButtonClass("/create")}>
                <Plus className="w-4 h-4" /> {t("nav.import", "Importer")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className={navButtonClass("/library")}>
                <Library className="w-4 h-4" /> {t("nav.missions", "Missions")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/quiz")} className={navButtonClass("/quiz")}>
                <ClipboardCheck className="w-4 h-4" /> {t("nav.review", "Révision")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className={navButtonClass("/profile")}
                aria-label={t("nav.profile", "Profil")}>
                <User className="w-4 h-4" /> {t("nav.profile", "Profil")}
              </Button>
              <NotificationBell />
              <div className="w-px h-5 bg-border/30 mx-1" />
              <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}
                className="text-muted-foreground hover:text-foreground rounded-xl"
                aria-label={t("nav.logout")}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/#formats")}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-xl transition-all duration-300">{t("footer.features")}</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}
                className={navButtonClass("/pricing")}>{t("nav.pricing")}</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}
                className={navButtonClass("/login")}>{t("nav.login")}</Button>
              <Button size="sm" className="gradient-bg-premium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                onClick={() => navigate("/signup")}>{t("nav.signup")}</Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-1.5">
          {user && (
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              aria-label="Rechercher"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          {user && <NotificationBell />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Ouvrir le menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(20rem,85vw)] pt-12 bg-card/95 backdrop-blur-2xl border-border/20">
              <div className="flex flex-col gap-1">
                {user ? (
                  <>
                    <Button variant="ghost" className="justify-start gap-3 rounded-xl h-12" onClick={() => go("/create")}>
                      <Plus className="w-4 h-4" /> {t("nav.import_course", "Importer un cours")}
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 rounded-xl h-12" onClick={() => go("/library")}>
                      <Library className="w-4 h-4" /> {t("nav.my_missions", "Mes missions")}
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 rounded-xl h-12" onClick={() => go("/quiz")}>
                      <ClipboardCheck className="w-4 h-4" /> {t("nav.review", "Révision")}
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 rounded-xl h-12" onClick={() => go("/profile")}>
                      <User className="w-4 h-4" /> {t("nav.memory_profile", "Profil mémoire")}
                    </Button>
                    <div className="h-px bg-border/20 my-2" />
                    <Button variant="ghost" className="justify-start gap-3 rounded-xl h-12 text-muted-foreground" onClick={() => go("/pricing")}>
                      {t("nav.pricing")}
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 rounded-xl h-12 text-muted-foreground" onClick={() => go("/about")}>
                      {t("footer.about")}
                    </Button>
                    <div className="h-px bg-border/20 my-2" />
                    <Button variant="ghost" className="justify-start gap-3 rounded-xl h-12 text-destructive" onClick={() => { signOut(); go("/"); }}>
                      <LogOut className="w-4 h-4" /> {t("nav.logout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start rounded-xl h-12" onClick={() => go("/#formats")}>{t("footer.features")}</Button>
                    <Button variant="ghost" className="justify-start rounded-xl h-12" onClick={() => go("/pricing")}>{t("nav.pricing")}</Button>
                    <Button variant="ghost" className="justify-start rounded-xl h-12 text-muted-foreground" onClick={() => go("/about")}>{t("footer.about")}</Button>
                    <Button variant="ghost" className="justify-start rounded-xl h-12 text-muted-foreground" onClick={() => go("/contact")}>{t("footer.contact")}</Button>
                    <div className="h-px bg-border/20 my-2" />
                    <Button variant="ghost" className="justify-start rounded-xl h-12" onClick={() => go("/login")}>{t("nav.login")}</Button>
                    <Button className="gradient-bg-premium mt-3 rounded-xl h-12 shadow-lg shadow-primary/20" onClick={() => go("/signup")}>{t("nav.signup")}</Button>
                  </>
                )}
                <div className="h-px bg-border/20 my-2" />
                <div className="flex items-center gap-2 px-2">
                  <LanguageSelector />
                  <AccessibilityPanel />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
