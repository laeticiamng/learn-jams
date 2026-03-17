import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Star, Crown, Music, Heart, TrendingUp, Globe, GraduationCap, Flame, Play } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  display_name: string | null;
  university: string | null;
  country: string | null;
}

interface FeaturedSong {
  id: string;
  title: string;
  style: string;
  cover_image_url: string | null;
  user_id: string;
  avg_rating: number;
}

function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil(diff / oneWeek);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

const rankIcons = [Crown, Medal, Medal];
const rankColors = ["text-amber-400", "text-zinc-300", "text-amber-600"];

export default function League() {
  const { t } = useTranslation();
  usePageSEO({ title: t("league.title", "European League") + " — StudyBeats", description: t("league.subtitle", "Compete with students across Europe"), noindex: true });
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [featured, setFeatured] = useState<FeaturedSong[]>([]);
  const [myPoints, setMyPoints] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [tab, setTab] = useState("global");

  const currentWeek = useMemo(() => getCurrentWeek(), []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(false);

      try {
        // Get this week's points aggregated by user
        const { data: pointsData, error: pointsErr } = await supabase
          .from("league_points")
          .select("user_id, points")
          .eq("week", currentWeek);

        if (pointsErr) throw pointsErr;

        // Aggregate points per user
        const pointsMap = new Map<string, number>();
        (pointsData || []).forEach((p) => {
          pointsMap.set(p.user_id, (pointsMap.get(p.user_id) || 0) + p.points);
        });

        // Get profiles for all users with points
        const userIds = Array.from(pointsMap.keys());
        const profilesMap = new Map<string, { display_name: string | null; university: string | null; country: string | null }>();
        if (userIds.length > 0) {
          const { data: profiles, error: profilesErr } = await supabase
            .from("profiles")
            .select("user_id, display_name, university, country")
            .in("user_id", userIds);
          if (profilesErr) throw profilesErr;
          (profiles || []).forEach((p) => {
            profilesMap.set(p.user_id, { display_name: p.display_name, university: (p as Record<string, unknown>).university as string | null, country: (p as Record<string, unknown>).country as string | null });
          });
        }

        // Build leaderboard
        const board: LeaderboardEntry[] = userIds
          .map(uid => ({
            user_id: uid,
            total_points: pointsMap.get(uid) || 0,
            ...(profilesMap.get(uid) || { display_name: null, university: null, country: null }),
          }))
          .sort((a, b) => b.total_points - a.total_points)
          .slice(0, 50);

        setLeaderboard(board);

        // My stats
        if (user) {
          const myPts = pointsMap.get(user.id) || 0;
          setMyPoints(myPts);
          const rank = board.findIndex(e => e.user_id === user.id);
          setMyRank(rank >= 0 ? rank + 1 : null);
        }

        // Featured songs (public songs with highest ratings)
        const { data: publicSongs, error: songsErr } = await supabase
          .from("songs")
          .select("id, title, style, cover_image_url, user_id")
          .eq("is_public", true)
          .eq("status", "ready")
          .limit(6);
        if (songsErr) throw songsErr;

        setFeatured((publicSongs as FeaturedSong[]) || []);
      } catch (err: unknown) {
        console.error("[League] Failed to fetch data:", err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, currentWeek]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent_70%)]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,hsl(45,100%,50%,0.03),transparent_60%)]" />
      <Navbar />

      <div className="container mx-auto pt-28 pb-16 px-4 max-w-5xl relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-amber-500/20">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
            {t("league.title", "European League")}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            {t("league.subtitle", "Earn points by creating and rating StudyBeats. Compete weekly with students across Europe.")}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2 font-mono">{t("league.week", "Week")} {currentWeek}</p>
        </motion.div>

        {/* My stats card */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease }} className="glass-card-elevated p-5 sm:p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 w-full sm:w-auto sm:contents">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl gradient-bg-premium flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t("league.your_stats", "Your stats this week")}</p>
                <div className="flex items-baseline gap-3 sm:gap-4 mt-1 flex-wrap">
                  <span className="font-display text-2xl sm:text-3xl font-bold gradient-text">{myPoints}</span>
                  <span className="text-sm text-muted-foreground">{t("league.points", "points")}</span>
                  {myRank && (
                    <span className="text-sm text-primary font-medium">#{myRank} {t("league.rank", "rank")}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0 w-full sm:w-auto sm:text-right sm:ml-auto border-t sm:border-t-0 border-border/15 pt-3 sm:pt-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider sm:mb-1">{t("league.earn_points", "Earn points")}</p>
              <div className="flex sm:flex-col gap-3 sm:gap-0.5 text-xs text-muted-foreground">
                <p>🎵 +10 {t("league.per_song", "per song")}</p>
                <p>⭐ +2 {t("league.per_rating", "per rating")}</p>
              </div>
            </div>
          </motion.div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="glass-card mx-auto flex w-fit overflow-x-auto scrollbar-none max-w-full">
            <TabsTrigger value="global" className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm whitespace-nowrap"><Globe className="w-3.5 h-3.5" /> {t("league.tab_global", "Global")}</TabsTrigger>
            <TabsTrigger value="university" className="gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm whitespace-nowrap"><GraduationCap className="w-3.5 h-3.5" /> {t("league.tab_university", "University")} <span className="text-[9px] ml-1 px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground hidden sm:inline">soon</span></TabsTrigger>
            <TabsTrigger value="hall" className="gap-2 rounded-xl"><Star className="w-3.5 h-3.5" /> {t("league.tab_hall", "Hall of Fame")}</TabsTrigger>
          </TabsList>

          {/* Global leaderboard */}
          <TabsContent value="global" className="space-y-3">
            {fetchError ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <Trophy className="w-16 h-16 text-destructive/20 mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">{t("common.error", "Erreur")}</h3>
                <p className="text-muted-foreground mb-6">{t("league.fetch_error", "Impossible de charger le classement. Réessaie plus tard.")}</p>
              </motion.div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="glass-card p-4 animate-pulse flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted/20" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-1/3 bg-muted/20 rounded" /><div className="h-3 w-1/4 bg-muted/15 rounded" /></div>
                    <div className="h-6 w-16 bg-muted/15 rounded" />
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <Trophy className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">{t("league.empty", "No rankings yet")}</h3>
                <p className="text-muted-foreground mb-6">{t("league.empty_text", "Create a song and be the first on the leaderboard!")}</p>
                <Button className="gradient-bg-premium gap-2 rounded-xl" onClick={() => navigate("/create")}>
                  <Music className="w-4 h-4" /> {t("league.create_song", "Create a song")}
                </Button>
              </motion.div>
            ) : (
              leaderboard.map((entry, i) => {
                const RankIcon = rankIcons[i] || TrendingUp;
                const isMe = entry.user_id === user?.id;
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`glass-card p-4 flex items-center gap-4 ${isMe ? "border-primary/30 glow-soft" : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${i < 3 ? "bg-gradient-to-br from-amber-400/20 to-amber-600/20" : "bg-muted/20"}`}>
                      {i < 3 ? (
                        <RankIcon className={`w-5 h-5 ${rankColors[i]}`} />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : ""}`}>
                        {entry.display_name || t("league.anonymous", "Anonymous")}
                        {isMe && <span className="text-xs text-primary/60 ml-2">({t("studio.you", "You")})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[entry.university, entry.country].filter(Boolean).join(" · ") || t("league.no_info", "No university info")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-display text-lg font-bold gradient-text">{entry.total_points}</span>
                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* University tab */}
          <TabsContent value="university">
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">{t("league.uni_coming", "University rankings")}</h3>
              <p className="text-muted-foreground">{t("league.uni_text", "Add your university in your profile to unlock university rankings")}</p>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/profile")}>
                {t("league.update_profile", "Update my profile")}
              </Button>
            </div>
          </TabsContent>

          {/* Hall of Fame */}
          <TabsContent value="hall">
            {featured.length === 0 ? (
              <div className="text-center py-16">
                <Star className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">{t("league.hall_empty", "Hall of Fame")}</h3>
                <p className="text-muted-foreground">{t("league.hall_text", "Top-rated public songs will appear here")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.map((song, i) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card-elevated overflow-hidden group cursor-pointer card-hover"
                    onClick={() => navigate(`/player/${song.id}`)}
                  >
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center relative">
                      {song.cover_image_url ? (
                        <img src={song.cover_image_url} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-12 h-12 text-muted-foreground/30" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <div className="w-10 h-10 rounded-full gradient-bg-premium flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                      {i < 3 && (
                        <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                          <Trophy className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold truncate">{song.title}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{song.style}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
