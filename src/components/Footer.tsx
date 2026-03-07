import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Music } from "lucide-react";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 py-10 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Music className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold gradient-text">StudyBeats</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("footer.description")}</p>
          </div>

          <nav aria-label={t("footer.product")}>
            <h3 className="font-display font-semibold text-sm mb-3 text-foreground">{t("footer.product")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">{t("footer.about")}</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</Link></li>
              <li><Link to="/signup" className="hover:text-foreground transition-colors">{t("footer.signup")}</Link></li>
              <li><Link to="/login" className="hover:text-foreground transition-colors">{t("footer.login")}</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">{t("footer.contact")}</Link></li>
            </ul>
          </nav>

          <nav aria-label={t("footer.legal")}>
            <h3 className="font-display font-semibold text-sm mb-3 text-foreground">{t("footer.legal")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link></li>
            </ul>
          </nav>

          <div>
            <h3 className="font-display font-semibold text-sm mb-3 text-foreground">{t("footer.features")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("footer.lyrics_gen")}</li>
              <li>{t("footer.styles_count")}</li>
              <li>{t("footer.import")}</li>
              <li>{t("footer.quiz")}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 text-center">
          <p className="text-sm text-muted-foreground">{t("footer.rights", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
