import React, { useState } from 'react';
import { 
  X, User as UserIcon, Lock, Phone, MapPin, Mail, Calendar, 
  Camera, Trash2, Check, AlertCircle, ShieldCheck, Sparkles, 
  Eye, EyeOff, CheckCircle2, ArrowRight, Bell, Tag, Info
} from 'lucide-react';
import { dbStore } from '../../server/db/mockStore';
import { User as UserType } from '../../types';
import { GUINEAN_CITIES, CONAKRY_COMMUNES } from './MarketplaceHeader';
import { GuineanCity, ConakryCommune } from './types';

import { validatePasswordByPolicy } from '../../lib/passwordSecurity';

interface MarketplaceClientRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
  onSwitchToLogin?: () => void;
  pendingActionDescription?: string;
}

export const MarketplaceClientRegisterModal: React.FC<MarketplaceClientRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToLogin,
  pendingActionDescription
}) => {
  // SECTION 1 — INFORMATIONS PERSONNELLES
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // SECTION 2 — COORDONNÉES
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState<GuineanCity>('Conakry');
  const [commune, setCommune] = useState<ConakryCommune | ''>('Kaloum');
  const [district, setDistrict] = useState('');

  // SECTION 3 — SÉCURITÉ
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // SECTION 4 — PRÉFÉRENCES
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [promoOffers, setPromoOffers] = useState(false);

  // SECTION 5 — CONDITIONS
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState<UserType | null>(null);

  if (!isOpen) return null;

  // Validation helpers
  const cleanPhone = phone.trim().replace(/\s+/g, '');
  const isPhoneValid = cleanPhone.length >= 8 && /^[0-9+]+$/.test(cleanPhone);
  
  const isEmailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  
  const pwdValidation = validatePasswordByPolicy(password, 'MARKETPLACE_CLIENT');
  const isPasswordSecure = pwdValidation.isValid;
  const isPasswordMatching = password === confirmPassword && confirmPassword.length > 0;
  
  const isFirstNameValid = firstName.trim().length >= 2;
  const isLastNameValid = lastName.trim().length >= 2;

  const isFormValid = Boolean(
    isFirstNameValid &&
    isLastNameValid &&
    isPhoneValid &&
    isEmailValid &&
    isPasswordSecure &&
    isPasswordMatching &&
    acceptedTerms
  );

  // Image Upload handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('La photo sélectionnée est trop volumineuse (max 2 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isFormValid) {
      setErrorMsg('Veuillez renseigner tous les champs obligatoires (*) et accepter les conditions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = dbStore.registerMarketplaceCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || undefined,
        avatarUrl: avatarUrl || undefined,
        phone: cleanPhone,
        email: email.trim() || undefined,
        city: city,
        commune: city === 'Conakry' ? (commune || undefined) : undefined,
        district: district.trim() || undefined,
        password: password,
        preferences: {
          orderNotifications,
          promoOffers
        },
        failIfExists: true
      });

      if (!res.success || !res.user) {
        setErrorMsg(res.message || 'Erreur lors de la création de votre compte.');
        setIsSubmitting(false);
        return;
      }

      // Establish authenticated session immediately
      localStorage.setItem('cms_is_authenticated', 'true');
      localStorage.setItem('cms_current_user_id', res.user.id);

      dbStore.updateState(draft => {
        draft.currentUserId = res.user!.id;
      });

      setIsRegisteredSuccess(res.user);
      
      // Notify parent after brief confirmation display
      setTimeout(() => {
        onSuccess(res.user!);
        onClose();
      }, 1400);

    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur inattendue est survenue.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto overflow-x-hidden text-slate-800">
        
        {/* Top Guinea Accent Line */}
        <div className="h-1.5 w-full flex shrink-0 sticky top-0 z-20">
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-amber-400" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {isRegisteredSuccess ? (
          /* SUCCESS SCREEN */
          <div className="p-8 sm:p-12 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-300 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-1 rounded-full border border-emerald-200">
                ✓ Inscription Réussie
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                Bienvenue, {isRegisteredSuccess.firstName} !
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Votre compte client Marketplace est désormais actif. Vous êtes connecté et prêt à commander auprès de toutes les boutiques partenaires.
              </p>
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 text-xs text-amber-700 font-bold bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>Chargement de votre session...</span>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN REGISTRATION FORM */
          <div className="p-5 sm:p-8 space-y-6">
            
            {/* Header / Intro */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-5">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 via-emerald-50 to-amber-50 border border-blue-200/60 text-blue-900 px-3.5 py-1 rounded-full text-xs font-black shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Espace Acheteur & Client Marketplace</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Créer mon compte
              </h1>
              
              <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                {pendingActionDescription ? (
                  <span>Créez votre compte en quelques secondes pour <strong className="text-red-600 font-bold">{pendingActionDescription}</strong>.</span>
                ) : (
                  <span>Rejoignez des milliers de clients en Guinée pour commander et suivre vos livraisons en direct.</span>
                )}
              </p>

              {/* Notice Client Exclusivity */}
              <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2 text-left max-w-lg mx-auto">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Réservé aux Acheteurs :</strong> Ce formulaire crée un compte client personnel. Pour ouvrir une boutique professionnelle, utilisez le bouton d'inscription vendeur.
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">{errorMsg}</p>
                  {errorMsg.includes('connecter') && onSwitchToLogin && (
                    <button
                      type="button"
                      onClick={onSwitchToLogin}
                      className="mt-1 text-xs font-black text-red-800 underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Cliquer ici pour vous connecter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* ======================================================== */}
              {/* SECTION 1 — INFORMATIONS PERSONNELLES */}
              {/* ======================================================== */}
              <div className="space-y-3.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                    1
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Informations Personnelles
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prénom <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ex: Mamadou"
                        required
                        className="w-full bg-white text-slate-900 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom de famille <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ex: Diallo"
                        required
                        className="w-full bg-white text-slate-900 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date de naissance <span className="text-slate-400 font-normal">(facultative)</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="date"
                        value={birthDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full bg-white text-slate-900 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Photo de profil facultative */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Photo de profil <span className="text-slate-400 font-normal">(facultative)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      {avatarUrl ? (
                        <div className="relative">
                          <img 
                            src={avatarUrl} 
                            alt="Aperçu avatar" 
                            className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-sm" 
                          />
                          <button
                            type="button"
                            onClick={() => setAvatarUrl(null)}
                            className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-full hover:bg-red-700 transition-colors shadow"
                            title="Supprimer la photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 border border-slate-300">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}

                      <label className="cursor-pointer inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>{avatarUrl ? 'Changer' : 'Ajouter photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* SECTION 2 — COORDONNÉES */}
              {/* ======================================================== */}
              <div className="space-y-3.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                    2
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Coordonnées & Localisation
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Numéro de téléphone <span className="text-red-600">* (unique)</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-extrabold text-slate-500 select-none flex items-center gap-1">
                        <span>🇬🇳</span> +224
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="622 12 34 56"
                        required
                        className="w-full bg-white text-slate-900 text-xs pl-20 pr-8 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-400 font-bold"
                      />
                      {isPhoneValid && (
                        <Check className="w-4 h-4 text-emerald-600 absolute right-3 pointer-events-none" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Sert d'identifiant unique pour vos connexions.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Adresse e-mail <span className="text-slate-400 font-normal">(facultative)</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@exemple.com"
                        className="w-full bg-white text-slate-900 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                    {email && !isEmailValid && (
                      <p className="text-[10px] text-red-600 mt-1 font-bold">Format d'e-mail invalide.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ville <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <select
                        value={city}
                        onChange={(e) => {
                          const c = e.target.value as GuineanCity;
                          setCity(c);
                          if (c !== 'Conakry') setCommune('');
                        }}
                        className="w-full bg-white text-slate-900 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                      >
                        {GUINEAN_CITIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {city === 'Conakry' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Commune de Conakry <span className="text-slate-400 font-normal">(facultatif)</span>
                      </label>
                      <select
                        value={commune}
                        onChange={(e) => setCommune(e.target.value as ConakryCommune)}
                        className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                      >
                        {CONAKRY_COMMUNES.map(cm => (
                          <option key={cm} value={cm}>{cm}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quartier / Secteur <span className="text-slate-400 font-normal">(facultatif)</span>
                      </label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="Ex: Centre-ville, Quartier Commercial"
                        className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  )}
                </div>

                {city === 'Conakry' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quartier / Repère indicatif <span className="text-slate-400 font-normal">(facultatif)</span>
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Ex: Kipé, près du Centre Émetteur"
                      className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>L'adresse de livraison complète (rue, point de repère précis) vous sera demandée lors de chaque commande.</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* SECTION 3 — SÉCURITÉ */}
              {/* ======================================================== */}
              <div className="space-y-3.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-sm">
                    3
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Sécurité du Compte
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mot de passe <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ex: Achat6"
                        required
                        className="w-full bg-white text-slate-900 text-xs pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Minimum 6 caractères avec au moins 1 lettre majuscule (ex : <strong>Achat6</strong>).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirmer le mot de passe <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        required
                        className={`w-full bg-white text-slate-900 text-xs pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none transition-all placeholder:text-slate-400 ${
                          confirmPassword && !isPasswordMatching 
                            ? 'border-red-400 focus:ring-2 focus:ring-red-400/20' 
                            : 'border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && !isPasswordMatching && (
                      <p className="text-[10px] text-red-600 mt-1 font-bold">Les mots de passe ne correspondent pas.</p>
                    )}
                  </div>
                </div>

                {confirmPassword && (
                  <div className="text-[11px] font-bold">
                    {isPasswordMatching ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Les mots de passe correspondent parfaitement.
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Les mots de passe ne correspondent pas.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 4 — PRÉFÉRENCES */}
              {/* ======================================================== */}
              <div className="space-y-3.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                    4
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Préférences de Communication
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Notifications de suivi de commandes</p>
                        <p className="text-[11px] text-slate-500">Mises à jour par SMS/WhatsApp sur la préparation et livraison</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setOrderNotifications(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          orderNotifications 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderNotifications(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          !orderNotifications 
                            ? 'bg-slate-700 text-white shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Non
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Offres promotionnelles & Ventes flash</p>
                        <p className="text-[11px] text-slate-500">Recevoir les bons plans et réductions des boutiques partenaires</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPromoOffers(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          promoOffers 
                            ? 'bg-amber-500 text-slate-950 shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromoOffers(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          !promoOffers 
                            ? 'bg-slate-700 text-white shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Non
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* SECTION 5 — CONDITIONS */}
              {/* ======================================================== */}
              <div className="space-y-3 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                    5
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Conditions d'utilisation
                  </h3>
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    J'accepte les <strong className="text-blue-700 underline">conditions d'utilisation</strong> et la <strong className="text-blue-700 underline">politique de confidentialité</strong> de Guinée Boutiques.
                  </span>
                </label>

                {!acceptedTerms && (
                  <p className="text-[11px] text-amber-700 font-semibold pl-7">
                    * Vous devez cocher cette case pour activer la création de votre compte.
                  </p>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isFormValid && !isSubmitting
                      ? 'bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 hover:scale-[1.01] text-white shadow-emerald-700/20 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                  }`}
                  title={!isFormValid ? 'Remplissez tous les champs obligatoires pour activer' : 'Créer mon compte'}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Création de votre compte en cours...' : 'Créer mon compte'}</span>
                </button>

                {/* Switch to login link */}
                {onSwitchToLogin && (
                  <div className="text-center pt-1">
                    <p className="text-xs text-slate-600">
                      Vous possédez déjà un compte client ?{' '}
                      <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="font-black text-blue-700 hover:underline cursor-pointer"
                      >
                        Se connecter ici
                      </button>
                    </p>
                  </div>
                )}
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
