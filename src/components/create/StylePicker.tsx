import { motion } from "framer-motion";
import { Music, Mic2, Radio, Guitar, Drum, AudioLines, Disc3, Piano } from "lucide-react";

const styles = [
  { id: "rap", label: "Rap", icon: Mic2, color: "from-red-500 to-orange-500", desc: "Flow et rimes" },
  { id: "lofi", label: "Lo-Fi", icon: Radio, color: "from-indigo-500 to-purple-500", desc: "Chill et relaxant" },
  { id: "pop", label: "Pop", icon: Music, color: "from-pink-500 to-rose-500", desc: "Accrocheur et fun" },
  { id: "jazz", label: "Jazz", icon: Piano, color: "from-amber-500 to-yellow-500", desc: "Smooth et élégant" },
  { id: "rock", label: "Rock", icon: Guitar, color: "from-red-600 to-red-400", desc: "Énergie pure" },
  { id: "spoken-word", label: "Spoken Word", icon: AudioLines, color: "from-teal-500 to-cyan-500", desc: "Poésie parlée" },
  { id: "reggaeton", label: "Reggaeton", icon: Drum, color: "from-green-500 to-emerald-500", desc: "Rythme latino" },
  { id: "classique", label: "Classique", icon: Disc3, color: "from-violet-500 to-purple-500", desc: "Orchestral" },
] as const;

interface Props {
  selected: string;
  onSelect: (style: string) => void;
}

export default function StylePicker({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {styles.map((style, i) => (
        <motion.button
          key={style.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(style.id)}
          className={`glass-card p-5 text-center transition-all cursor-pointer group ${
            selected === style.id ? "border-primary glow" : "hover:border-primary/30"
          }`}
        >
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
            <style.icon className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="font-display font-semibold">{style.label}</div>
          <div className="text-xs text-muted-foreground mt-1">{style.desc}</div>
        </motion.button>
      ))}
    </div>
  );
}
