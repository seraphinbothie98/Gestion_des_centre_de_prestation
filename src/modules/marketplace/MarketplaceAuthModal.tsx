import React, { useState, useEffect } from 'react';
import { 
  X, User as UserIcon, Lock, Phone, MapPin, Mail, Calendar, 
  Camera, Trash2, Check, AlertCircle, ShieldCheck, Sparkles, 
  Eye, EyeOff, CheckCircle2, ArrowRight, Bell, Tag, Info, LogIn
} from 'lucide-react';
import { dbStore } from '../../server/db/mockStore';
import { User as UserType } from '../../types';
import { GUINEAN_CITIES, CONAKRY_COMMUNES } from './MarketplaceHeader';
import { GuineanCity, ConakryCommune } from './types';
import { validatePasswordByPolicy } from '../../lib/passwordSecurity';

interface MarketplaceAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
  pendingActionDescription?: string;
}

export const MarketplaceAuthModal: React.FC<MarketplaceAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'LOGIN',
  pendingActionDescription = 'continuer'
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // LOGIN STATE
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // REGISTER STATE — SECTION 1: INFORMATIONS PERSONNELLES
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regAvatarUrl, setRegAvatarUrl] = useState<string | null>(null);

  // REGISTER STATE — SECTION 2: COORDONNÉES
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCity, setRegCity] = useState<GuineanCity>('Conakry');
  const [regCommune, setRegCommune] = useState<ConakryCommune | ''>('Kaloum');
  const [regDistrict, setRegDistrict] = useState('');

  // REGISTER STATE — SECTION 3: SÉCURITÉ
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // REGISTER STATE — SECTION 4: PRÉFÉRENCES
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [promoOffers, setPromoOffers] = useState(false);

  // REGISTER STATE — SECTION 5: CONDITIONS
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Status state
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<UserType | null>(null);

  if (!isOpen) return null;

  // Validation helpers for registration
  const cleanPhone = regPhone.trim().replace(/\s+/g, '');
  const isPhoneValid = cleanPhone.length >= 8 && /^[0-9+]+$/.test(cleanPhone);
  const isEmailValid = !regEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim());
  const pwdValidation = validatePasswordByPolicy(regPassword, 'MARKETPLACE_CLIENT');
  const isPasswordSecure = pwdValidation.isValid;
  const isPasswordMatching = regPassword === regConfirmPassword && regConfirmPassword.length > 0;
  const isFirstNameValid = regFirstName.trim().length >= 2;
  const isLastNameValid = regLastName.trim().length >= 2;

  const isRegisterFormValid = Boolean(
    isFirstNameValid &&
    isLastNameValid &&
    isPhoneValid &&
    isEmailValid &&
    isPasswordSecure &&
    isPasswordMatching &&
    acceptedTerms
  );

  // Avatar change handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setRegError('La photo sélectionnée est trop volumineuse (max 2 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRegAvatarUrl(reader.result as string);
      setRegError('');
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setLoginError('Veuillez saisir votre numéro de téléphone ou identifiant client.');
      return;
    }

    setIsSubmitting(true);
    try {
      const authRes = dbStore.authenticateUser(identifier, loginPassword || undefined);
      if (!authRes.success || !authRes.user) {
        setLoginError(authRes.message || 'Identifiants incorrects. Veuillez vérifier votre numéro et mot de passe.');
        setIsSubmitting(false);
        return;
      }

      const user = authRes.user;
      const isClient = Boolean(
        user.roles?.some(r => r.code === 'CLIENT') ||
        user.role === 'CLIENT' ||
        (!user.isSuperAdmin && user.tenantId === 'global' && !user.roles?.some(r => ['SUPER_ADMIN', 'ADMIN_CENTRE', 'GERANT', 'CAISSIER', 'OPERATEUR', 'RESPONSABLE_FORMATION', 'FORMATEUR', 'MAGASINIER', 'RECEPTIONNISTE'].includes(r.code)))
      );

      if (!isClient) {
        setLoginError("Ce compte est un compte professionnel ou administrateur. Cet espace est réservé aux clients acheteurs.");
        setIsSubmitting(false);
        return;
      }

      // Set authenticated session
      localStorage.setItem('cms_is_authenticated', 'true');
      localStorage.setItem('cms_current_user_id', user.id);
      
      dbStore.updateState(draft => {
        draft.currentUserId = user.id;
      });

      onSuccess(user);
      onClose();
    } catch (err: any) {
      setLoginError(err.message || 'Erreur lors de la connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!isRegisterFormValid) {
      setRegError('Veuillez renseigner tous les champs obligatoires (*) et accepter les conditions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = dbStore.registerMarketplaceCustomer({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        birthDate: regBirthDate || undefined,
        avatarUrl: regAvatarUrl || undefined,
        phone: cleanPhone,
        email: regEmail.trim() || undefined,
        city: regCity,
        commune: regCity === 'Conakry' ? (regCommune || undefined) : undefined,
        district: regDistrict.trim() || undefined,
        password: regPassword,
        preferences: {
          orderNotifications,
          promoOffers
        },
        failIfExists: true
      });

      if (!res.success || !res.user) {
        setRegError(res.message || 'Erreur lors de la création du compte.');
        setIsSubmitting(false);
        return;
      }

      // Establish authenticated session
      localStorage.setItem('cms_is_authenticated', 'true');
      localStorage.setItem('cms_current_user_id', res.user.id);
      
      dbStore.updateState(draft => {
        draft.currentUserId = res.user!.id;
      });

      setRegisteredUser(res.user);

      // Brief animation before closing
      setTimeout(() => {
        onSuccess(res.user!);
        onClose();
      }, 1400);

    } catch (err: any) {
      setRegError(err.message || 'Erreur lors de la création du compte.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-white border border-slate-200 rounded-3xl w-full shadow-2xl relative my-auto overflow-x-hidden text-slate-800 transition-all ${
        mode === 'REGISTER' ? 'max-w-2xl max-h-[92vh] overflow-y-auto' : 'max-w-lg max-h-[90vh]'
      }`}>
        
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

        {registeredUser ? (
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
                Bienvenue, {registeredUser.firstName} !
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Votre compte client Marketplace est désormais actif. Vous êtes connecté et prêt à commander auprès de toutes les boutiques de Guinée.
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
          <div className="p-5 sm:p-8 space-y-6">
            
            {/* Top Header Badge & Intro */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-4">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 via-emerald-50 to-amber-50 border border-blue-200/60 text-blue-900 px-3.5 py-1 rounded-full text-xs font-black shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Espace Acheteur & Client Marketplace</span>
              </div>
              
              <h2 className="text-2xl font-black text-slate-950 tracking-tight">
                {mode === 'LOGIN' ? 'Connexion Espace Client' : 'Créer mon compte'}
              </h2>
              
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Connectez-vous ou créez votre compte pour <strong className="text-red-600 font-bold">{pendingActionDescription}</strong>.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setLoginError(''); setRegError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'LOGIN'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </button>
              
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setLoginError(''); setRegError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'REGISTER'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Créer mon compte</span>
              </button>
            </div>

            {/* ========================================================== */}
            {/* MODE 1: LOGIN */}
            {/* ========================================================== */}
            {mode === 'LOGIN' && (
              <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-150">
                {loginError && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Numéro de Téléphone ou Email <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Ex: 622 12 34 56 ou client@email.com"
                      required
                      className="w-full bg-slate-50 text-slate-900 text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mot de passe <span className="text-slate-400 font-normal">(optionnel si compte direct)</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      className="w-full bg-slate-50 text-slate-900 text-xs pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Connexion en cours...' : 'Se connecter et Continuer'}</span>
                </button>

                <div className="text-center pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-600">
                    Pas encore de compte client ?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('REGISTER')}
                      className="font-black text-amber-700 hover:underline cursor-pointer"
                    >
                      Créer mon compte gratuitement
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* ========================================================== */}
            {/* MODE 2: REGISTER (5 SECTIONS) */}
            {/* ========================================================== */}
            {mode === 'REGISTER' && (
              <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in duration-150">
                
                {regError && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">{regError}</p>
                      {regError.includes('connecter') && (
                        <button
                          type="button"
                          onClick={() => setMode('LOGIN')}
                          className="mt-1 text-xs font-black text-blue-700 underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Cliquer ici pour vous connecter</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* SECTION 1 — INFORMATIONS PERSONNELLES */}
                <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-sm">
                      1
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Informations Personnelles
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Prénom <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="Ex: Mamadou"
                        required
                        className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nom de famille <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="Ex: Diallo"
                        required
                        className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Date de naissance <span className="text-slate-400 font-normal">(facultative)</span>
                      </label>
                      <input
                        type="date"
                        value={regBirthDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setRegBirthDate(e.target.value)}
                        className="w-full bg-white text-slate-900 text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Photo de profil <span className="text-slate-400 font-normal">(facultative)</span>
                      </label>
                      <div className="flex items-center gap-2.5">
                        {regAvatarUrl ? (
                          <div className="relative">
                            <img src={regAvatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-emerald-500" />
                            <button
                              type="button"
                              onClick={() => setRegAvatarUrl(null)}
                              className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-full"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                        <label className="cursor-pointer inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all">
                          <Camera className="w-3.5 h-3.5 text-blue-600" />
                          <span>{regAvatarUrl ? 'Changer' : 'Ajouter'}</span>
                          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2 — COORDONNÉES */}
                <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shadow-sm">
                      2
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Coordonnées & Localisation
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Numéro de téléphone <span className="text-red-600">* (unique)</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-extrabold text-slate-500 select-none">
                          🇬🇳 +224
                        </span>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="622 12 34 56"
                          required
                          className="w-full bg-white text-slate-900 text-xs pl-20 pr-7 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-400 font-bold"
                        />
                        {isPhoneValid && (
                          <Check className="w-4 h-4 text-emerald-600 absolute right-2.5 pointer-events-none" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Adresse e-mail <span className="text-slate-400 font-normal">(facultative)</span>
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="client@exemple.com"
                        className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ville <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={regCity}
                        onChange={(e) => {
                          const c = e.target.value as GuineanCity;
                          setRegCity(c);
                          if (c !== 'Conakry') setRegCommune('');
                        }}
                        className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none transition-all"
                      >
                        {GUINEAN_CITIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {regCity === 'Conakry' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Commune de Conakry <span className="text-slate-400 font-normal">(facultatif)</span>
                        </label>
                        <select
                          value={regCommune}
                          onChange={(e) => setRegCommune(e.target.value as ConakryCommune)}
                          className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none transition-all"
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
                          value={regDistrict}
                          onChange={(e) => setRegDistrict(e.target.value)}
                          placeholder="Ex: Centre-ville"
                          className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3 — SÉCURITÉ */}
                <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
                    <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow-sm">
                      3
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Sécurité du Compte
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mot de passe <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Ex: Achat6"
                          required
                          className="w-full bg-white text-slate-900 text-xs pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Min. 6 caractères avec au moins 1 majuscule (ex : <strong>Achat6</strong>).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirmer le mot de passe <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Répétez le mot de passe"
                          required
                          className={`w-full bg-white text-slate-900 text-xs pl-3.5 pr-8 py-2.5 rounded-xl border focus:outline-none transition-all ${
                            regConfirmPassword && !isPasswordMatching 
                              ? 'border-red-400' 
                              : 'border-slate-200 focus:border-amber-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {regConfirmPassword && (
                    <div className="text-[11px] font-bold">
                      {isPasswordMatching ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Les mots de passe correspondent.
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Les mots de passe ne correspondent pas.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 4 — PRÉFÉRENCES */}
                <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shadow-sm">
                      4
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Préférences
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 gap-2">
                      <p className="text-xs font-bold text-slate-800">Notifications de suivi des commandes</p>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setOrderNotifications(true)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black ${orderNotifications ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderNotifications(false)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black ${!orderNotifications ? 'bg-slate-700 text-white' : 'text-slate-600'}`}
                        >
                          Non
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 gap-2">
                      <p className="text-xs font-bold text-slate-800">Recevoir les offres et promotions</p>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setPromoOffers(true)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black ${promoOffers ? 'bg-amber-500 text-slate-950' : 'text-slate-600'}`}
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromoOffers(false)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black ${!promoOffers ? 'bg-slate-700 text-white' : 'text-slate-600'}`}
                        >
                          Non
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 5 — CONDITIONS */}
                <div className="space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shadow-sm">
                      5
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Conditions
                    </h3>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">
                      J'accepte les conditions d'utilisation et la politique de confidentialité.
                    </span>
                  </label>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={!isRegisterFormValid || isSubmitting}
                    className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                      isRegisterFormValid && !isSubmitting
                        ? 'bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 text-white hover:scale-[1.01] cursor-pointer shadow-emerald-700/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isSubmitting ? 'Création de votre compte...' : 'Créer mon compte'}</span>
                  </button>

                  <div className="text-center pt-1">
                    <p className="text-xs text-slate-600">
                      Vous possédez déjà un compte client ?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('LOGIN')}
                        className="font-black text-blue-700 hover:underline cursor-pointer"
                      >
                        Se connecter ici
                      </button>
                    </p>
                  </div>
                </div>

              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
