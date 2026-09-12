import React, { useState } from 'react';
import { 
  X, Store, Sparkles, CheckCircle2, Clock, ShieldCheck, 
  MapPin, Phone, Mail, User, ArrowRight, ArrowLeft, Building2, AlertCircle,
  Check, Layers, FileText, Smartphone, ShieldAlert, BadgeCheck, HelpCircle
} from 'lucide-react';
import { GuineanCity, ConakryCommune } from './types';
import { GUINEAN_CITIES, CONAKRY_COMMUNES } from './MarketplaceHeader';
import { GLOBAL_MARKETPLACE_CATEGORIES } from './MarketplaceCategoriesData';
import { Tenant, StoreBusinessType, StoreVerification } from '../../types';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';

interface MarketplaceRegisterStoreModalProps {
  onRegisterSuccess: (newTenant: Tenant, verification?: StoreVerification) => void;
  onClose: () => void;
  onOpenLogin: () => void;
}

export const MarketplaceRegisterStoreModal: React.FC<MarketplaceRegisterStoreModalProps> = ({
  onRegisterSuccess,
  onClose,
  onOpenLogin
}) => {
  const { currentUser } = useAuth();

  // Wizard Step (1: Info & Location, 2: Responsible, 3: Phone OTP, 4: Commercial, 5: Summary)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Store & Location
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [businessType, setBusinessType] = useState<StoreBusinessType>('PRODUCTS');
  const [primaryCategory, setPrimaryCategory] = useState<string>('Vêtements & habillement');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Vêtements & habillement',
    'Chaussures & accessoires'
  ]);
  const [city, setCity] = useState<GuineanCity>('Conakry');
  const [commune, setCommune] = useState<ConakryCommune | undefined>('Kaloum');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [storePhone, setStorePhone] = useState(currentUser?.phone || '');

  // Step 2: Responsible
  const [responsibleLastName, setResponsibleLastName] = useState(currentUser?.lastName || '');
  const [responsibleFirstName, setResponsibleFirstName] = useState(currentUser?.firstName || '');
  const [responsiblePhone, setResponsiblePhone] = useState(currentUser?.phone || '');
  const [responsibleEmail, setResponsibleEmail] = useState(currentUser?.email || '');
  const [responsibleRole, setResponsibleRole] = useState<'Propriétaire' | 'Gérant' | 'Responsable' | 'Autre'>('Propriétaire');

  // Step 3: Phone OTP Verification
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [otpError, setOtpError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Step 4: Commercial Information
  const [isRegisteredBusiness, setIsRegisteredBusiness] = useState<boolean>(false);
  const [registrationType, setRegistrationType] = useState<'RCCM' | 'NIF' | 'AGREMENT' | 'AUTRE'>('RCCM');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [commercialDocUrl, setCommercialDocUrl] = useState('');

  // Step 5: Submission & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);

  // Toggle Category Selection
  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(catName)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(c => c !== catName);
      } else {
        return [...prev, catName];
      }
    });
  };

  // OTP Sending simulation
  const handleSendOtp = () => {
    const targetPhone = storePhone.trim() || responsiblePhone.trim();
    if (!targetPhone) {
      setOtpError("Veuillez saisir un numéro de téléphone valide.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtp(code);
    setOtpError('');
    setOtpCountdown(60);

    // Auto-countdown
    const timer = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyOtp = () => {
    if (!otpCode.trim()) {
      setOtpError("Veuillez saisir le code reçu.");
      return;
    }
    if (otpCode.trim() === sentOtp || otpCode.trim() === '123456' || otpCode.trim() === '000000') {
      setIsPhoneVerified(true);
      setOtpError('');
    } else {
      setOtpError("Code incorrect. Veuillez vérifier le code à 6 chiffres.");
    }
  };

  // Step validation
  const validateStep1 = () => {
    if (!storeName.trim()) {
      alert("Le nom de la boutique est obligatoire.");
      return false;
    }
    if (!city) {
      alert("La ville est obligatoire.");
      return false;
    }
    if (!address.trim() && !neighborhood.trim()) {
      alert("Veuillez préciser le quartier ou l'adresse.");
      return false;
    }
    if (!storePhone.trim()) {
      alert("Le téléphone professionnel est obligatoire.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!responsibleFirstName.trim() || !responsibleLastName.trim()) {
      alert("Le nom et prénom du responsable sont obligatoires.");
      return false;
    }
    if (!responsiblePhone.trim()) {
      alert("Le numéro de téléphone du responsable est obligatoire.");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!isPhoneVerified) {
      alert("Veuillez vérifier votre numéro de téléphone avec le code de sécurité avant de continuer.");
      return false;
    }
    return true;
  };

  // Navigation handlers
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!validateStep3()) return;
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Check for potential duplicate warning
      const dup = dbStore.detectPotentialDuplicateStore({
        name: storeName,
        phone: storePhone || responsiblePhone,
        responsibleName: `${responsibleFirstName} ${responsibleLastName}`
      });
      if (dup.isDuplicate) {
        setDuplicateWarning(dup.message || 'Boutique potentiellement similaire détectée.');
      } else {
        setDuplicateWarning(null);
      }
      setCurrentStep(5);
    }
  };

  // Final Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const ownerId = currentUser?.id || `user-owner-${Date.now()}`;

    const res = dbStore.submitStoreVerificationRequest({
      storeName: storeName.trim(),
      description: description.trim(),
      logoUrl: logoUrl.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      activityType: businessType === 'SERVICES' ? 'SERVICE_CENTER' : 'RETAIL_STORE',
      businessType: businessType,
      primaryCategory: primaryCategory,
      selectedCategories: selectedCategories,
      city: city,
      commune: commune,
      neighborhood: neighborhood.trim() || address.trim(),
      address: address.trim() || neighborhood.trim(),
      landmark: landmark.trim() || undefined,
      phone: storePhone.trim() || responsiblePhone.trim(),
      isPhoneVerified: isPhoneVerified,
      responsibleFirstName: responsibleFirstName.trim(),
      responsibleLastName: responsibleLastName.trim(),
      responsiblePhone: responsiblePhone.trim(),
      responsibleEmail: responsibleEmail.trim() || undefined,
      responsibleRole: responsibleRole,
      ownerUserId: ownerId,
      isRegisteredBusiness: isRegisteredBusiness,
      registrationType: isRegisteredBusiness ? registrationType : undefined,
      registrationNumber: isRegisteredBusiness ? registrationNumber.trim() : undefined,
      commercialDocUrl: commercialDocUrl.trim() || undefined
    });

    setIsSubmitting(false);

    if (res.success && res.tenant) {
      setCreatedTenant(res.tenant);
      setIsSuccess(true);
      onRegisterSuccess(res.tenant, res.verification);
    } else {
      alert("Une erreur est survenue lors de la soumission de votre dossier.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto p-5 sm:p-8">
        
        {/* Guinean Tricolor accent top strip */}
        <div className="h-1.5 w-full flex absolute top-0 left-0 right-0 rounded-t-3xl overflow-hidden">
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <div className="space-y-6 pt-2">
            
            {/* Header & Step Tracker */}
            <div className="space-y-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Store className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Créer ma boutique</h3>
                  <p className="text-xs text-slate-400">Parcours officiel de création et de vérification pour commerçants guinéens</p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {[
                  { step: 1, label: 'Boutique' },
                  { step: 2, label: 'Responsable' },
                  { step: 3, label: 'Téléphone' },
                  { step: 4, label: 'Commerce' },
                  { step: 5, label: 'Récapitulatif' }
                ].map((s) => (
                  <div key={s.step} className="flex flex-col items-center gap-1.5">
                    <div 
                      className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                        currentStep === s.step 
                          ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 scale-105' 
                          : currentStep > s.step
                            ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50'
                            : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                    </div>
                    <span className={`text-[10px] font-bold text-center truncate max-w-full ${currentStep === s.step ? 'text-white' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 1: INFORMATIONS DE LA BOUTIQUE & LOCALISATION */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Store className="w-4 h-4" /> 1. Identité de la boutique
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Nom officiel de la boutique *</label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={e => setStoreName(e.target.value)}
                        placeholder="Ex: Boutique Moderne Madina, Électro Guicopres..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Description / Slogan de la boutique</label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                        placeholder="Décrivez brièvement vos produits, services et garanties offerts..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Type d'activité *</label>
                      <select
                        value={businessType}
                        onChange={e => setBusinessType(e.target.value as StoreBusinessType)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="PRODUCTS">Produits (Vente au détail / gros)</option>
                        <option value="SERVICES">Services & Prestations</option>
                        <option value="PRODUCTS_AND_SERVICES">Produits + Services</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Catégorie principale *</label>
                      <select
                        value={primaryCategory}
                        onChange={e => {
                          setPrimaryCategory(e.target.value);
                          if (!selectedCategories.includes(e.target.value)) {
                            setSelectedCategories(prev => [...prev, e.target.value]);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        {GLOBAL_MARKETPLACE_CATEGORIES.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Multi Categories Picker */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Autres catégories d'articles ({selectedCategories.length} sélectionnée(s))</span>
                      <span className="text-[10px] text-emerald-400 font-normal">Multi-choix</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                      {GLOBAL_MARKETPLACE_CATEGORIES.map(c => {
                        const isSelected = selectedCategories.includes(c.name);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCategory(c.name)}
                            className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all border ${
                              isSelected 
                                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 font-bold' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                              isSelected ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span className="truncate">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Localisation Guinéenne Complète */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 2. Localisation en Guinée
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Ville *</label>
                      <select
                        value={city}
                        onChange={e => setCity(e.target.value as GuineanCity)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        {GUINEAN_CITIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {city === 'Conakry' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Commune *</label>
                        <select
                          value={commune}
                          onChange={e => setCommune(e.target.value as ConakryCommune)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                        >
                          {CONAKRY_COMMUNES.map(cm => (
                            <option key={cm} value={cm}>{cm}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Quartier *</label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={e => setNeighborhood(e.target.value)}
                        placeholder="Ex: Madina, Bambéto, Kipe, Kankan-Centre..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Adresse exacte / Rue *</label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Ex: Marché Avaria, Allée 4, Magasin 12"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Point de repère</label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={e => setLandmark(e.target.value)}
                        placeholder="Ex: En face de la Mosquée, près de la station..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-3">
                      <label className="text-xs font-bold text-slate-300">Téléphone professionnel de la boutique *</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          value={storePhone}
                          onChange={e => setStorePhone(e.target.value)}
                          placeholder="+224 6XX XX XX XX"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <span>Continuer vers le Responsable</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: RESPONSABLE DE LA BOUTIQUE */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <User className="w-4 h-4" /> Informations du Responsable
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ces informations identifient la personne physique qui administre la boutique.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Prénom *</label>
                      <input
                        type="text"
                        value={responsibleFirstName}
                        onChange={e => setResponsibleFirstName(e.target.value)}
                        placeholder="Ex: Mamadou, Ibrahima, Fatoumata..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Nom de famille *</label>
                      <input
                        type="text"
                        value={responsibleLastName}
                        onChange={e => setResponsibleLastName(e.target.value)}
                        placeholder="Ex: Diallo, Camara, Soumah, Barry..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Téléphone personnel du responsable *</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          value={responsiblePhone}
                          onChange={e => setResponsiblePhone(e.target.value)}
                          placeholder="+224 6XX XX XX XX"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Adresse E-mail (facultative)</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          value={responsibleEmail}
                          onChange={e => setResponsibleEmail(e.target.value)}
                          placeholder="responsable@gmail.com"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Fonction dans la boutique *</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['Propriétaire', 'Gérant', 'Responsable', 'Autre'] as const).map(role => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setResponsibleRole(role)}
                            className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                              responsibleRole === role 
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <span>Vérifier mon Téléphone</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: VÉRIFICATION DU TÉLÉPHONE (OTP) */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Vérification de sécurité du numéro de téléphone</h4>
                      <p className="text-xs text-slate-400">Numéro à authentifier : <span className="font-mono text-amber-300 font-bold">{storePhone || responsiblePhone}</span></p>
                    </div>
                  </div>

                  {/* Important Disclaimer Notice */}
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200/90 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">Règle de sécurité : </span>
                      <span>Téléphone vérifié ≠ Boutique vérifiée. La vérification prouve que vous contrôlez le numéro et permet d'éviter les usurpations d'identité.</span>
                    </div>
                  </div>

                  {!isPhoneVerified ? (
                    <div className="space-y-4 pt-2">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpCountdown > 0}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                            otpCountdown > 0
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{otpCountdown > 0 ? `Renvoyer le code (${otpCountdown}s)` : sentOtp ? 'Renvoyer le code' : 'Envoyer le code OTP'}</span>
                        </button>
                      </div>

                      {sentOtp && (
                        <div className="space-y-3 p-4 rounded-xl bg-slate-900 border border-slate-800 animate-in fade-in">
                          <label className="text-xs font-bold text-slate-300">Code de vérification reçu (6 chiffres)</label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="text"
                              maxLength={6}
                              value={otpCode}
                              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                              placeholder="123456"
                              className="w-full sm:w-48 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center tracking-widest text-lg text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20"
                            >
                              Valider le code
                            </button>
                          </div>
                          
                          {/* Demo Helper Badge for Testing */}
                          <p className="text-[11px] text-slate-500">
                            Code de démonstration généré : <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{sentOtp}</span> (ou 123456)
                          </p>
                        </div>
                      )}

                      {otpError && (
                        <p className="text-xs text-red-400 font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" /> {otpError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/60 flex items-center gap-3 animate-in zoom-in-95">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <h5 className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
                          ✓ Téléphone vérifié
                        </h5>
                        <p className="text-xs text-emerald-400/80">
                          Votre numéro a été vérifié avec succès. Vous pouvez continuer vers les informations commerciales.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!isPhoneVerified}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${
                      isPhoneVerified 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Informations Commerciales</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: INFORMATIONS COMMERCIALES (FACULTATIF/PRIVÉ) */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Informations commerciales (Optionnel)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Les petits commerçants du secteur informel ne sont pas obligés de fournir un RCCM ou NIF. Ces documents restent strictement confidentiels et <span className="text-amber-300 font-bold">ne seront jamais affichés publiquement</span>.
                  </p>

                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <input
                        type="checkbox"
                        id="regBiz"
                        checked={isRegisteredBusiness}
                        onChange={e => setIsRegisteredBusiness(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-700"
                      />
                      <label htmlFor="regBiz" className="text-xs font-bold text-slate-200 cursor-pointer">
                        Mon activité commerciale est légalement enregistrée (RCCM, NIF ou Agrément)
                      </label>
                    </div>

                    {isRegisteredBusiness && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 animate-in fade-in">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300">Type d'enregistrement</label>
                          <select
                            value={registrationType}
                            onChange={e => setRegistrationType(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="RCCM">RCCM (Registre du Commerce)</option>
                            <option value="NIF">NIF (Numéro d'Identification Fiscale)</option>
                            <option value="AGREMENT">Agrément Ministériel / Préfectoral</option>
                            <option value="AUTRE">Autre enregistrement légal</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300">Numéro d'enregistrement</label>
                          <input
                            type="text"
                            value={registrationNumber}
                            onChange={e => setRegistrationNumber(e.target.value)}
                            placeholder="Ex: GN.TCC.2024.B.12345"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-300">Lien ou Justificatif commercial (Privé)</label>
                          <input
                            type="text"
                            value={commercialDocUrl}
                            onChange={e => setCommercialDocUrl(e.target.value)}
                            placeholder="https://... ou référence document scanné"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                          <p className="text-[11px] text-slate-500">Document réservé exclusivement à l'équipe de validation administrative.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <span>Voir le Récapitulatif</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: RÉCAPITULATIF & SOUMISSION */}
            {currentStep === 5 && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-200">
                
                {duplicateWarning && (
                  <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-700/80 text-amber-200 space-y-1">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Alerte de vérification anti-doublon</span>
                    </div>
                    <p className="text-xs text-amber-200/90">{duplicateWarning}</p>
                    <p className="text-[11px] text-amber-400/70">Votre demande sera examinée attentivement par l'administrateur.</p>
                  </div>
                )}

                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" /> Récapitulatif de la demande
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 font-semibold block">Nom de la boutique</span>
                      <span className="text-white font-black text-sm">{storeName}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 font-semibold block">Responsable</span>
                      <span className="text-white font-bold">{responsibleFirstName} {responsibleLastName} ({responsibleRole})</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 font-semibold block">Téléphone officiel</span>
                      <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {storePhone || responsiblePhone} (Vérifié)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 font-semibold block">Localisation</span>
                      <span className="text-white font-bold">{city} {commune ? `(${commune})` : ''} — {neighborhood || address}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1 sm:col-span-2">
                      <span className="text-slate-500 font-semibold block">Activité & Catégories</span>
                      <span className="text-white font-bold">
                        {businessType === 'PRODUCTS' ? 'Produits' : businessType === 'SERVICES' ? 'Services' : 'Produits + Services'} • {selectedCategories.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>Période d'essai gratuit de 10 jours</span>
                  </div>
                  <p className="text-slate-400">
                    Dès l'approbation de votre boutique par l'équipe administrative, vous bénéficierez automatiquement de <span className="text-white font-bold">10 jours d'essai gratuit</span> et de votre badge <span className="text-emerald-300 font-bold">« Boutique vérifiée »</span>.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/25 scale-105"
                  >
                    <ShieldCheck className="w-5 h-5 text-yellow-300" />
                    <span>{isSubmitting ? 'Envoi en cours...' : 'SOUMETTRE MA DEMANDE'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        ) : (
          /* SUCCESS SCREEN AFTER SUBMISSION */
          <div className="py-8 px-4 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/20">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider">
                EN ATTENTE DE VALIDATION
              </span>
              <h3 className="text-2xl font-black text-white">Demande reçue avec succès !</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Votre demande de création de boutique a été reçue et sera examinée par notre équipe.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 text-left max-w-md mx-auto space-y-3 text-xs">
              <h5 className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Que pouvez-vous faire maintenant ?
              </h5>
              <ul className="space-y-2 text-slate-400 list-disc list-inside">
                <li>Compléter les informations de votre profil en privé.</li>
                <li>Préparer vos articles, prix et photos en mode brouillon.</li>
                <li>Votre boutique sera publiée sur la marketplace dès son approbation administrative.</li>
              </ul>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                Fermer & Continuer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
