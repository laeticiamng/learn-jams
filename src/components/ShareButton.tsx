import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export default function ShareButton({
  title,
  text,
  url,
  variant = "outline",
  size = "sm",
  className = "",
}: ShareButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text || title, url: shareUrl });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success(t("share.copied", "Lien copié !"));
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error(t("share.error", "Impossible de copier le lien"));
      }
    }
  }, [title, text, shareUrl, t]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={`gap-2 rounded-xl ${className}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {size !== "icon" && t("share.button", "Partager")}
    </Button>
  );
}
