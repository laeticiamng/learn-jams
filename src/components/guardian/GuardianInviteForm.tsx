// ============================================================
// GuardianInviteForm — Invite a parent/guardian via email
// ============================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, UserPlus, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { validateGuardianInvite } from "@/domain/guardian/guardian.validators";
import { useTranslation } from "react-i18next";
import type { GuardianRelationship } from "@/domain/guardian/guardian.types";
import { inviteGuardian } from "@/services/guardian/guardianManagement.service";

interface GuardianInviteFormProps {
  minorUserId: string;
  onInviteSent?: () => void;
}

export function GuardianInviteForm({ minorUserId, onInviteSent }: GuardianInviteFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<GuardianRelationship>("parent");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateGuardianInvite({
      guardian_email: email,
      guardian_name: name || undefined,
      relationship,
      minor_user_id: minorUserId,
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);
    try {
      await inviteGuardian({
        guardian_email: email,
        guardian_name: name || undefined,
        relationship,
        minor_user_id: minorUserId,
      });
      toast.success(t("guardian.invite_sent"));
      setEmail("");
      setName("");
      onInviteSent?.();
    } catch (err) {
      toast.error(t("guardian.invite_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-6 border rounded-xl bg-card/60 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold">{t("guardian.invite_guardian")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("guardian.invite_desc")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> {t("guardian.invite_email")}
          </Label>
          <Input
            type="email"
            placeholder={t("guardian.invite_email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{t("guardian.invite_name")}</Label>
          <Input
            placeholder={t("guardian.invite_name_placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> {t("guardian.invite_relation")}
          </Label>
          <Select value={relationship} onValueChange={(v) => setRelationship(v as GuardianRelationship)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="parent">{t("guardian.relation_parent")}</SelectItem>
              <SelectItem value="legal_guardian">{t("guardian.relation_legal_guardian")}</SelectItem>
              <SelectItem value="teacher">{t("guardian.relation_teacher")}</SelectItem>
              <SelectItem value="institution_admin">{t("guardian.relation_institution_admin")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full gap-2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {t("guardian.invite_sending")}
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" /> {t("guardian.invite_send")}
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
