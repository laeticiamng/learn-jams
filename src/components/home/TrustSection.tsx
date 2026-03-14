// ============================================================
// Trust Section — Trust badges bar
// ============================================================

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Brain, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const TRUST_BADGES = [
  { icon: ShieldCheck, key: "source" },
  { icon: Lock, key: "rls" },
  { icon: Brain, key: "hallucination" },
  { icon: Shield, key: "minor" },
] as const;

export default function TrustSection() {
  const { t } = useTranslation();

  return (
    <section className="py-10 px-4">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {TRUST_BADGES.map(({ icon: Icon, key }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2 text-muted-foreground text-sm"
          >
            <Icon className="w-4 h-4 text-primary" />
            <span>{t(`home.trust_${key}`)}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
