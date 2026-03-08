import { Bell, Music, Check, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleClick = (notif: { id: string; song_id: string | null; is_read: boolean }) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.song_id) navigate(`/player/${notif.song_id}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <Bell className="w-4 h-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 bg-card/95 backdrop-blur-2xl border-border/20 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
          <h3 className="text-sm font-semibold text-foreground">{t("notifications.title", "Notifications")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              {t("notifications.mark_all_read", "Tout marquer lu")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">{t("notifications.empty", "Aucune notification")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-muted/30 transition-colors ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      !notif.is_read
                        ? "gradient-bg-premium shadow-sm shadow-primary/20"
                        : "bg-muted/40"
                    }`}
                  >
                    <Music
                      className={`w-4 h-4 ${
                        !notif.is_read
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        !notif.is_read
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="mt-2 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
