import React, { useState, useMemo } from 'react';
import { 
  Store, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertCircle, 
  HelpCircle, Eye, Search, Filter, RefreshCw, Clock, MapPin, Phone, 
  Mail, User, Building2, FileText, Calendar, Check, X, AlertTriangle,
  BadgeCheck, MessageSquare, ExternalLink, ArrowRight, Layers
} from 'lucide-react';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Tenant, StoreVerification, StoreVerificationStatus, StoreRejectionReason } from '../../types';

interface AdminStoresVerificationViewProps {
  onNavigateToStore?: (storeId: string) => void;
}

const PREDEFINED_REJECTION_REASONS: StoreRejectionReason[] = [
  'Informations insuffisantes',
  'Informations incohérentes',
  'Boutique déjà existante',
  'Activité non conforme',
  'Tentative d\'usurpation',
  'Autre'
];

export const AdminStoresVerificationView: React.FC<AdminStoresVerificationViewProps> = ({
  onNavigateToStore
}) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  // Search and status filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Review Modal State
  const [selectedVerification, setSelectedVerification] = useState<StoreVerification | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  // Action Modals
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [isRequestInfoOpen, setIsRequestInfoOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Form states for Admin Actions
  const [requestedInfoText, setRequestedInfoText] = useState('');
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<StoreRejectionReason>('Informations insuffisantes');
  const [rejectionPublicNote, setRejectionPublicNote] = useState('');
  const [rejectionInternalNotes, setRejectionInternalNotes] = useState('');

  const [dbVersion, setDbVersion] = useState(0);

  // Subscribe to db changes
  React.useEffect(() => {
    const unsub = dbStore.subscribe(() => setDbVersion(v => v + 1));
    return unsub;
  }, []);

  const verifications = useMemo(() => {
    return dbStore.getStoreVerifications();
  }, [dbVersion]);

  const allTenants = useMemo(() => {
    return dbStore.getTenants(true);
  }, [dbVersion]);

  // Filtered List
  const filteredList = useMemo(() => {
    return verifications.filter(v => {
      const tenant = allTenants.find(t => t.id === v.storeId);
      
      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'EN_ATTENTE' && v.status !== 'EN_ATTENTE') return false;
        if (statusFilter === 'EN_REVISION' && v.status !== 'EN_REVISION') return false;
        if (statusFilter === 'INFORMATIONS_DEMANDEES' && v.status !== 'INFORMATIONS_DEMANDEES') return false;
        if (statusFilter === 'APPROUVE' && v.status !== 'APPROUVE') return false;
        if (statusFilter === 'REFUSE' && v.status !== 'REFUSE') return false;
        if (statusFilter === 'SUSPENDUE' && tenant?.commercialStatus !== 'SUSPENDUE' && tenant?.status !== 'SUSPENDED') return false;
        if (statusFilter === 'ACTIVE' && tenant?.commercialStatus !== 'ACTIVE' && tenant?.commercialStatus !== 'ESSAI_GRATUIT') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const storeName = (v.storeName || tenant?.name || '').toLowerCase();
        const submitter = (v.submittedByName || tenant?.responsibleName || '').toLowerCase();
        const phone = (v.submittedByPhone || tenant?.phone || '').toLowerCase();
        const city = (tenant?.city || '').toLowerCase();
        const commune = (tenant?.commune || '').toLowerCase();

        return storeName.includes(q) || submitter.includes(q) || phone.includes(q) || city.includes(q) || commune.includes(q);
      }

      return true;
    });
  }, [verifications, allTenants, statusFilter, searchQuery]);

  // Open Detailed Review Modal
  const handleOpenReview = (verif: StoreVerification) => {
    const tenant = allTenants.find(t => t.id === verif.storeId);
    setSelectedVerification(verif);
    setSelectedTenant(tenant || null);
  };

  // 1. APPROVE ACTION
  const handleConfirmApprove = () => {
    if (!selectedVerification) return;
    const reviewerId = currentUser?.id || 'u-superadmin';
    const reviewerName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Super Administrateur';

    const res = dbStore.approveStoreVerification(selectedVerification.id, reviewerId, reviewerName);
    if (res.success) {
      showToast('Boutique Approuvée 🟢', res.message, 'SUCCESS');
      setIsApproveConfirmOpen(false);
      setSelectedVerification(null);
      setSelectedTenant(null);
    } else {
      showToast('Erreur', res.message, 'DANGER');
    }
  };

  // 2. REQUEST INFO ACTION
  const handleConfirmRequestInfo = () => {
    if (!selectedVerification) return;
    if (!requestedInfoText.trim()) {
      showToast('Champ Requis ⚠️', 'Veuillez préciser le motif des informations complémentaires requises.', 'WARNING');
      return;
    }
    const reviewerId = currentUser?.id || 'u-superadmin';
    const reviewerName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Super Administrateur';

    const res = dbStore.requestStoreInformation(selectedVerification.id, requestedInfoText, reviewerId, reviewerName);
    if (res.success) {
      showToast('Demande d\'Informations 📩', res.message, 'INFO');
      setIsRequestInfoOpen(false);
      setRequestedInfoText('');
      setSelectedVerification(null);
      setSelectedTenant(null);
    } else {
      showToast('Erreur', res.message, 'DANGER');
    }
  };

  // 3. REJECT ACTION
  const handleConfirmReject = () => {
    if (!selectedVerification) return;
    const reviewerId = currentUser?.id || 'u-superadmin';
    const reviewerName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Super Administrateur';

    const res = dbStore.rejectStoreVerification(
      selectedVerification.id,
      selectedRejectionReason,
      rejectionPublicNote,
      rejectionInternalNotes,
      reviewerId,
      reviewerName
    );

    if (res.success) {
      showToast('Boutique Refusée 🛑', res.message, 'DANGER');
      setIsRejectModalOpen(false);
      setRejectionPublicNote('');
      setRejectionInternalNotes('');
      setSelectedVerification(null);
      setSelectedTenant(null);
    } else {
      showToast('Erreur', res.message, 'DANGER');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Administration & Conformité</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Boutiques — Vérification & Validation
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Examinez, authentifiez et validez les demandes d'ouverture de boutiques pour garantir une marketplace sécurisée.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 px-4 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">En Attente</span>
              <span className="text-xl font-black text-amber-400">
                {verifications.filter(v => v.status === 'EN_ATTENTE').length}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 px-4 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Approuvées</span>
              <span className="text-xl font-black text-emerald-400">
                {verifications.filter(v => v.status === 'APPROUVE').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'EN_ATTENTE', label: 'En attente' },
            { id: 'EN_REVISION', label: 'En révision' },
            { id: 'INFORMATIONS_DEMANDEES', label: 'Infos demandées' },
            { id: 'APPROUVE', label: 'Approuvées' },
            { id: 'REFUSE', label: 'Refusées' },
            { id: 'SUSPENDUE', label: 'Suspendues' },
            { id: 'ACTIVE', label: 'Actives' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === f.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Nom, téléphone, ville, responsable..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Verifications Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 font-black">
                <th className="py-4 px-5">Boutique</th>
                <th className="py-4 px-4">Responsable</th>
                <th className="py-4 px-4">Téléphone</th>
                <th className="py-4 px-4">Localisation</th>
                <th className="py-4 px-4">Activité</th>
                <th className="py-4 px-4">Date Demande</th>
                <th className="py-4 px-4">Statut Dossier</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Store className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                    <p className="font-bold">Aucune demande de vérification trouvée</p>
                  </td>
                </tr>
              ) : (
                filteredList.map(v => {
                  const tenant = allTenants.find(t => t.id === v.storeId);
                  const isPhoneVerified = tenant?.isPhoneVerified !== false;

                  return (
                    <tr key={v.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* Boutique */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                            {tenant?.logoUrl ? (
                              <img src={tenant.logoUrl} alt={v.storeName} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate flex items-center gap-1.5">
                              <span>{v.storeName}</span>
                              {v.hasPotentialDuplicate && (
                                <span title={v.duplicateWarningMessage || 'Doublon potentiel'} className="text-amber-400">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{tenant?.code || v.storeId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Responsable */}
                      <td className="py-4 px-4 font-bold text-slate-200">
                        {v.submittedByName || tenant?.responsibleName || 'Non spécifié'}
                      </td>

                      {/* Téléphone & OTP Badge */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-slate-300 font-bold block">
                            {v.submittedByPhone || tenant?.phone || '-'}
                          </span>
                          {isPhoneVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Vérifié
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                              <Clock className="w-3 h-3" /> Non vérifié
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Localisation */}
                      <td className="py-4 px-4">
                        <span className="text-slate-300 font-medium block">
                          {tenant?.city || 'Conakry'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {tenant?.commune || tenant?.neighborhood || '-'}
                        </span>
                      </td>

                      {/* Activité */}
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium">
                          {tenant?.primaryCategory || 'Commerce Général'}
                        </span>
                      </td>

                      {/* Date Demande */}
                      <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(v.createdAt).toLocaleDateString('fr-FR')}
                      </td>

                      {/* Statut Dossier */}
                      <td className="py-4 px-4">
                        {v.status === 'EN_ATTENTE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                            <Clock className="w-3 h-3 animate-pulse" /> En attente
                          </span>
                        )}
                        {v.status === 'EN_REVISION' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-[10px]">
                            <RefreshCw className="w-3 h-3" /> En révision
                          </span>
                        )}
                        {v.status === 'INFORMATIONS_DEMANDEES' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-[10px]">
                            <HelpCircle className="w-3 h-3" /> Infos demandées
                          </span>
                        )}
                        {v.status === 'APPROUVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Approuvé
                          </span>
                        )}
                        {v.status === 'REFUSE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-[10px]">
                            <XCircle className="w-3 h-3" /> Refusé
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleOpenReview(v)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700 hover:border-emerald-500/50 flex items-center gap-1.5 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Examiner</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ÉCRAN ADMIN « EXAMINER » (MODAL DÉTAILLÉ DE VÉRIFICATION) */}
      {/* ======================================================== */}
      {selectedVerification && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto p-6 sm:p-8 space-y-6">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                  {selectedTenant.logoUrl ? (
                    <img src={selectedTenant.logoUrl} alt={selectedTenant.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{selectedTenant.name}</h3>
                  <p className="text-xs text-slate-400">Dossier N° {selectedVerification.id} • Soumis le {new Date(selectedVerification.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedVerification(null);
                  setSelectedTenant(null);
                }}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anti-Duplicate Warning if present */}
            {selectedVerification.hasPotentialDuplicate && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-600/70 text-amber-200 space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Alerte Système : Boutique potentiellement similaire détectée</span>
                </div>
                <p className="text-xs text-amber-200/90">{selectedVerification.duplicateWarningMessage}</p>
                <p className="text-[11px] text-amber-400/80">L'administrateur a le pouvoir discrétionnaire d'approuver ou de refuser la demande.</p>
              </div>
            )}

            {/* 4 Inspection Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* BLOCK 1: IDENTITÉ DE LA BOUTIQUE */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Store className="w-4 h-4" /> 1. Identité de la boutique
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block">Nom officiel :</span>
                    <span className="text-white font-bold">{selectedTenant.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Description / Slogan :</span>
                    <span className="text-slate-300">{selectedTenant.settings?.branding?.slogan || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Activité & Catégories :</span>
                    <span className="text-white font-bold">{selectedTenant.businessType || 'Produits'} • {selectedTenant.selectedCategories?.join(', ') || selectedTenant.primaryCategory || 'Commerce'}</span>
                  </div>
                </div>
              </div>

              {/* BLOCK 2: RESPONSABLE */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> 2. Responsable
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block">Nom complet & Fonction :</span>
                    <span className="text-white font-bold">{selectedTenant.responsibleName} ({selectedTenant.responsibleRole || 'Propriétaire'})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Téléphone personnel :</span>
                    <span className="text-emerald-400 font-mono font-bold">{selectedTenant.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">E-mail :</span>
                    <span className="text-slate-300">{selectedTenant.email}</span>
                  </div>
                </div>
              </div>

              {/* BLOCK 3: LOCALISATION */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> 3. Localisation
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block">Ville & Commune :</span>
                    <span className="text-white font-bold">{selectedTenant.city} {selectedTenant.commune ? `(${selectedTenant.commune})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Quartier & Adresse :</span>
                    <span className="text-slate-300">{selectedTenant.neighborhood || selectedTenant.address}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Point de repère :</span>
                    <span className="text-slate-300">{selectedTenant.landmark || 'Non spécifié'}</span>
                  </div>
                </div>
              </div>

              {/* BLOCK 4: VÉRIFICATIONS & DONNÉES COMMERCIALES */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> 4. Vérifications
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Téléphone OTP :</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Contrôlé par l'utilisateur
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Enregistrement légal :</span>
                    <span className="text-white font-bold">
                      {selectedTenant.isRegisteredBusiness ? `${selectedTenant.registrationType} (${selectedTenant.registrationNumber || 'Sans N°'})` : 'Non (Secteur informel autorisé)'}
                    </span>
                  </div>
                  {selectedTenant.commercialDocUrl && (
                    <div>
                      <span className="text-slate-500 font-semibold block">Justificatif commercial privé :</span>
                      <a href={selectedTenant.commercialDocUrl} target="_blank" rel="noreferrer" className="text-yellow-400 hover:underline flex items-center gap-1">
                        <span>Consulter le document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Previous Review Decision Notes if any */}
            {(selectedVerification.rejectionReason || selectedVerification.requestedInformation) && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h5 className="font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Historique des décisions
                </h5>
                {selectedVerification.requestedInformation && (
                  <p className="text-purple-300">
                    <span className="font-bold">Informations demandées :</span> {selectedVerification.requestedInformation}
                  </p>
                )}
                {selectedVerification.rejectionReason && (
                  <p className="text-red-300">
                    <span className="font-bold">Motif de refus :</span> {selectedVerification.rejectionReason} {selectedVerification.rejectionNote ? `(${selectedVerification.rejectionNote})` : ''}
                  </p>
                )}
              </div>
            )}

            {/* THE 3 ADMIN ACTIONS */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
              
              {/* Action 2: Demander des infos */}
              <button
                type="button"
                onClick={() => setIsRequestInfoOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-700/50 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <span>DEMANDER DES INFORMATIONS</span>
              </button>

              {/* Action 3: Refuser */}
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-700/50 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-red-400" />
                <span>REFUSER</span>
              </button>

              {/* Action 1: Approuver */}
              <button
                type="button"
                onClick={() => setIsApproveConfirmOpen(true)}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 scale-105 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-yellow-300" />
                <span>APPROUVER</span>
              </button>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 1 CONFIRM: APPROUVER */}
      {isApproveConfirmOpen && selectedVerification && selectedTenant && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setIsApproveConfirmOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-center space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-white">Confirmer l'approbation</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Vous êtes sur le point d'approuver <span className="font-bold text-white">« {selectedTenant.name} »</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 text-left text-xs space-y-2 text-slate-400">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="w-4 h-4 shrink-0" />
                <span>Statut Dossier : APPROUVÉ</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-400 font-bold">
                <Check className="w-4 h-4 shrink-0" />
                <span>Statut Commercial : ESSAI_GRATUIT (10 jours)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <BadgeCheck className="w-4 h-4 shrink-0" />
                <span>Attribution du badge « Boutique vérifiée »</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIsApproveConfirmOpen(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmApprove}
                className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                Confirmer l'approbation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DEMANDER DES INFORMATIONS */}
      {isRequestInfoOpen && selectedVerification && selectedTenant && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setIsRequestInfoOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Demander des informations complémentaires</h4>
                <p className="text-xs text-slate-400">{selectedTenant.name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Précisez les informations requises pour le vendeur *
              </label>
              <textarea
                value={requestedInfoText}
                onChange={e => setRequestedInfoText(e.target.value)}
                rows={3}
                placeholder="Ex : Merci de compléter l'adresse exacte du local et de fournir une photo de la devanture."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRequestInfoOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRequestInfo}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-lg shadow-purple-600/20"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REFUSER */}
      {isRejectModalOpen && selectedVerification && selectedTenant && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setIsRejectModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Refuser la boutique</h4>
                <p className="text-xs text-slate-400">{selectedTenant.name}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Motif obligatoire *</label>
                <select
                  value={selectedRejectionReason}
                  onChange={e => setSelectedRejectionReason(e.target.value as StoreRejectionReason)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  {PREDEFINED_REJECTION_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Commentaire visible pour le vendeur</label>
                <textarea
                  value={rejectionPublicNote}
                  onChange={e => setRejectionPublicNote(e.target.value)}
                  rows={2}
                  placeholder="Explication claire transmise au responsable de la boutique..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Note interne privée (Réservée aux Administrateurs)</label>
                <textarea
                  value={rejectionInternalNotes}
                  onChange={e => setRejectionInternalNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes internes d'investigation ou d'antécédents..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-lg shadow-red-600/20"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
