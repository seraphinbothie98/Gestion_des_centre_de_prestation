import React, { useState } from 'react';
import { 
  X, Store, Sparkles, CheckCircle2, Clock, ShieldCheck, 
  MapPin, Phone, Mail, User, ArrowRight, Building2, AlertCircle
} from 'lucide-react';
import { GuineanCity, ConakryCommune } from './types';
import { GUINEAN_CITIES, CONAKRY_COMMUNES } from './MarketplaceHeader';
import { Tenant } from '../../types';

interface MarketplaceRegisterStoreModalProps {
  onRegisterSuccess: (newTenant: Tenant) => void;
  onClose: () => void;
  onOpenLogin: () => void;
}

export const MarketplaceRegisterStoreModal: React.FC<MarketplaceRegisterStoreModalProps> = ({
  onRegisterSuccess,
  onClose,
  onOpenLogin
}) => {
  const [storeName, setStoreName] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState<GuineanCity>('Conakry');
  const [commune, setCommune] = useState<ConakryCommune | undefined>('Kaloum');
  const [address, setAddress] = useState('');
  const [categoryActivity, setCategoryActivity] = useState('Téléphones & Informatique');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim() || !responsibleName.trim() || !phone.trim() || !password) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const tenantId = `t-store-${Date.now()}`;
    const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 jours d'essai

    const newStore: Tenant = {
      id: tenantId,
      name: storeName.trim(),
      code: `BTQ-${Math.floor(100 + Math.random() * 900)}`,
      slug: slug,
      activityType: 'RETAIL_STORE',
      status: 'ACTIVE',
      responsibleName: responsibleName.trim(),
      phone: phone.trim(),
      email: email.trim() || `${slug}@guinee-boutiques.com`,
      city: city,
      address: city === 'Conakry' && commune ? `${commune} - ${address.trim()}` : address.trim(),
      currency: 'GNF',
      taxRate: 0,
      isActive: true,
      subscriptionStatus: 'TRIAL',
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnds.toISOString(),
      trialDaysTotal: 10,
      settings: {
        companyHeader: `${storeName.toUpperCase()} - Boutique Partenaire Agréée`,
        invoiceFooter: "Merci pour votre fidélité. Produits garantis.",
        branding: {
          logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150&auto=format&fit=crop&q=80',
          logoPosition: 'center',
          logoSize: 'md',
          showLogo: true,
          slogan: "Votre boutique de confiance en Guinée",
          headerAlignment: 'center',
          showPhone: true,
          showEmail: true,
          showAddress: true,
          showWebsite: false,
          footerAlignment: 'center',
          showFooter: true
        }
      },
      createdAt: now.toISOString()
    };

    setCreatedTenant(newStore);
    onRegisterSuccess(newStore);
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto p-6 sm:p-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header & Trial Notice */}
            <div className="space-y-3 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white font-black flex items-center justify-center shadow-lg shadow-red-600/20">
                  <Store className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Créer ma Boutique en Ligne</h3>
                  <p className="text-xs text-slate-400">Vendez vos produits à Conakry et partout en République de Guinée</p>
                </div>
              </div>

              {/* 10 Days Free Trial Highlight */}
              <div className="p-3.5 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-xs text-yellow-300 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
                <div>
                  <strong className="text-yellow-400 font-bold block">Période d'essai gratuite de 10 JOURS offerte !</strong>
                  <span className="text-[11px] text-slate-300">
                    Ajoutez vos produits immédiatement, recevez des commandes et gérez votre commerce sans frais pendant 10 jours.
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Nom de la Boutique / Enseigne <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Boutique Diallo & Frères"
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Nom & Prénom du Gérant / Responsable <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    placeholder="Ex: Mamadou Diallo"
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Numéro de Téléphone (Orange / MTN) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: +224 620 00 00 00"
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Adresse Email (Optionnel)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: contact@maboutique.com"
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Ville principale d'activité <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value as GuineanCity)}
                    className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    {GUINEAN_CITIES.map(c => (
                      <option key={c} value={c}>📍 {c}</option>
                    ))}
                  </select>
                </div>

                {city === 'Conakry' ? (
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Commune de Conakry <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={commune}
                      onChange={(e) => setCommune(e.target.value as ConakryCommune)}
                      className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                    >
                      {CONAKRY_COMMUNES.map(cm => (
                        <option key={cm} value={cm}>{cm}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Catégorie principale
                    </label>
                    <select
                      value={categoryActivity}
                      onChange={(e) => setCategoryActivity(e.target.value)}
                      className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                    >
                      <option>Téléphones & Informatique</option>
                      <option>Mode & Vêtements</option>
                      <option>Quincaillerie & BTP</option>
                      <option>Maison & Électroménager</option>
                      <option>Alimentation & Produits Locaux</option>
                      <option>Autre activité</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Adresse exacte / Quartier du magasin
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Marché Madina, Bloc C ou Avenue de la République"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Mot de passe de gestion boutique <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Créez un mot de passe sécurisé (min. 6 caractères)"
                  className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                />
              </div>

            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onOpenLogin}
                className="text-xs text-yellow-400 hover:text-yellow-300 font-bold"
              >
                Déjà un compte ? Se connecter
              </button>

              <button
                type="submit"
                className="py-3 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 hover:scale-[1.02] transition-all"
              >
                <Store className="w-4 h-4 text-yellow-300" />
                <span>Créer ma boutique (10 jours gratuits)</span>
              </button>
            </div>

          </form>
        ) : (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Félicitations ! Votre boutique est créée
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                La boutique <strong className="text-yellow-400">{createdTenant?.name}</strong> est désormais active avec une période d'essai de <strong className="text-emerald-400">10 jours gratuits</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Code Boutique :</span>
                <strong className="text-white">{createdTenant?.code}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Localisation :</span>
                <strong className="text-yellow-400">📍 {createdTenant?.city}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Période d'essai :</span>
                <strong className="text-emerald-400">10 jours restants</strong>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onOpenLogin}
                className="py-3 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-600/30 transition-all"
              >
                Accéder à mon espace commerçant
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
