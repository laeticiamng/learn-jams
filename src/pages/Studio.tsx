import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Copy, Check, Music, ArrowLeft, Loader2, Sparkles, UserPlus, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StylePicker from "@/components/create/StylePicker";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

interface Session {
  id: string;
  title: string;
  topic: string;
  style: string;
  status: string;
  invite_code: string;
  max_participants: number;
  creator_id: string;
  created_at: string;
}

interface Participant {
  id: string;
  session_id: string;
  user_id: string;
  subtopic: string | null;
  verse_text: string | null;
  joined_at: string;
}

export default function Studio() {
  const { t } = useTranslation();
  usePageSEO({ title: t("studio.title", "Collaborative Studio") + " — StudyBeats", description: t("studio.subtitle", "Co-create StudyBeats with up to 8 students"), noindex: true });
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newStyle, setNewStyle] = useState("pop");
  const [creating, setCreating] = useState(false);

  // Active session view
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mySubtopic, setMySubtopic] = useState("");
  const [myVerse, setMyVerse] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Get sessions where user is creator or participant
    const { data: participantSessions } = await supabase
      .from("session_participants")
      .select("session_id")
      .eq("user_id", user.id);

    const sessionIds = participantSessions?.map(p => p.session_id) || [];

    const { data } = await supabase
      .from("collaborative_sessions")
      .select("*")
      .or(`creator_id.eq.${user.id}${sessionIds.length ? `,id.in.(${sessionIds.join(",")})` : ""}`)
      .order("created_at", { ascending: false });

    setSessions((data as Session[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Realtime subscription for active session
  useEffect(() => {
    if (!activeSession) return;
    const channel = supabase
      .channel(`session-${activeSession.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${activeSession.id}` },
        () => { loadParticipants(activeSession.id); }
      )
      .subscribe();
    loadParticipants(activeSession.id);
    return () => { supabase.removeChannel(channel); };
  }, [activeSession]);

  const loadParticipants = async (sessionId: string) => {
    const { data } = await supabase.from("session_participants").select("*").eq("session_id", sessionId);
    const parts = (data as Participant[]) || [];
    setParticipants(parts);
    // Initialize my subtopic/verse from existing data
    const mine = parts.find(p => p.user_id === user?.id);
    if (mine) {
      setMySubtopic(mine.subtopic || "");
      setMyVerse(mine.verse_text || "");
    }
  };

  const handleCreate = async () => {
    if (!user || !newTitle.trim() || !newTopic.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.from("collaborative_sessions").insert({
        creator_id: user.id, title: newTitle, topic: newTopic, style: newStyle,
      }).select().single();
      if (error) throw error;
      // Creator joins as participant
      await supabase.from("session_participants").insert({ session_id: data.id, user_id: user.id });
      setShowCreate(false);
      setNewTitle(""); setNewTopic(""); setNewStyle("pop");
      setActiveSession(data as Session);
      toast.success(t("studio.created", "Session created!"));
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;
    try {
      const { data: session, error: findErr } = await supabase
        .from("collaborative_sessions")
        .select("*")
        .eq("invite_code", joinCode.trim())
        .eq("status", "open")
        .single();
      if (findErr || !session) { toast.error(t("studio.not_found", "Session not found or closed")); return; }

      const { error: joinErr } = await supabase.from("session_participants").insert({
        session_id: session.id, user_id: user.id,
      });
      if (joinErr) {
        if (joinErr.message.includes("duplicate")) toast.error(t("studio.already_joined", "You already joined this session"));
        else throw joinErr;
        return;
      }
      setShowJoin(false); setJoinCode("");
      setActiveSession(session as Session);
      toast.success(t("studio.joined", "Joined session!"));
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveVerse = async () => {
    if (!user || !activeSession) return;
    try {
      const { error } = await supabase.from("session_participants")
        .update({ subtopic: mySubtopic || null, verse_text: myVerse || null })
        .eq("session_id", activeSession.id)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success(t("studio.verse_saved", "Verse saved!"));
      loadParticipants(activeSession.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyInvite = () => {
    if (!activeSession) return;
    navigator.clipboard.writeText(activeSession.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Active session view
  if (activeSession) {
    const myParticipant = participants.find(p => p.user_id === user?.id);
    const isCreator = activeSession.creator_id === user?.id;

    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent_70%)]" />
        <Navbar />
        <div className="container mx-auto pt-28 pb-16 px-4 max-w-4xl relative z-10">
          <Button variant="ghost" size="sm" onClick={() => setActiveSession(null)} className="gap-2 mb-6 rounded-xl text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> {t("common.back", "Back")}
          </Button>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{activeSession.title}</h1>
                <p className="text-muted-foreground mt-2 text-sm sm:text-base">{activeSession.topic}</p>
                <div className="flex items-center gap-2 sm:gap-3 mt-3 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">{activeSession.style}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${activeSession.status === "open" ? "bg-green-500/10 text-green-500" : "bg-muted/40 text-muted-foreground"}`}>
                    {activeSession.status === "open" ? t("studio.status_open", "Open") : t("studio.status_closed", "Closed")}
                  </span>
                </div>
              </div>
              <button onClick={copyInvite} className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm font-medium hover:bg-muted/20 transition-all shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                <span className="font-mono text-xs">{activeSession.invite_code}</span>
              </button>
            </div>

            {/* Participants grid */}
            <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {t("studio.participants", "Participants")} ({participants.length}/{activeSession.max_participants})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {participants.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card-elevated p-5 ${p.user_id === user?.id ? "border-primary/30" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full gradient-bg-premium flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{p.user_id === user?.id ? t("studio.you", "You") : `${t("studio.participant", "Participant")} ${i + 1}`}</p>
                      {p.subtopic && <p className="text-xs text-muted-foreground">{p.subtopic}</p>}
                    </div>
                    {p.verse_text && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                  </div>
                  {p.verse_text && (
                    <p className="text-xs text-muted-foreground bg-muted/10 rounded-lg p-3 italic leading-relaxed whitespace-pre-line">
                      {p.verse_text.slice(0, 200)}{p.verse_text.length > 200 ? "..." : ""}
                    </p>
                  )}
                </motion.div>
              ))}
              {participants.length < activeSession.max_participants && (
                <div className="glass-card p-5 flex items-center justify-center border-dashed border-2 border-border/20 min-h-[120px]">
                  <div className="text-center">
                    <UserPlus className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{t("studio.waiting", "Waiting for participants...")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* My contribution */}
            {myParticipant && activeSession.status === "open" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-elevated p-7 space-y-5">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  {t("studio.your_verse", "Your verse")}
                </h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("studio.subtopic_label", "Your subtopic")}</Label>
                  <Input
                    placeholder={t("studio.subtopic_placeholder", "E.g.: Cardiac valves")}
                    value={mySubtopic}
                    onChange={(e) => setMySubtopic(e.target.value)}
                    className="bg-muted/15 border-border/20 h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("studio.verse_label", "Write your verse")}</Label>
                  <Textarea
                    placeholder={t("studio.verse_placeholder", "Write lyrics about your subtopic...")}
                    value={myVerse}
                    onChange={(e) => setMyVerse(e.target.value)}
                    className="bg-muted/15 border-border/20 rounded-xl min-h-[120px] resize-none"
                  />
                </div>
                <Button onClick={handleSaveVerse} className="gradient-bg-premium gap-2 rounded-xl h-11 shadow-lg shadow-primary/20">
                  <Send className="w-4 h-4" /> {t("studio.save_verse", "Save my verse")}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // Sessions list
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent_70%)]" />
      <Navbar />
      <div className="container mx-auto pt-28 pb-16 px-4 max-w-5xl relative z-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl gradient-bg-premium flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-3">{t("studio.title", "Collaborative Studio")}</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("studio.subtitle", "Co-create StudyBeats with up to 8 students on the same topic")}</p>
          </div>

          <div className="flex justify-center gap-3 mb-10">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button className="gradient-bg-premium gap-2 rounded-xl h-12 px-7 shadow-lg shadow-primary/20" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> {t("studio.create_session", "Create session")}
              </Button>
            </motion.div>
            <Button variant="outline" className="gap-2 rounded-xl h-12 px-7" onClick={() => setShowJoin(true)}>
              <UserPlus className="w-4 h-4" /> {t("studio.join_session", "Join session")}
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-6 border border-border/20">
              <Users className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">{t("studio.no_sessions", "No sessions yet")}</h3>
            <p className="text-muted-foreground">{t("studio.no_sessions_text", "Create or join a collaborative session to get started")}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveSession(session)}
                className="glass-card-elevated p-6 cursor-pointer card-hover group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{session.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${session.status === "open" ? "bg-green-500/10 text-green-500" : "bg-muted/40 text-muted-foreground"}`}>
                    {session.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{session.topic}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{session.style}</span>
                  <span>·</span>
                  <span className="font-mono">{session.invite_code}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t("studio.create_title", "Create a collaborative session")}</DialogTitle>
            <DialogDescription>{t("studio.create_desc", "Invite up to 8 students to co-write a StudyBeat")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("studio.session_title", "Session title")}</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("studio.session_title_ph", "E.g.: Cardiology review")} className="bg-muted/15 border-border/20 h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("studio.topic_label", "Topic")}</Label>
              <Textarea value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder={t("studio.topic_ph", "Describe the topic everyone will cover...")} className="bg-muted/15 border-border/20 rounded-xl min-h-[80px] resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("studio.style_label", "Music style")}</Label>
              <StylePicker selected={newStyle} onSelect={setNewStyle} />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newTopic.trim()} className="w-full gradient-bg-premium gap-2 rounded-xl h-12 shadow-lg shadow-primary/20">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {t("studio.create_btn", "Create session")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t("studio.join_title", "Join a session")}</DialogTitle>
            <DialogDescription>{t("studio.join_desc", "Enter the invite code shared by the session creator")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder={t("studio.code_ph", "Invite code...")} className="bg-muted/15 border-border/20 h-12 rounded-xl text-center font-mono text-lg tracking-wider" />
            <Button onClick={handleJoin} disabled={!joinCode.trim()} className="w-full gradient-bg-premium gap-2 rounded-xl h-12">
              <UserPlus className="w-4 h-4" /> {t("studio.join_btn", "Join")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
