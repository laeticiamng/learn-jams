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
      toast.success("Invitation envoyée !");
      setEmail("");
      setName("");
      onInviteSent?.();
    } catch (err) {
      toast.error("Erreur lors de l'envoi de l'invitation");
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
          <h3 className="font-semibold">Inviter un tuteur</h3>
          <p className="text-sm text-muted-foreground">
            Le tuteur recevra un lien d'activation par email
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email du tuteur
          </Label>
          <Input
            type="email"
            placeholder="parent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Nom (optionnel)</Label>
          <Input
            placeholder="Prénom Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Relation
          </Label>
          <Select value={relationship} onValueChange={(v) => setRelationship(v as GuardianRelationship)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="legal_guardian">Tuteur légal</SelectItem>
              <SelectItem value="teacher">Enseignant</SelectItem>
              <SelectItem value="institution_admin">Admin institution</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full gap-2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" /> Envoyer l'invitation
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
