// ============================================================
// Seed Demo Section — Try without uploading
// ============================================================

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProductTracking } from "@/hooks/useProductTracking";
import { useSeedLibrary } from "@/hooks/useSeedLibrary";
import { SeedLibraryGrid } from "@/components/product/SeedLibraryGrid";
import { FeatureFlagGuard } from "@/components/product/FeatureFlagGuard";
import { resolveCTARoute } from "@/lib/home-cta-map";
import { useTranslation } from "react-i18next";

export default function SeedDemoSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { track } = useProductTracking();
  const { seeds, loading } = useSeedLibrary();
  const { t } = useTranslation();

  return (
    <FeatureFlagGuard flag="ff_seed_library_enabled">
      <section id="exemples" className="py-16 sm:py-20 md:py-28 px-4 scroll-mt-24">
        <div className="container mx-auto max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-center mb-5 tracking-tight"
          >
            {t("home.seed_demo_title")}
          </motion.h2>
          <p className="text-center text-muted-foreground mb-10 text-lg">
            {t("home.seed_demo_subtitle")}
          </p>
          <SeedLibraryGrid
            seeds={seeds}
            loading={loading}
            onStartSeed={(id) => {
              track({ event_name: "seed_transformation_started", metadata: { seed_id: id } });
              navigate(resolveCTARoute("demo", !!user, id));
            }}
          />
        </div>
      </section>
    </FeatureFlagGuard>
  );
}
