import React, { useState } from 'react';
import { 
  X, User, Shield, Lock, LogOut, Camera, Trash2, Check, AlertCircle, 
  MapPin, Phone, Mail, Sparkles, Smartphone, Laptop, Globe, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GUINEAN_CITIES, CONAKRY_COMMUNES } from './MarketplaceHeader';
import { GuineanCity, ConakryCommune } from './types';

interface MarketplaceClientAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const MarketplaceClientAccountModal: React.FC<MarketplaceClientAccountModalProps> = ({
  isOpen,
  onClose,
  onLogout
}) => {
  const { currentUser, updateProfile, updateAvatar, removeAvatar, changePassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'logout'>('profile');

  // Profile Form State
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [city, setCity] = useState<string>(currentUser?.city || 'Conakry');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatarUrl || null);

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Active Sessions Mock Data
  const [otherSessionsCleared, setOtherSessionsCleared] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedbackMsg({ type: 'error', text: 'La photo est trop lourde (max 2 Mo).' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      updateAvatar(base64);
      setFeedbackMsg({ type: 'success', text: 'Photo de profil mise à jour !' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    removeAvatar();
    setFeedbackMsg({ type: 'success', text: 'Photo de profil supprimée (avatar par défaut rétabli).' });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (!firstName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Le prénom est obligatoire.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        department: city.trim()
      });

      if (res.success) {
        setFeedbackMsg({ type: 'success', text: 'Informations personnelles enregistrées avec succès !' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Erreur lors de la mise à jour.' });
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Une erreur imprévue est survenue.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (!oldPassword) {
      setFeedbackMsg({ type: 'error', text: 'Veuillez saisir votre mot de passe actuel.' });
      return;
    }

    if (newPassword.length < 6) {
      setFeedbackMsg({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedbackMsg({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = changePassword(oldPassword, newPassword);
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: 'Mot de passe modifié avec succès !' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setFeedbackMsg({ type: 'error', text: res.message || 'Échec de la modification du mot de passe.' });
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Une erreur est survenue.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectOtherSessions = () => {
    setOtherSessionsCleared(true);
    setFeedbackMsg({ type: 'success', text: 'Toutes les autres sessions connectées ont été déconnectées.' });
  };

  const userInitials = `${currentUser.firstName?.[0] || 'C'}${currentUser.lastName?.[0] || 'M'}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Header with Guinea Tri-color banner */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={currentUser.firstName}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-lg flex items-center justify-center border-2 border-emerald-500/50 shadow-md">
                  {userInitials}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {currentUser.firstName} {currentUser.lastName}
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Client Vérifié
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {currentUser.phone || currentUser.email || 'Compte Marketplace'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-4 sm:px-6">
          <button
            onClick={() => { setActiveTab('profile'); setFeedbackMsg(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Mon Profil</span>
          </button>

          <button
            onClick={() => { setActiveTab('security'); setFeedbackMsg(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'security'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Sécurité des connexions</span>
          </button>

          <button
            onClick={() => { setActiveTab('logout'); setFeedbackMsg(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'logout'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* Profile Photo Management */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-2xl flex items-center justify-center border-2 border-emerald-500/50 shadow-md">
                      {userInitials}
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h4 className="text-sm font-bold text-white">Photo de profil</h4>
                  <p className="text-xs text-slate-400">
                    Format JPG, PNG ou WebP. Taille maximale : 2 Mo.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer transition-all">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{avatarPreview ? 'Changer la photo' : 'Ajouter une photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                    </label>

                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Prénom <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nom de famille
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Numéro de Téléphone (Guinée)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+224 620 00 00 00"
                      className="w-full bg-slate-950 text-white text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Adresse Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="client@exemple.com"
                      className="w-full bg-slate-950 text-white text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Ville
                  </label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none transition-all"
                  >
                    {GUINEAN_CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Adresse de Livraison / Quartier
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="ex: Kipé, Centre Commercial"
                      className="w-full bg-slate-950 text-white text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Account Protection Card */}
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Protection du compte active</h4>
                    <p className="text-xs text-slate-400">
                      Verrouillage intelligent anti-brute-force et sessions chiffrées.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Sécurisé
                </span>
              </div>

              {/* Active Sessions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Sessions & Appareils Connectés
                  </h4>
                  {!otherSessionsCleared && (
                    <button
                      type="button"
                      onClick={handleDisconnectOtherSessions}
                      className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      Déconnecter les autres sessions
                    </button>
                  )}
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Session Actuelle (Navigateur Web)</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Dernière activité : À l'instant • Conakry, Guinée
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Cette session
                  </span>
                </div>

                {!otherSessionsCleared && (
                  <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-slate-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-300">Application Mobile / Android</span>
                        <p className="text-[11px] text-slate-500">
                          Dernière connexion : Il y a 2 jours • Conakry
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectOtherSessions}
                      className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors"
                    >
                      Déconnecter
                    </button>
                  </div>
                )}
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Changer de mot de passe
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-yellow-400 focus:outline-none transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Au moins 6 caractères"
                      className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-yellow-400 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez à l'identique"
                      className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-yellow-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm shadow-md transition-all flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isSaving ? 'Mise à jour...' : 'Modifier mon mot de passe'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: LOGOUT */}
          {activeTab === 'logout' && (
            <div className="p-6 bg-slate-950/60 rounded-2xl border border-red-500/30 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <LogOut className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-white">
                  Voulez-vous vous déconnecter de votre compte ?
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Votre session sera fermée en toute sécurité. Vous serez immédiatement redirigé vers l'accueil public du marketplace en mode visiteur. Votre panier en cours sera conservé.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700"
                >
                  Rester connecté
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter maintenant</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
