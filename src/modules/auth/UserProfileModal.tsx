import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatDate } from '../../lib/utils';
import {
  User, Shield, Lock, CheckCircle2, AlertCircle, Building2,
  Briefcase, Camera, Trash2, Upload, Phone, Mail, Calendar,
  Key, Eye, EyeOff, ShieldCheck, Sparkles, Crown, Check
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'INFO' | 'EDIT' | 'PHOTO' | 'SECURITY';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'INFO'
}) => {
  const {
    currentUser,
    currentTenant,
    currentBranch,
    isSuperAdmin,
    userRoleLabel,
    updateProfile,
    updateAvatar,
    removeAvatar,
    changePassword
  } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'INFO' | 'EDIT' | 'PHOTO' | 'SECURITY'>(defaultTab);

  // Synchronize defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      setSelectedImagePreview(null);
      setSelectedImageBase64(null);
    }
  }, [isOpen, defaultTab]);

  // Form states for Edit Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Form states for Security / Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Photo upload states
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Populate edit fields from currentUser
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
    }
  }, [currentUser, isOpen]);

  if (!currentUser) return null;

  // Handle Photo File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg("Format de fichier non supporté. Veuillez importer une image au format PNG, JPG ou JPEG.");
      return;
    }

    // Validate size (max 5 MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg("L'image sélectionnée est trop volumineuse. La taille maximale autorisée est de 5 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSelectedImagePreview(base64String);
      setSelectedImageBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Save Uploaded Photo
  const handleSavePhoto = () => {
    if (!selectedImageBase64) {
      setErrorMsg("Veuillez sélectionner une image avant de valider.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    const res = updateAvatar(selectedImageBase64);
    setIsSaving(false);

    if (res.success) {
      showToast("Photo de profil mise à jour avec succès !", "success");
      setSuccessMsg("Votre photo de profil a été enregistrée avec succès.");
      setSelectedImagePreview(null);
      setSelectedImageBase64(null);
      setTimeout(() => {
        setActiveTab('INFO');
        setSuccessMsg(null);
      }, 1000);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre photo de profil ?")) return;

    setIsSaving(true);
    setErrorMsg(null);
    const res = removeAvatar();
    setIsSaving(false);

    if (res.success) {
      showToast("Photo de profil supprimée.", "info");
      setSelectedImagePreview(null);
      setSelectedImageBase64(null);
      setSuccessMsg("Votre photo a été retirée. L'avatar par défaut sera utilisé.");
      setTimeout(() => {
        setActiveTab('INFO');
        setSuccessMsg(null);
      }, 1000);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Handle Edit Profile Info
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("Le prénom et le nom sont obligatoires.");
      return;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMsg("Veuillez renseigner une adresse email valide.");
      return;
    }

    setIsSaving(true);
    const res = updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined
    });
    setIsSaving(false);

    if (res.success) {
      showToast("Profil mis à jour avec succès !", "success");
      setSuccessMsg("Vos informations personnelles ont été enregistrées.");
      setTimeout(() => {
        setActiveTab('INFO');
        setSuccessMsg(null);
      }, 1000);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Handle Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!oldPassword.trim()) {
      setErrorMsg("Veuillez saisir votre mot de passe actuel.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMsg("Le nouveau mot de passe doit être différent de l'ancien mot de passe.");
      return;
    }

    setIsSaving(true);
    const res = changePassword(oldPassword, newPassword);
    setIsSaving(false);

    if (res.success) {
      showToast("Mot de passe modifié avec succès !", "success");
      setSuccessMsg("Votre mot de passe a été mis à jour avec succès.");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setActiveTab('INFO');
        setSuccessMsg(null);
      }, 1200);
    } else {
      setErrorMsg(res.message);
    }
  };

  const initials = `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`.toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Mon Profil Utilisateur</h3>
            <p className="text-[11px] text-slate-500 font-normal">Gestion de vos informations personnelles et sécurité du compte</p>
          </div>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <button
            onClick={() => { setActiveTab('INFO'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'INFO'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Mon Profil</span>
          </button>

          <button
            onClick={() => { setActiveTab('EDIT'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'EDIT'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Mes Informations</span>
          </button>

          <button
            onClick={() => { setActiveTab('PHOTO'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PHOTO'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photo de Profil</span>
          </button>

          <button
            onClick={() => { setActiveTab('SECURITY'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'SECURITY'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sécurité</span>
          </button>
        </div>

        {/* Global Notifications within modal */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{successMsg}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: CONSULTATION MON PROFIL */}
        {/* ========================================================================= */}
        {activeTab === 'INFO' && (
          <div className="space-y-4">
            {/* HERO PROFILE CARD */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-lg border border-indigo-900/50 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {/* Profile Avatar / Photo */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-brand-700 border-2 border-white/20 shadow-xl flex items-center justify-center text-2xl font-black text-white">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={`${currentUser.firstName} ${currentUser.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('PHOTO')}
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-md border-2 border-slate-900 transition-all hover:scale-110"
                  title="Changer la photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* User Bio Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-lg font-black tracking-tight">
                    {currentUser.firstName} {currentUser.lastName}
                  </h4>
                  {isSuperAdmin ? (
                    <Badge variant="warning" className="text-[10px] font-black uppercase flex items-center gap-1 bg-amber-500/20 text-amber-300 border-amber-500/40">
                      <Crown className="w-3 h-3" />
                      Super Admin Global
                    </Badge>
                  ) : (
                    <Badge variant="primary" className="text-[10px] font-bold uppercase bg-brand-500/20 text-brand-300 border-brand-500/40">
                      {userRoleLabel}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  @{currentUser.username} • {currentUser.email}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5 text-[11px] text-slate-300">
                  <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-indigo-400" />
                    {isSuperAdmin ? 'Toutes les Agences (Global)' : (currentTenant?.name || 'Agence Active')}
                  </span>
                  {currentUser.phone && (
                    <span className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/10 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {currentUser.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SEPARATION NOTICE: USER PROFILE VS AGENCY SETTINGS */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Indépendance stricte du Profil :</span> Vos informations personnelles (Photo, Nom, Prénom, Téléphone, Email) appartiennent à votre compte utilisateur personnel (<code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.2 rounded font-mono text-[10px]">user_id: {currentUser.id}</code>) et restent identiques même si vous changez d'agence active.
              </div>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-brand-500" />
                  Identité & Coordonnées
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prénom & Nom :</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser.firstName} {currentUser.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email personnel :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Téléphone :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.phone || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  Statut & Permissions
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fonction / Rôle :</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{userRoleLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service / Dépt :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.department || 'Général'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Compte créé le :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.createdAt ? formatDate(currentUser.createdAt) : '01/01/2026'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('PHOTO')}
                  className="text-xs font-semibold"
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                  Modifier la Photo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('SECURITY')}
                  className="text-xs font-semibold"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                  Sécurité du Compte
                </Button>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={() => setActiveTab('EDIT')}
                className="text-xs font-semibold"
              >
                Modifier mes informations
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MODIFIER MES INFORMATIONS PERSONNELLES */}
        {/* ========================================================================= */}
        {activeTab === 'EDIT' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Mettez à jour vos coordonnées personnelles. Les modifications sont enregistrées immédiatement pour votre compte.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Prénom *
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Mamadou"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nom de famille *
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Diallo"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse Email *
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Numéro de téléphone
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+224 620 00 11 22"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('INFO')}
              >
                Annuler
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="font-bold flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PHOTO DE PROFIL POUR TOUS LES UTILISATEURS */}
        {/* ========================================================================= */}
        {activeTab === 'PHOTO' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              Importez une photo personnelle pour personnaliser votre avatar. Formats acceptés : <strong>PNG, JPG, JPEG</strong> (Taille max : 5 Mo).
            </div>

            {/* AVATAR PREVIEW ZONE */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-brand-700 border-2 border-brand-500 shadow-xl flex items-center justify-center text-3xl font-black text-white">
                  {selectedImagePreview ? (
                    <img
                      src={selectedImagePreview}
                      alt="Aperçu nouvelle photo"
                      className="w-full h-full object-cover"
                    />
                  ) : currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt="Photo actuelle"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                {selectedImagePreview && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-emerald-500 text-white font-bold text-[9px] rounded-full shadow-md animate-bounce">
                    Aperçu
                  </span>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {currentUser.firstName} {currentUser.lastName}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedImagePreview
                    ? "Nouvelle photo prête à être validée."
                    : currentUser.avatarUrl
                    ? "Photo de profil active actuellement associée à votre compte."
                    : "Aucune photo définie. L'avatar initiales est affiché par défaut."}
                </p>

                {/* HIDDEN FILE INPUT */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-semibold text-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                    {currentUser.avatarUrl || selectedImagePreview ? "Changer de fichier" : "Importer une photo"}
                  </Button>

                  {(currentUser.avatarUrl || selectedImagePreview) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedImagePreview) {
                          setSelectedImagePreview(null);
                          setSelectedImageBase64(null);
                        } else {
                          handleRemovePhoto();
                        }
                      }}
                      className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {selectedImagePreview ? "Annuler l'aperçu" : "Supprimer la photo"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedImagePreview(null);
                  setSelectedImageBase64(null);
                  setActiveTab('INFO');
                }}
              >
                Retour
              </Button>

              {selectedImageBase64 && (
                <Button
                  variant="primary"
                  onClick={handleSavePhoto}
                  disabled={isSaving}
                  className="font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? "Enregistrement..." : "Valider et Enregistrer la Photo"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SÉCURITÉ DU COMPTE & CHANGEMENT DE MOT DE PASSE */}
        {/* ========================================================================= */}
        {activeTab === 'SECURITY' && (
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Politique de Sécurité du Mot de Passe :</p>
                <p className="text-[11px] mt-0.5">
                  Choisissez un mot de passe robuste d'au moins 6 caractères. Vos identifiants ne sont jamais stockés en clair ni divulgués.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ancien mot de passe actuel *
              </label>
              <div className="relative">
                <Input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nouveau mot de passe *
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirmer le nouveau mot de passe *
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('INFO')}
              >
                Retour
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="font-bold flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                {isSaving ? "Modification..." : "Enregistrer le Nouveau Mot de Passe"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
