import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Music,
  Library,
  Plus,
  User,
  CreditCard,
  FileText,
  Shield,
  Mail,
  Info,
  Home,
  Brain,
  Play,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSongs } from "@/hooks/useSongs";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { songs } = useSongs(user?.id);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const pages = useMemo(() => [
    { label: t("nav.create", "Create"), icon: Plus, path: "/create", auth: true },
    { label: t("nav.library", "Library"), icon: Library, path: "/library", auth: true },
    { label: "Profile", icon: User, path: "/profile", auth: true },
    { label: t("nav.pricing", "Pricing"), icon: CreditCard, path: "/pricing", auth: false },
    { label: t("home.how_title", "How it works"), icon: Home, path: "/", auth: false },
    { label: "About", icon: Info, path: "/about", auth: false },
    { label: "Contact", icon: Mail, path: "/contact", auth: false },
    { label: t("footer.terms", "Terms"), icon: FileText, path: "/terms", auth: false },
    { label: t("footer.privacy", "Privacy"), icon: Shield, path: "/privacy", auth: false },
  ], [t]);

  const filteredPages = user ? pages : pages.filter((p) => !p.auth);

  const readySongs = useMemo(
    () => songs.filter((s) => s.status === "ready").slice(0, 8),
    [songs]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("command.search_placeholder", "Search pages, songs, actions…")} />
      <CommandList>
        <CommandEmpty>{t("command.no_results", "No results found.")}</CommandEmpty>

        {/* Pages */}
        <CommandGroup heading={t("command.pages", "Pages")}>
          {filteredPages.map((page) => (
            <CommandItem
              key={page.path}
              onSelect={() => go(page.path)}
              className="gap-3 cursor-pointer"
            >
              <page.icon className="w-4 h-4 text-muted-foreground" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Songs */}
        {readySongs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("command.songs", "Songs")}>
              {readySongs.map((song) => (
                <CommandItem
                  key={song.id}
                  onSelect={() => go(`/player/${song.id}`)}
                  className="gap-3 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{song.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {song.style}{song.subject ? ` · ${song.subject}` : ""}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Quick actions */}
        {user && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("command.actions", "Actions")}>
              <CommandItem onSelect={() => go("/create")} className="gap-3 cursor-pointer">
                <Music className="w-4 h-4 text-muted-foreground" />
                {t("command.new_song", "Create new song")}
              </CommandItem>
              {readySongs.length > 0 && (
                <CommandItem
                  onSelect={() => go(`/quiz/${readySongs[0].id}`)}
                  className="gap-3 cursor-pointer"
                >
                  <Brain className="w-4 h-4 text-muted-foreground" />
                  {t("command.take_quiz", "Take a quiz")}
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
