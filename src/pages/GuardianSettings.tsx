// ============================================================
// GuardianSettings — Minor mode, guardians, consent
// ============================================================

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useMinorProfile } from "@/hooks/useMinorProfile";
import { useTranslation } from "react-i18next";
import { MinorStatusStep } from "@/components/guardian/MinorStatusStep";
import { GuardianInviteForm } from "@/components/guardian/GuardianInviteForm";
import { GuardianDashboard } from "@/components/guardian/GuardianDashboard";
import { ConsentTimeline } from "@/components/guardian/ConsentTimeline";
import { DEFAULT_MINOR_PROFILE } from "@/domain/guardian/minorProfile.types";
import { recordConsentEventWithContext } from "@/services/guardian/consentLog.service";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function GuardianSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile, updateProfile } = useMinorProfile(user?.id ?? null);
  const { t } = useTranslation();

  const handleMinorUpdate = async (updates: Parameters<typeof updateProfile>[0]) => {
    if (!user) return;
    await updateProfile(updates);

    // Log consent events for significant changes
    if (updates.minor_mode_enabled !== undefined) {
      await recordConsentEventWithContext(
        user.id,
        updates.minor_mode_enabled ? "minor_mode_enabled" : "minor_mode_disabled",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
      <Navbar />
      <div className="container mx-auto pt-28 pb-16 px-4 max-w-lg relative z-10">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className="gap-2 mb-6 rounded-xl hover:bg-muted/30 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> {t("guardian.back_to_profile")}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("guardian.protected_mode")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("guardian.subtitle")}
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Minor status */}
          <MinorStatusStep
            birthYear={profile?.birth_year ?? null}
            minorModeEnabled={profile?.minor_mode_enabled ?? DEFAULT_MINOR_PROFILE.minor_mode_enabled}
            contentFilterLevel={profile?.content_filter_level ?? DEFAULT_MINOR_PROFILE.content_filter_level}
            maxDailyMinutes={profile?.max_daily_minutes ?? DEFAULT_MINOR_PROFILE.max_daily_minutes}
            allowedHoursStart={profile?.allowed_hours_start ?? DEFAULT_MINOR_PROFILE.allowed_hours_start}
            allowedHoursEnd={profile?.allowed_hours_end ?? DEFAULT_MINOR_PROFILE.allowed_hours_end}
            onUpdate={handleMinorUpdate}
          />

          {/* Guardian invite */}
          {user && (
            <GuardianInviteForm minorUserId={user.id} />
          )}

          {/* Guardian list + notifications */}
          {user && (
            <GuardianDashboard userId={user.id} />
          )}

          {/* Consent timeline */}
          {user && (
            <ConsentTimeline userId={user.id} />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
