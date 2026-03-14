// ============================================================
// Trust Section — Trust badges bar
// ============================================================

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Brain, Shield } from "lucide-react";
import { HOME_COPY } from "@/lib/home-copy";

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Lock,
  Brain,
  Shield,
};

export default function TrustSection() {
  return (
    <section className="py-10 px-4">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {HOME_COPY.trust.badges.map(({ icon, label }, i) => {
          const Icon = ICON_MAP[icon] ?? ShieldCheck;
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 text-muted-foreground text-sm"
            >
              <Icon className="w-4 h-4 text-primary" />
              <span>{label}</span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
