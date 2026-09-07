import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Tenant, SubscriptionStatus, LicensePlan, ActivationRequest, LicenseHistoryEvent } from '../../types';
import { evaluateTenantSubscription, generateLicenseKey, DEFAULT_SUPPORT_CONTACT } from '../../lib/licenseEngine';
import { formatDate } from '../../lib/utils';
import { RequestActivationModal } from './RequestActivationModal';
import { ContactSupportModal } from './ContactSupportModal';
import {
  KeyRound, ShieldCheck, ShieldAlert, Clock, Building,
  Plus, Search, Filter, CheckCircle2, XCircle, Phone,
  Mail, MessageSquare, Settings, Sparkles, RefreshCw, Calendar,
  History, AlertTriangle, UserCheck, Check, Info
} from 'lucide-react';

export const LicenseManagementView: React.FC = () => {
  const { currentUser, currentTenant, isSuperAdmin, switchTenant } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  // Agency Modals State
  const [isRequestActivationOpen, setIsRequestActivationOpen] = useState(false);
  const [isContactSupportOpen, setIsContactSupportOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'TENANTS' | 'REQUESTS' | 'HISTORY' | 'SETTINGS'>('TENANTS');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [tenantForActivation, setTenantForActivation] = useState<Tenant | null>(null);
  const [activationPlan, setActivationPlan] = useState<LicensePlan>('PROFESSIONAL');
  const [activationDurationMonths, setActivationDurationMonths] = useState<number>(12);
  const [activationNotes, setActivationNotes] = useState('');

  const [tenantForExtension, setTenantForExtension] = useState<Tenant | null>(null);
  const [extensionPreset, setExtensionPreset] = useState<string>('30');
  const [customExtensionDays, setCustomExtensionDays] = useState<number>(45);

  // Settings State
  const [defaultTrialDays, setDefaultTrialDays] = useState<number>(45);
  const [supportName, setSupportName] = useState(DEFAULT_SUPPORT_CONTACT.name);
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_CONTACT.phone);
  const [supportWhatsapp, setSupportWhatsapp] = useState(DEFAULT_SUPPORT_CONTACT.whatsapp);
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_CONTACT.email);
  const [supportAddress, setSupportAddress] = useState(DEFAULT_SUPPORT_CONTACT.address);
  const [supportMessage, setSupportMessage] = useState(DEFAULT_SUPPORT_CONTACT.customMessage);

  // Stats KPIs computed directly from active database state
  const stats = useMemo(() => {
    const total = state.tenants.length;
    let active = 0;
    let trial = 0;
    let expiringSoon = 0;
    let expired = 0;
    let suspended = 0;

    state.tenants.forEach(t => {
      const evalRes = evaluateTenantSubscription(t);
      if (evalRes.status === 'ACTIVE') active++;
      else if (evalRes.status === 'SUSPENDED') suspended++;
      else if (evalRes.status === 'EXPIRED') expired++;
      else if (evalRes.status === 'TRIAL') {
        trial++;
        if (evalRes.daysRemaining <= 7) expiringSoon++;
      }
    });

    return { total, active, trial, expiringSoon, expired, suspended };
  }, [state.tenants]);

  // Filtered Tenants
  const filteredTenants = useMemo(() => {
    return state.tenants.filter(t => {
      const matchSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        (t.email && t.email.toLowerCase().includes(search.toLowerCase())) ||
        (t.phone && t.phone.includes(search));

      const evalRes = evaluateTenantSubscription(t);

      let matchStatus = true;
      if (statusFilter === 'ACTIVE') matchStatus = evalRes.status === 'ACTIVE';
      if (statusFilter === 'TRIAL') matchStatus = evalRes.status === 'TRIAL';
      if (statusFilter === 'EXPIRING_SOON') matchStatus = evalRes.status === 'TRIAL' && evalRes.daysRemaining <= 7;
      if (statusFilter === 'EXPIRED') matchStatus = evalRes.status === 'EXPIRED';
      if (statusFilter === 'SUSPENDED') matchStatus = evalRes.status === 'SUSPENDED';

      return matchSearch && matchStatus;
    });
  }, [state.tenants, search, statusFilter]);

  // All Activation Requests across all tenants
  const allActivationRequests = useMemo(() => {
    const list: ActivationRequest[] = [];
    state.tenants.forEach(t => {
      if (t.activationRequests) {
        list.push(...t.activationRequests);
      }
    });
    return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [state.tenants]);

  // All License History Events across all tenants
  const allLicenseHistory = useMemo(() => {
    const list: LicenseHistoryEvent[] = [];
    state.tenants.forEach(t => {
      if (t.licenseHistory) {
        list.push(...t.licenseHistory);
      }
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.tenants]);

  // Helper to record license event
  const addLicenseHistory = (tenantId: string, tenantName: string, action: LicenseHistoryEvent['action'], label: string, details?: string) => {
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Super Administrateur';
    const event: LicenseHistoryEvent = {
      id: `lic-evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId,
      tenantName,
      action,
      actionLabel: label,
      details,
      performedByUserName: performedBy,
      createdAt: new Date().toISOString()
    };

    dbStore.updateState(draft => {
      const t = draft.tenants.find(item => item.id === tenantId);
      if (t) {
        if (!t.licenseHistory) t.licenseHistory = [];
        t.licenseHistory.unshift(event);
      }
    });
  };

  // Handle Full License Activation
  const handleConfirmActivation = () => {
    if (!tenantForActivation) return;

    const licenseKey = generateLicenseKey(tenantForActivation.code, activationPlan);
    const now = new Date();
    const expiresAt =
      activationDurationMonths === 999
        ? undefined
        : new Date(now.getTime() + activationDurationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    dbStore.updateState(draft => {
      const t = draft.tenants.find(item => item.id === tenantForActivation.id);
      if (t) {
        t.subscriptionStatus = 'ACTIVE';
        t.licenseKey = licenseKey;
        t.licensePlan = activationPlan;
        t.licenseActivatedAt = now.toISOString();
        t.licenseExpiresAt = expiresAt;

        // Auto-mark any pending activation requests as ACTIVATED
        if (t.activationRequests) {
          t.activationRequests.forEach(req => {
            if (req.status === 'PENDING' || req.status === 'CONTACTED') {
              req.status = 'ACTIVATED';
              req.handledAt = now.toISOString();
              req.handledByUserName = `${currentUser?.firstName} ${currentUser?.lastName}`;
              req.adminNotes = `Licence activée : ${licenseKey}`;
            }
          });
        }
      }

      // Add Notification
      draft.notifications.unshift({
        id: `notif-act-${Date.now()}`,
        tenantId: tenantForActivation.id,
        title: 'Licence Définitive Activée',
        message: `La version complète ${activationPlan} a été activée pour le centre ${tenantForActivation.name}.`,
        type: 'SUCCESS',
        link: '/licenses',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    addLicenseHistory(
      tenantForActivation.id,
      tenantForActivation.name,
      'LICENSE_ACTIVATED',
      `ACTIVATION LICENCE ${activationPlan}`,
      `Clé : ${licenseKey} • Durée : ${activationDurationMonths === 999 ? 'Permanente' : `${activationDurationMonths} mois`}`
    );

    dbStore.logAudit('LICENSE_ACTIVATED', 'TENANT', tenantForActivation.id, null, {
      licenseKey,
      plan: activationPlan,
      durationMonths: activationDurationMonths,
      notes: activationNotes
    });

    showToast('Licence Activée', `Le compte ${tenantForActivation.name} est maintenant actif (${licenseKey}).`, 'SUCCESS');
    setTenantForActivation(null);
  };

  // Handle Trial Extension
  const handleConfirmExtension = () => {
    if (!tenantForExtension) return;

    const daysToAdd = extensionPreset === 'CUSTOM' ? customExtensionDays : Number(extensionPreset);
    if (!daysToAdd || daysToAdd <= 0) return;

    const evalRes = evaluateTenantSubscription(tenantForExtension);
    const currentEnd = new Date(evalRes.endDate).getTime();
    const newEnd = new Date(Math.max(Date.now(), currentEnd) + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    dbStore.updateState(draft => {
      const t = draft.tenants.find(item => item.id === tenantForExtension.id);
      if (t) {
        t.subscriptionStatus = 'TRIAL';
        t.trialEndsAt = newEnd;
        t.trialDaysTotal = (t.trialDaysTotal || 45) + daysToAdd;
      }
    });

    addLicenseHistory(
      tenantForExtension.id,
      tenantForExtension.name,
      'TRIAL_EXTENDED',
      `PROLONGATION ESSAI +${daysToAdd}J`,
      `Nouvelle expiration : ${formatDate(newEnd, 'dd/MM/yyyy')}`
    );

    dbStore.logAudit('TRIAL_EXTENDED', 'TENANT', tenantForExtension.id, null, {
      extendedByDays: daysToAdd,
      newEndDate: newEnd
    });

    showToast('Essai Prolongé', `+${daysToAdd} jours ajoutés au centre ${tenantForExtension.name}.`, 'SUCCESS');
    setTenantForExtension(null);
  };

  // Handle Status Toggle (Suspend / Reactivate)
  const handleToggleStatus = (tenant: Tenant, newStatus: SubscriptionStatus) => {
    dbStore.updateState(draft => {
      const t = draft.tenants.find(item => item.id === tenant.id);
      if (t) {
        t.subscriptionStatus = newStatus;
      }
    });

    addLicenseHistory(
      tenant.id,
      tenant.name,
      newStatus === 'SUSPENDED' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REACTIVATED',
      newStatus === 'SUSPENDED' ? 'SUSPENSION COMPTE' : 'RÉACTIVATION COMPTE'
    );

    dbStore.logAudit('TENANT_STATUS_CHANGED', 'TENANT', tenant.id, null, { newStatus });
    showToast('Statut mis à jour', `Le centre est maintenant : ${newStatus}`, 'SUCCESS');
  };

  // Simulate Trial Expiration for testing
  const handleSimulateExpiration = (tenant: Tenant) => {
    dbStore.updateState(draft => {
      const t = draft.tenants.find(item => item.id === tenant.id);
      if (t) {
        t.subscriptionStatus = 'TRIAL';
        t.trialStartedAt = new Date(Date.now() - 46 * 24 * 60 * 60 * 1000).toISOString();
        t.trialEndsAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      }
    });

    addLicenseHistory(
      tenant.id,
      tenant.name,
      'TRIAL_EXPIRED',
      "EXPIRATION D'ESSAI (SIMULATION)",
      "Période d'essai expirée"
    );

    dbStore.logAudit('TRIAL_EXPIRED_SIMULATION', 'TENANT', tenant.id, null, {});
    showToast('Simulation Expiration', `L'essai de ${tenant.name} est maintenant expiré.`, 'WARNING');
  };

  // Save Global Support Settings
  const handleSaveGlobalSettings = (e: React.FormEvent) => {
    e.preventDefault();

    dbStore.updateState(draft => {
      draft.tenants.forEach(t => {
        t.supportContact = {
          name: supportName,
          phone: supportPhone,
          whatsapp: supportWhatsapp,
          email: supportEmail,
          address: supportAddress,
          customMessage: supportMessage
        };
        if (!t.settings) t.settings = {} as any;
        t.settings.defaultTrialDays = defaultTrialDays;
        t.settings.supportContact = t.supportContact;
      });
    });

    showToast('Paramètres Enregistrés', 'Les coordonnées de contact et la durée d’essai par défaut ont été enregistrées.', 'SUCCESS');
  };

  // --- AGENCY ADMIN VIEW (STRICT READ-ONLY) ---
  if (!isSuperAdmin) {
    const targetAgency = currentTenant || state.tenants[0];
    const subEval = evaluateTenantSubscription(targetAgency);
    const agencyHistory = (targetAgency?.licenseHistory || []).slice(0, 15);
    const supportContact = targetAgency?.supportContact || targetAgency?.settings?.supportContact || DEFAULT_SUPPORT_CONTACT;

    const isBoutique = targetAgency?.activityType === 'RETAIL_STORE';

    const includedFeatures = isBoutique
      ? [
          { name: 'Point de Vente & Caisse POS', desc: 'Encaissement rapide, multi-devises et tickets' },
          { name: 'Gestion de Stock & Magasins', desc: 'Articles, multi-unités, conditionnements et alertes' },
          { name: 'Fournisseurs & Réapprovisionnement', desc: 'Bons de commande et réceptions de stock' },
          { name: 'Clients & Facturation', desc: 'Comptes clients, devis, factures et avoirs' },
          { name: 'Multi-Utilisateurs & Postes', desc: 'Gestion des caissiers, gérants et accès' },
          { name: 'Rapports Financiers & Marges', desc: 'Chiffre d’affaires, bénéfices et exports' },
          { name: 'Journal d’Audit Sécurisé', desc: 'Traçabilité inviolable des opérations sensibles' },
          { name: 'Sauvegardes & Sécurité Locale', desc: 'Données protégées et isolées par agence' }
        ]
      : [
          { name: 'Pôle Prestations & Reprographie', desc: 'Commandes sur-mesure, tirages et reliures' },
          { name: 'Atelier de Production', desc: 'Suivi des travaux, massicot et façonnage' },
          { name: 'Pôle Formation & LMS', desc: 'Apprenants, sessions et attestations avec QR code' },
          { name: 'Stock Magasin & Prestation', desc: 'Consommations internes et transferts atelier' },
          { name: 'Caisse & Facturation', desc: 'Encaissements, devis estimatifs et factures' },
          { name: 'Signatures Électroniques & Cachet', desc: 'Apposition sécurisée sur documents officiels' },
          { name: 'Multi-Postes & Permissions RBAC', desc: 'Rôles opérateurs, caissiers, formateurs et direction' },
          { name: 'Rapports 360° & Statistiques', desc: 'Analyses par pôle d\'activité et rentabilité' }
        ];

    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-6 h-6 text-amber-500" />
                Licence & Formule de l'Agence
              </h2>
              <Badge variant="primary" size="sm" className="font-black text-[10px] uppercase">
                👁️ Lecture Seule
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Consultation des droits d'utilisation, de la validité de la souscription et des fonctionnalités souscrites pour votre agence.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              icon={Phone}
              onClick={() => setIsContactSupportOpen(true)}
              className="text-xs font-bold shadow-sm"
            >
              Contacter le Support
            </Button>
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={() => setIsRequestActivationOpen(true)}
              className="text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-500/20"
            >
              Demander une Activation
            </Button>
          </div>
        </div>

        {/* Hero Plan Banner */}
        <Card className="p-6 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white rounded-3xl shadow-xl border border-brand-800/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={subEval.status === 'ACTIVE' ? 'success' : subEval.status === 'TRIAL' ? 'warning' : 'danger'}
                  size="md"
                  className="font-black uppercase tracking-wider text-xs"
                >
                  {subEval.status === 'ACTIVE' ? '🟢 LICENCE ACTIVE' : subEval.status === 'TRIAL' ? '🟠 PÉRIODE D\'ESSAI' : '🔴 EXPIRÉE'}
                </Badge>
                {targetAgency?.licensePlan ? (
                  <Badge variant="warning" size="md" className="font-black uppercase text-xs">
                    ⭐ FORMULE {targetAgency.licensePlan}
                  </Badge>
                ) : (
                  <Badge variant="secondary" size="md" className="font-black uppercase text-xs">
                    ESSAI DÉMO (45J)
                  </Badge>
                )}
              </div>

              <h3 className="text-2xl font-black tracking-tight text-white">
                {targetAgency?.name}
              </h3>

              <p className="text-xs text-slate-300">
                Code officiel : <strong className="text-amber-400 font-mono">{targetAgency?.code}</strong> • Modèle d'activité :{' '}
                <strong className="text-emerald-400">
                  {isBoutique ? 'Commerce & Boutique de Détail' : 'Centre de Prestations & Services'}
                </strong>
              </p>

              {targetAgency?.licenseKey && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Clé d'activation :</span>
                  <code className="text-xs font-mono font-bold bg-slate-800 px-2.5 py-1 rounded-lg text-amber-300 border border-slate-700">
                    {targetAgency.licenseKey}
                  </code>
                </div>
              )}
            </div>

            {/* Metrics block */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 min-w-[280px]">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Statut Actuel</span>
                <span className="text-sm font-black text-amber-400">{subEval.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Échéance</span>
                <span className="text-sm font-black text-white">{new Date(subEval.endDate).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Jours Restants</span>
                <span className={`text-sm font-black ${subEval.daysRemaining <= 7 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {subEval.daysRemaining} jour(s)
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Read-Only Notice Alert */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-amber-950 dark:text-amber-100">
              Administration Centralisée & Lecture Seule :
            </p>
            <p className="leading-relaxed">
              La gestion des souscriptions, l'activation des licences, l'attribution des formules commerciales et la prolongation des contrats sont strictement réservées au <strong>Super Administrateur</strong>. En tant qu'administrateur d'agence, vos accès sont en consultation seule. Pour activer, renouveler ou prolonger votre contrat, veuillez contacter l'administration de la plateforme.
            </p>
          </div>
        </div>

        {/* Grid: Included Features & Support Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Included Features */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="p-6 space-y-4">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Fonctionnalités Incluses dans Votre Modèle d'Agence
                </CardTitle>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {includedFeatures.map((feat, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{feat.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Agency License History */}
            <Card className="p-6 space-y-4">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-brand-500" />
                  Historique des Événements de Licence de l'Agence
                </CardTitle>
              </CardHeader>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>Opérateur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencyHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-xs text-slate-400">
                          Aucun événement de licence enregistré pour le moment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      agencyHistory.map(evt => (
                        <TableRow key={evt.id}>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(evt.createdAt, 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" size="sm" className="font-bold text-[10px]">
                              {evt.actionLabel || evt.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                            {evt.details || '—'}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {evt.performedByUserName || 'Super Administrateur'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Support & Contact Card */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-6 space-y-4 bg-gradient-to-br from-brand-50/50 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 border-brand-200/80 dark:border-brand-900/60">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-brand-950 dark:text-white">
                  <Phone className="w-4 h-4 text-brand-500" />
                  Assistance & Renouvellement
                </CardTitle>
              </CardHeader>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {supportContact.customMessage || "Nos conseillers sont à votre écoute pour activer votre licence définitive ou répondre à vos questions techniques."}
              </p>

              <div className="space-y-2.5 pt-2 text-xs">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Téléphone / WhatsApp</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{supportContact.phone}</span>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Email Support</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{supportContact.email}</span>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <Building className="w-4 h-4 text-brand-500 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Direction</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{supportContact.name}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  icon={Sparkles}
                  onClick={() => setIsRequestActivationOpen(true)}
                  className="w-full text-xs font-extrabold bg-brand-600 hover:bg-brand-500"
                >
                  Envoyer une Demande d'Activation
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Modals for Agency Admin */}
        <RequestActivationModal
          isOpen={isRequestActivationOpen}
          onClose={() => setIsRequestActivationOpen(false)}
        />

        <ContactSupportModal
          isOpen={isContactSupportOpen}
          onClose={() => setIsContactSupportOpen(false)}
          supportContact={supportContact}
          tenantName={targetAgency?.name}
          onOpenActivationRequest={() => {
            setIsContactSupportOpen(false);
            setIsRequestActivationOpen(true);
          }}
        />
      </div>
    );
  }

  // --- SUPER ADMIN VIEW (FULL MANAGEMENT) ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-amber-500" />
            Gestion des Licences & Périodes d'Essai (45 Jours)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Module local autonome de contrôle des licences, calcul d'essai anti-recul d'horloge et activation définitive.
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap">
          <button
            onClick={() => setActiveTab('TENANTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'TENANTS'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Comptes & Licences ({state.tenants.length})
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'REQUESTS'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Demandes d'Activation
            {allActivationRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Historique & Audit ({allLicenseHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SETTINGS'
                ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Paramètres & Support
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Centres</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{stats.total}</span>
        </Card>
        <Card className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">🟢 Licences Actives</span>
          <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 block">{stats.active}</span>
        </Card>
        <Card className="p-3.5 bg-brand-50/50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-900/60">
          <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 block">🟡 En Essai</span>
          <span className="text-xl font-extrabold text-brand-700 dark:text-brand-300 mt-1 block">{stats.trial}</span>
        </Card>
        <Card className="p-3.5 bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60">
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">🟠 Expirent Bientôt</span>
          <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-1 block">{stats.expiringSoon}</span>
        </Card>
        <Card className="p-3.5 bg-rose-50/50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60">
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">🔴 Essais Expirés</span>
          <span className="text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-1 block">{stats.expired}</span>
        </Card>
        <Card className="p-3.5 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">⚪ Suspendus</span>
          <span className="text-xl font-extrabold text-slate-700 dark:text-slate-300 mt-1 block">{stats.suspended}</span>
        </Card>
      </div>

      {/* TAB 1: TENANTS LIST */}
      {activeTab === 'TENANTS' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom de centre, code, email, téléphone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs font-semibold"
                options={[
                  { value: 'ALL', label: 'Tous les statuts de compte' },
                  { value: 'ACTIVE', label: '🟢 Actifs (Licence validée)' },
                  { value: 'TRIAL', label: '🟡 En période d’essai' },
                  { value: 'EXPIRING_SOON', label: '🟠 Expirent dans <= 7 jours' },
                  { value: 'EXPIRED', label: '🔴 Expirés' },
                  { value: 'SUSPENDED', label: '⚪ Suspendus' },
                ]}
              />
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Centre & Code</TableHead>
                  <TableHead>Statut Abonnement</TableHead>
                  <TableHead>Période d'Essai / Licence</TableHead>
                  <TableHead>Jours Restants</TableHead>
                  <TableHead>Clé de Licence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map(t => {
                  const evalRes = evaluateTenantSubscription(t);

                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {t.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-xs text-slate-900 dark:text-white block">
                              {t.name}
                            </strong>
                            <span className="font-mono text-[10px] text-slate-400">
                              {t.code} • {t.phone || 'Pas de tél'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {evalRes.status === 'ACTIVE' && (
                          <Badge variant="success" size="sm" className="font-bold">
                            🟢 Actif ({t.licensePlan || 'PRO'})
                          </Badge>
                        )}
                        {evalRes.status === 'TRIAL' && (
                          <Badge
                            variant={evalRes.daysRemaining <= 3 ? 'danger' : evalRes.daysRemaining <= 7 ? 'warning' : 'info'}
                            size="sm"
                            className="font-bold"
                          >
                            🟡 Essai ({evalRes.daysRemaining}j restants)
                          </Badge>
                        )}
                        {evalRes.status === 'EXPIRED' && (
                          <Badge variant="danger" size="sm" className="font-bold">
                            🔴 Expiré
                          </Badge>
                        )}
                        {evalRes.status === 'SUSPENDED' && (
                          <Badge variant="secondary" size="sm" className="font-bold">
                            ⚪ Suspendu
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-xs">
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                            Début : {formatDate(evalRes.startDate, 'dd/MM/yyyy')}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                            Fin : {evalRes.endDate === 'Illimitée' ? 'Illimitée' : formatDate(evalRes.endDate, 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {evalRes.status === 'ACTIVE' ? (
                          <span className="text-xs font-bold text-emerald-600">Illimité</span>
                        ) : (
                          <div className="space-y-1 w-28">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>{evalRes.daysRemaining} j</span>
                              <span className="text-slate-400">{evalRes.progressPercent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  evalRes.daysRemaining <= 3
                                    ? 'bg-rose-500'
                                    : evalRes.daysRemaining <= 7
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${100 - evalRes.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {t.licenseKey ? (
                          <span className="font-mono text-[11px] font-bold text-brand-600 dark:text-brand-400 block truncate max-w-[140px]" title={t.licenseKey}>
                            {t.licenseKey}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Non licencié</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {evalRes.status !== 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={ShieldCheck}
                              onClick={() => {
                                setTenantForActivation(t);
                                setActivationPlan('PROFESSIONAL');
                              }}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
                            >
                              Activer
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            icon={Calendar}
                            onClick={() => {
                              setTenantForExtension(t);
                              setExtensionPreset('30');
                              setCustomExtensionDays(45);
                            }}
                            title="Prolonger l'essai"
                            className="text-xs font-semibold"
                          >
                            +Jours
                          </Button>

                          {evalRes.status === 'TRIAL' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSimulateExpiration(t)}
                              title="Simuler l'expiration immédiate pour test"
                              className="text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              Tester Exp.
                            </Button>
                          )}

                          {evalRes.status === 'SUSPENDED' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(t, 'ACTIVE')}
                              className="text-xs text-emerald-600 border-emerald-300"
                            >
                              Réactiver
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(t, 'SUSPENDED')}
                              className="text-xs text-slate-400 hover:text-rose-600"
                              title="Suspendre l'accès"
                            >
                              Suspendre
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 2: ACTIVATION REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Centre Demandeur</TableHead>
                <TableHead>Contact / Responsable</TableHead>
                <TableHead>Message Transmis</TableHead>
                <TableHead>Statut Demande</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allActivationRequests.length > 0 ? (
                allActivationRequests.map(req => {
                  const targetTenant = state.tenants.find(t => t.id === req.tenantId);

                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                          {formatDate(req.requestedAt, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </TableCell>

                      <TableCell>
                        <strong className="text-xs text-brand-600 dark:text-brand-400 block">
                          {req.tenantName}
                        </strong>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs">
                          <strong className="text-slate-900 dark:text-white block">{req.userName}</strong>
                          <span className="text-[11px] text-slate-400">{req.userPhone} • {req.userEmail || ''}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm line-clamp-2 italic">
                          « {req.message} »
                        </p>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            req.status === 'ACTIVATED'
                              ? 'success'
                              : req.status === 'CONTACTED'
                              ? 'info'
                              : req.status === 'REJECTED'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                          className="font-bold"
                        >
                          {req.status === 'ACTIVATED'
                            ? '🟢 ACTIVÉE'
                            : req.status === 'CONTACTED'
                            ? '🔵 CONTACTÉ'
                            : req.status === 'REJECTED'
                            ? '🔴 REJETÉE'
                            : '🟠 EN ATTENTE'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {req.status === 'PENDING' && targetTenant && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={ShieldCheck}
                            onClick={() => {
                              setTenantForActivation(targetTenant);
                              setActivationPlan('PROFESSIONAL');
                            }}
                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
                          >
                            Valider & Activer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    Aucune demande d'activation en attente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* TAB 3: HISTORY & AUDIT LOG */}
      {activeTab === 'HISTORY' && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Centre</TableHead>
                <TableHead>Action / Événement</TableHead>
                <TableHead>Détails & Paramètres</TableHead>
                <TableHead>Opérateur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allLicenseHistory.length > 0 ? (
                allLicenseHistory.map(evt => (
                  <TableRow key={evt.id}>
                    <TableCell>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {formatDate(evt.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                      </span>
                    </TableCell>

                    <TableCell>
                      <strong className="text-xs text-brand-600 dark:text-brand-400 block">
                        {evt.tenantName}
                      </strong>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          evt.action === 'LICENSE_ACTIVATED'
                            ? 'success'
                            : evt.action === 'TRIAL_EXTENDED'
                            ? 'info'
                            : evt.action === 'ACCOUNT_SUSPENDED'
                            ? 'danger'
                            : evt.action === 'ACCOUNT_REACTIVATED'
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                        className="font-bold"
                      >
                        {evt.actionLabel}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {evt.details || '-'}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-brand-500" />
                        {evt.performedByUserName}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                    Aucun événement d'historique de licence enregistré.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* TAB 4: GLOBAL SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <form onSubmit={handleSaveGlobalSettings} className="space-y-6 max-w-2xl">
          <Card className="p-6 space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-4 h-4 text-brand-500" />
                Durée d'Essai par Défaut des Nouveaux Centres
              </CardTitle>
            </CardHeader>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nombre de jours alloués par défaut aux nouveaux centres
              </label>
              <Select
                value={defaultTrialDays}
                onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
                className="w-full text-xs font-semibold"
                options={[
                  { value: 30, label: '30 Jours' },
                  { value: 45, label: '45 Jours (Standard Recommandé)' },
                  { value: 60, label: '60 Jours' },
                  { value: 90, label: '90 Jours' },
                ]}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                La modification de ce paramètre s'appliquera aux futurs centres créés sans modifier les essais déjà en cours.
              </p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500" />
                Coordonnées de Contact Support & Commercial
              </CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nom / Intitulé du Contact Support *
                </label>
                <Input
                  value={supportName}
                  onChange={(e) => setSupportName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Téléphone Principal *
                </label>
                <Input
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Numéro WhatsApp Direct *
                </label>
                <Input
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Support *
                </label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Adresse / Localisation
                </label>
                <Input
                  value={supportAddress}
                  onChange={(e) => setSupportAddress(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Message Personnalisé pour les Clients
                </label>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button variant="primary" type="submit" className="font-bold">
                Enregistrer les Paramètres
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Activation Modal */}
      {tenantForActivation && (
        <Modal
          isOpen={!!tenantForActivation}
          onClose={() => setTenantForActivation(null)}
          title={`Activer la Licence Définitive : ${tenantForActivation.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200">
              L'activation débloque l'application pour ce centre et supprime définitivement les restrictions de la période d'essai de 45 jours.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Formule de Licence *
                </label>
                <Select
                  value={activationPlan}
                  onChange={(e) => setActivationPlan(e.target.value as LicensePlan)}
                  className="w-full text-xs font-semibold"
                  options={[
                    { value: 'PROFESSIONAL', label: '⭐ Professionnel' },
                    { value: 'ENTERPRISE', label: '🏢 Entreprise' },
                    { value: 'UNLIMITED', label: '👑 Illimitée / Permanente' },
                    { value: 'STARTER', label: '🚀 Starter' },
                  ]}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Durée de Validité *
                </label>
                <Select
                  value={activationDurationMonths}
                  onChange={(e) => setActivationDurationMonths(Number(e.target.value))}
                  className="w-full text-xs font-semibold"
                  options={[
                    { value: 12, label: '1 An (12 mois)' },
                    { value: 24, label: '2 Ans (24 mois)' },
                    { value: 36, label: '3 Ans (36 mois)' },
                    { value: 999, label: 'Illimitée (Sans expiration)' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Observations Administrateur
              </label>
              <Input
                value={activationNotes}
                onChange={(e) => setActivationNotes(e.target.value)}
                placeholder="Ex: Contrat signé N° 2026/08/CPEP - Règlement reçu"
                className="text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTenantForActivation(null)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleConfirmActivation} className="font-bold bg-emerald-600 hover:bg-emerald-700">
                Confirmer l'Activation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Extension Modal with Preset and Custom Days */}
      {tenantForExtension && (
        <Modal
          isOpen={!!tenantForExtension}
          onClose={() => setTenantForExtension(null)}
          title={`Prolonger la Période d'Essai : ${tenantForExtension.name}`}
          maxWidth="sm"
        >
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Sélectionnez le nombre de jours supplémentaires à accorder pour cet essai commercial :
            </p>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Options de Prolongation
              </label>
              <Select
                value={extensionPreset}
                onChange={(e) => setExtensionPreset(e.target.value)}
                className="w-full text-xs font-bold"
                options={[
                  { value: '7', label: '+7 Jours' },
                  { value: '15', label: '+15 Jours' },
                  { value: '30', label: '+30 Jours' },
                  { value: '45', label: '+45 Jours' },
                  { value: 'CUSTOM', label: '⚙️ Durée Personnalisée...' },
                ]}
              />
            </div>

            {extensionPreset === 'CUSTOM' && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre de Jours Précis
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={customExtensionDays}
                  onChange={(e) => setCustomExtensionDays(Number(e.target.value))}
                  className="text-xs font-bold"
                />
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTenantForExtension(null)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={handleConfirmExtension} className="font-bold">
                Prolonger l'Essai
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
