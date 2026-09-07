import React from 'react';
import { 
  Store, MapPin, Phone, Mail, ShieldCheck, 
  HelpCircle, Heart, Award, ArrowRight, Truck, Clock, Sparkles
} from 'lucide-react';

interface MarketplaceFooterProps {
  onNavigateSection: (section: 'home' | 'categories' | 'stores' | 'how-it-works' | 'contact') => void;
  onOpenRegisterStore: () => void;
  onOpenLogin: () => void;
}

export const MarketplaceFooter: React.FC<MarketplaceFooterProps> = ({
  onNavigateSection,
  onOpenRegisterStore,
  onOpenLogin
}) => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-14 pb-8">
      
      {/* Trust Badges Row with Guinea Flag Tri-Color Palette */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-slate-800/60">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-red-600/15 text-red-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase">Vente Locale & Nationale</h4>
              <p className="text-[11px] text-slate-400">Boutiques à Conakry et dans toutes les villes</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase">Boutiques Vérifiées</h4>
              <p className="text-[11px] text-slate-400">Commerçants actifs et contrôlés en Guinée</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 text-yellow-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase">Livraison & Transport</h4>
              <p className="text-[11px] text-slate-400">Entente directe & transporteurs fiables</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 text-yellow-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase">Avis & Confiance</h4>
              <p className="text-[11px] text-slate-400">Notes réelles après achat vérifié</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white shadow-md">
                <Store className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-red-500">GUINÉE</span>
                  <span className="text-lg font-black text-yellow-400">BOUTIQUES</span>
                </div>
                <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">● Marketplace Nationale de Guinée</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              La marketplace nationale de référence en République de Guinée. Trouvez facilement des articles de qualité près de chez vous ou commandez auprès des meilleures boutiques à Conakry, Kindia, Labé, Kankan et dans toutes les régions.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>+224 620 00 11 22</span>
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-yellow-400" />
                <span>contact@guinee-boutiques.com</span>
              </div>
            </div>
          </div>

          {/* Column 1: Marketplace */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Marketplace</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigateSection('home')} className="hover:text-red-400 transition-colors">
                  Accueil Marketplace
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('categories')} className="hover:text-yellow-400 transition-colors">
                  Explorer les Catégories
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('stores')} className="hover:text-emerald-400 transition-colors">
                  Boutiques Vérifiées
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('how-it-works')} className="hover:text-yellow-400 transition-colors">
                  Comment ça marche ?
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('contact')} className="hover:text-emerald-400 transition-colors">
                  Nous Contacter
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Clients */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Espace Clients</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={onOpenLogin} className="hover:text-white transition-colors">
                  Suivre mes commandes
                </button>
              </li>
              <li>
                <button onClick={onOpenLogin} className="hover:text-white transition-colors">
                  Ma messagerie vendeur
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateSection('how-it-works')} className="hover:text-white transition-colors">
                  Aide & FAQ
                </button>
              </li>
              <li>
                <span className="text-slate-500 cursor-not-allowed">
                  Conditions d'utilisation
                </span>
              </li>
              <li>
                <span className="text-slate-500 cursor-not-allowed">
                  Politique de confidentialité
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Vendeurs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Vendeurs & Boutiques</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={onOpenRegisterStore} 
                  className="font-bold text-white hover:text-yellow-300 transition-colors flex items-center gap-1"
                >
                  <span>Créer ma boutique (10j gratuits)</span>
                  <ArrowRight className="w-3 h-3 text-red-500" />
                </button>
              </li>
              <li>
                <button onClick={onOpenLogin} className="hover:text-white transition-colors">
                  Connexion Espace Vendeur
                </button>
              </li>
              <li>
                <button onClick={onOpenLogin} className="hover:text-white transition-colors">
                  Espace Prestataire & Ateliers
                </button>
              </li>
              <li>
                <span className="text-slate-400">
                  Tarifs & Formules d'abonnement
                </span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Guinea Flag Tri-Color Line */}
      <div className="h-1 w-full flex opacity-60">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-yellow-400" />
        <div className="flex-1 bg-emerald-600" />
      </div>

      {/* Copyright & Legal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Guinée Boutiques • République de Guinée. Tous droits réservés.</p>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
          <span>🇬🇳</span> Fièrement conçu pour le commerce et les prestataires de Guinée
        </p>
      </div>
    </footer>
  );
};
