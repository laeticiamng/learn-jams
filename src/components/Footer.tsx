import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer ref={ref} className="border-t border-border/15 py-10 sm:py-14 px-4 relative pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] md:pb-14">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/15">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold gradient-text">COGNITIO</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("footer.description")}</p>
          </div>

          <nav aria-label={t("footer.product")}>
            <h3 className="font-display font-semibold text-xs mb-4 text-foreground uppercase tracking-widest">{t("footer.product")}</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors duration-300">{t("footer.about")}</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors duration-300">{t("nav.pricing")}</Link></li>
              {user ? (
                <>
                  <li><Link to="/create" className="hover:text-foreground transition-colors duration-300">{t("nav.create")}</Link></li>
                  <li><Link to="/library" className="hover:text-foreground transition-colors duration-300">{t("nav.library")}</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/signup" className="hover:text-foreground transition-colors duration-300">{t("footer.signup")}</Link></li>
                  <li><Link to="/login" className="hover:text-foreground transition-colors duration-300">{t("footer.login")}</Link></li>
                </>
              )}
              <li><Link to="/contact" className="hover:text-foreground transition-colors duration-300">{t("footer.contact")}</Link></li>
            </ul>
          </nav>

          <nav aria-label={t("footer.legal")}>
            <h3 className="font-display font-semibold text-xs mb-4 text-foreground uppercase tracking-widest">{t("footer.legal")}</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground transition-colors duration-300">{t("footer.terms")}</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors duration-300">{t("footer.privacy")}</Link></li>
              <li><Link to="/status" className="hover:text-foreground transition-colors duration-300">État du service</Link></li>
            </ul>
          </nav>

          <div>
            <h3 className="font-display font-semibold text-xs mb-4 text-foreground uppercase tracking-widest">{t("footer.features")}</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to={user ? "/create" : "/signup"} className="hover:text-foreground transition-colors duration-300">{t("footer.import")}</Link></li>
              <li><Link to={user ? "/create" : "/signup"} className="hover:text-foreground transition-colors duration-300">{t("footer.quiz")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/15 pt-7 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">{t("footer.rights", { year })}</p>
          <p className="text-[10px] text-muted-foreground/70">EMOTIONSCARE SASU — SIREN 944 505 445 — 80000 Amiens, France</p>
          <a href="mailto:contact@emotionscare.com" className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground transition-colors">contact@emotionscare.com</a>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
