import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Library, ClipboardCheck, User } from "lucide-react";

const tabs = [
  { path: "/create", icon: Plus, labelKey: "nav.import" },
  { path: "/library", icon: Library, labelKey: "nav.missions" },
  { path: "/quiz", icon: ClipboardCheck, labelKey: "nav.review" },
  { path: "/profile", icon: User, labelKey: "nav.profile" },
] as const;

export default function MobileBottomNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  if (!user) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-nav border-t border-border/10 safe-area-bottom"
      aria-label="Navigation mobile"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ path, icon: Icon, labelKey }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-200 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={`w-5 h-5 ${active ? "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" : ""}`} />
              <span className="text-[10px] font-medium leading-tight">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
