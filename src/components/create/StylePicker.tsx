import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Music, Mic2, Radio, Guitar, Drum, AudioLines, Disc3, Piano,
  Headphones, Waves, Zap, Heart, CloudSun, Flame, Star, Sparkles,
  Volume2, Music2, Music3, Music4
} from "lucide-react";

const styleCategories = [
  {
    category: "popular",
    styles: [
      { id: "pop", icon: Music, color: "from-pink-500 to-rose-500" },
      { id: "rap", icon: Mic2, color: "from-red-500 to-orange-500" },
      { id: "rnb", icon: Heart, color: "from-purple-500 to-pink-500" },
      { id: "rock", icon: Guitar, color: "from-red-600 to-red-400" },
      { id: "indie", icon: Star, color: "from-orange-400 to-amber-500" },
      { id: "country", icon: CloudSun, color: "from-yellow-500 to-orange-400" },
    ],
  },
  {
    category: "electronic",
    styles: [
      { id: "lofi", icon: Radio, color: "from-indigo-500 to-purple-500" },
      { id: "edm", icon: Zap, color: "from-cyan-400 to-blue-500" },
      { id: "house", icon: Headphones, color: "from-violet-500 to-indigo-500" },
      { id: "techno", icon: Volume2, color: "from-gray-500 to-zinc-600" },
      { id: "synthwave", icon: Waves, color: "from-fuchsia-500 to-purple-600" },
      { id: "drum-and-bass", icon: Drum, color: "from-emerald-500 to-teal-500" },
    ],
  },
  {
    category: "world",
    styles: [
      { id: "reggaeton", icon: Drum, color: "from-green-500 to-emerald-500" },
      { id: "afrobeat", icon: Flame, color: "from-amber-500 to-red-500" },
      { id: "reggae", icon: Music2, color: "from-green-600 to-yellow-500" },
      { id: "latin", icon: Music3, color: "from-rose-500 to-amber-500" },
      { id: "kpop", icon: Sparkles, color: "from-pink-400 to-violet-500" },
      { id: "bossa-nova", icon: Piano, color: "from-teal-400 to-emerald-400" },
    ],
  },
  {
    category: "classic",
    styles: [
      { id: "jazz", icon: Piano, color: "from-amber-500 to-yellow-500" },
      { id: "blues", icon: AudioLines, color: "from-blue-600 to-indigo-600" },
      { id: "soul", icon: Heart, color: "from-orange-500 to-red-400" },
      { id: "funk", icon: Music4, color: "from-yellow-400 to-lime-500" },
      { id: "classical", icon: Disc3, color: "from-violet-500 to-purple-500" },
      { id: "gospel", icon: Star, color: "from-amber-400 to-yellow-300" },
    ],
  },
  {
    category: "alternative",
    styles: [
      { id: "metal", icon: Flame, color: "from-gray-700 to-red-700" },
      { id: "punk", icon: Zap, color: "from-lime-500 to-green-600" },
      { id: "acoustic", icon: Guitar, color: "from-amber-300 to-orange-400" },
      { id: "folk", icon: CloudSun, color: "from-green-400 to-emerald-500" },
      { id: "ambient", icon: Waves, color: "from-sky-400 to-indigo-400" },
      { id: "spoken-word", icon: AudioLines, color: "from-teal-500 to-cyan-500" },
    ],
  },
] as const;

interface Props {
  selected: string;
  onSelect: (style: string) => void;
}

export default function StylePicker({ selected, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {styleCategories.map((cat) => (
        <div key={cat.category}>
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            {t(`style_categories.${cat.category}`)}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {cat.styles.map((style, i) => (
              <motion.button
                key={style.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(style.id)}
                className={`glass-card p-3.5 text-center transition-all duration-300 cursor-pointer ${
                  selected === style.id
                    ? "border-primary/40 glow-intense"
                    : "hover:border-border/50 gradient-border"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                  <style.icon className="w-5 h-5 text-primary-foreground drop-shadow" />
                </div>
                <div className="font-display text-xs font-semibold truncate">{t(`styles.${style.id}`)}</div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
