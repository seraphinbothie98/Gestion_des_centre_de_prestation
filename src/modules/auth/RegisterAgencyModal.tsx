import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { isValidPhoneNumber } from '../../lib/phoneValidation';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ActivityType, Currency } from '../../types';
import {
  Building2, User as UserIcon, Lock, Mail, Phone, MapPin,
  Sparkles, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck,
  Store, Briefcase, UtensilsCrossed, ShoppingBag, Eye, EyeOff, AlertCircle
} from 'lucide-react';

interface RegisterAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterAgencyModal: React.FC<RegisterAgencyModalProps> = ({ isOpen, onClose }) => {
  const { registerAgency } = useAuth();
  const { showToast } = useNotification();

  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // STEP 1: Responsable
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // STEP 2: Agence
  const [agencyName, setAgencyName] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('SERVICE_CENTER');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [agencyCity, setAgencyCity] = useState('');
  const [currency, setCurrency] = useState<Currency>('GNF');

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("Veuillez renseigner votre nom et prénom.");
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg("Veuillez saisir une adresse e-mail valide.");
      return;
    }
    if (!phone.trim() || !isValidPhoneNumber(phone, { allowEmpty: false, required: true })) {
      setErrorMsg("Veuillez saisir un numéro de téléphone valide sans lettres ni caractères interdits.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!agencyName.trim()) {
      setErrorMsg("Veuillez saisir le nom de votre agence ou établissement.");
      return;
    }

    if (agencyPhone.trim() && !isValidPhoneNumber(agencyPhone, { allowEmpty: true })) {
      setErrorMsg("Le numéro de téléphone professionnel de l'agence est invalide.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = registerAgency({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        agencyName: agencyName.trim(),
        activityType,
        agencyPhone: agencyPhone.trim() || phone.trim(),
        agencyAddress: agencyAddress.trim(),
        agencyCity: agencyCity.trim(),
        currency
      });

      if (res.success) {
        showToast(
          "Agence Créée avec Succès !",
          `Bienvenue dans ${res.tenant?.name}. Votre période d'essai gratuite de 15 jours est immédiatement activée.`,
          "SUCCESS"
        );
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Création Autonome d'une Nouvelle Agence"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Trial Badge Header */}
        <div className="p-3.5 bg-gradient-to-r from-brand-500/10 via-amber-500/10 to-emerald-500/10 dark:from-brand-950/40 dark:via-amber-950/40 dark:to-emerald-950/40 border border-brand-200 dark:border-brand-800 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-xs font-black text-slate-900 dark:text-white block">
                Licence d'Essai Gratuite de 15 Jours Incluse
              </strong>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Accès immédiat et sans engagement à toutes les fonctionnalités
              </span>
            </div>
          </div>
          <Badge variant="success" size="sm" className="font-black">
            0 GNF
          </Badge>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
            step === 1
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
          }`}>
            <span>1. Responsable</span>
            {step === 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
          <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-700" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
            step === 2
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <span>2. Établissement</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: FORMULAIRE RESPONSABLE */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Prénom du Responsable *
                </label>
                <Input
                  type="text"
                  placeholder="ex: Mamadou"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nom de Famille *
                </label>
                <Input
                  type="text"
                  placeholder="ex: Diallo"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Adresse E-mail (Sert d'identifiant) *
                </label>
                <Input
                  type="email"
                  placeholder="responsable@agence.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <PhoneInput
                  label="Numéro de Téléphone *"
                  placeholder="+224 620 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mot de Passe (Min 6 car.) *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Confirmation du Mot de Passe *
                </label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                icon={ArrowRight}
                className="w-full sm:w-auto font-bold bg-brand-600 hover:bg-brand-700"
              >
                Suivant : Configurer l'Agence
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: FORMULAIRE AGENCE */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nom de l'Agence ou de l'Entreprise *
              </label>
              <Input
                type="text"
                placeholder="ex: Centre Multi-Services Kaloum, Horizon Matériaux..."
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                required
                className="font-extrabold text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Type d'Activité Principale *
                </label>
                <Select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as ActivityType)}
                >
                  <option value="SERVICE_CENTER">📄 Centre de Prestations & Reprographie</option>
                  <option value="RETAIL_STORE">🏬 Boutique & Magasin de Détail</option>
                  <option value="RESTAURANT">🍽️ Restaurant & Salon de Thé</option>
                  <option value="WHOLESALE">📦 Grossiste & Distribution</option>
                  <option value="OTHER">🏢 Autre Activité Professionnelle</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Devise d'Exploitation
                </label>
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  <option value="GNF">GNF — Franc Guinéen</option>
                  <option value="XOF">XOF — Franc CFA (UEMOA)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="USD">USD — Dollar ($)</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <PhoneInput
                  label="Téléphone Professionnel (Optionnel)"
                  placeholder="ex: +224 622 00 11 22"
                  value={agencyPhone}
                  onChange={(e) => setAgencyPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ville / Commune
                </label>
                <Input
                  type="text"
                  placeholder="ex: Conakry (Kaloum)"
                  value={agencyCity}
                  onChange={(e) => setAgencyCity(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Adresse Complète
              </label>
              <Input
                type="text"
                placeholder="ex: Immeuble Horizon, 2ème étage, Avenue de la République"
                value={agencyAddress}
                onChange={(e) => setAgencyAddress(e.target.value)}
              />
            </div>

            {/* Recap info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Activation Instantanée
              </div>
              <p className="text-[11px]">
                En validant, votre agence sera immédiatement active avec un rôle Administrateur et 15 jours d'essai sans frais.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                icon={ArrowLeft}
                onClick={() => setStep(1)}
              >
                Retour
              </Button>

              <Button
                type="submit"
                variant="primary"
                icon={Sparkles}
                disabled={isSubmitting}
                className="font-extrabold bg-brand-600 hover:bg-brand-700"
              >
                {isSubmitting ? "Création en cours..." : "Créer mon Agence & Démarrer l'Essai (15j)"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
