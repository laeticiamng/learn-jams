import { Link } from "react-router-dom";
import { Music } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/30 py-10 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Music className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold gradient-text">StudyBeats</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plateforme de révision musicale par IA. Transforme tes cours en chansons pour mémoriser efficacement.
            </p>
          </div>

          {/* Produit */}
          <nav aria-label="Produit">
            <h3 className="font-display font-semibold text-sm mb-3 text-foreground">Produit</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">À propos</Link></li>
              <li><Link to="/signup" className="hover:text-foreground transition-colors">Créer un compte</Link></li>
              <li><Link to="/login" className="hover:text-foreground transition-colors">Se connecter</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact & Support</Link></li>
            </ul>
          </nav>

          {/* Légal */}
          <nav aria-label="Légal">
            <h3 className="font-display font-semibold text-sm mb-3 text-foreground">Légal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Conditions d'utilisation</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link></li>
            </ul>
          </nav>

          {/* Fonctionnalités */}
          <div>
            <h3 className="font-display font-semibold text-sm mb-3 text-foreground">Fonctionnalités</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Génération de paroles par IA</li>
              <li>8 styles musicaux</li>
              <li>Import PDF & photos</li>
              <li>Quiz interactif</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} StudyBeats. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
