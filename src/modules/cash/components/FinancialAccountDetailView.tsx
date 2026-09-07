import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { FinancialAccount, FinancialMovement, AuditLog } from '../../../types';
import { dbStore } from '../../../server/db/mockStore';
import { useAuth } from '../../../context/AuthContext';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Landmark, Smartphone, Wallet, Edit, ArrowRightLeft,
  Scale, AlertOctagon, Power, Trash2, History,
  FileText, Calendar, Filter, Search, ArrowUpRight,
  ArrowDownRight, CheckCircle2, ShieldCheck, CreditCard,
  Settings, Clock, User, AlertTriangle, ArrowLeft,
  RefreshCw, Check, X, Eye, HelpCircle, ShieldAlert
} from 'lucide-react';

interface Props {
  accountId: string | null;
  onBack: () => void;
  onEdit: (account: FinancialAccount) => void;
  onAdjust: (account: FinancialAccount) => void;
  onReset: (account: FinancialAccount) => void;
  onToggleStatus: (account: FinancialAccount) => void;
  onDeleteOrTransfer: (account: FinancialAccount) => void;
  onTransfer: (fromAccountId: string) => void;
}

// Error Boundary specifically to protect against blank screens
class DetailErrorBoundary extends React.Component<{ children: React.ReactNode; onBack: () => void }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode; onBack: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error rendering FinancialAccountDetailView:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-4 max-w-xl mx-auto my-8">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/80 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Une erreur est survenue lors de l'affichage de la fiche
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {this.state.error?.message || "Données du compte financier incomplètes ou corrompues."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs font-bold"
            >
              Réessayer
            </Button>
            <Button
              variant="primary"
              icon={ArrowLeft}
              onClick={this.props.onBack}
              className="text-xs font-bold"
            >
              Retour aux comptes
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const FinancialAccountDetailViewInternal: React.FC<Props> = ({
  accountId,
  onBack,
  onEdit,
  onAdjust,
  onReset,
  onToggleStatus,
  onDeleteOrTransfer,
  onTransfer
}) => {
  const { currentTenant, isSuperAdmin, canManageSensitiveFinancials } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [activeTab, setActiveTab] = useState<'movements' | 'audit' | 'config'>('movements');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulated resilient loading with null validation
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    const timer = setTimeout(() => {
      try {
        if (!accountId) {
          setLoadError("Identifiant du compte financier manquant.");
        }
        setIsLoading(false);
      } catch (err: any) {
        setLoadError(err?.message || "Erreur de chargement.");
        setIsLoading(false);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [accountId, retryCount]);

  const state = dbStore.getState();

  // Find account safely
  const account = useMemo(() => {
    if (!accountId) return null;
    return (state.financialAccounts || []).find(a => a.id === accountId) || null;
  }, [state.financialAccounts, accountId]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  // Account Not Found or Missing ID
  if (!accountId || !account || loadError) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-w-lg mx-auto my-12">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Compte Financier Introuvable ou Supprimé
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {loadError || "Le compte financier demandé n'existe pas dans cette agence ou a été supprimé."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => setRetryCount(prev => prev + 1)}
            className="text-xs font-bold"
          >
            Réessayer
          </Button>
          <Button
            variant="primary"
            icon={ArrowLeft}
            onClick={onBack}
            className="text-xs font-bold"
          >
            ← Retour aux comptes financiers
          </Button>
        </div>
      </div>
    );
  }

  const isBank = account.type === 'BANK';
  const isMomo = account.type === 'MOBILE_MONEY';
  const isCash = account.type === 'CASH';
  const currency = account.currency || 'GNF';

  // Extract movements for this specific account with defensive null safety
  const accountMovements = (state.financialMovements || []).filter(
    m => m && (m.financialAccountId === account.id || m.fromAccountId === account.id || m.toAccountId === account.id)
  );

  // Extract audit logs safely
  const accountAuditLogs = dbStore.getFinancialAccountAuditLogs(account.id, account.tenantId) || [];

  // Financial Summary Breakdown (All-time & Period-specific)
  let totalInflows = 0;
  let totalOutflows = 0;
  let totalTransfersIn = 0;
  let totalTransfersOut = 0;

  accountMovements.forEach(m => {
    if (!m) return;
    const amount = Number(m.amount) || 0;
    if (m.movementType === 'INFLOW') {
      totalInflows += amount;
    } else if (m.movementType === 'OUTFLOW') {
      totalOutflows += amount;
    } else if (m.movementType === 'TRANSFER') {
      if (m.toAccountId === account.id) {
        totalTransfersIn += amount;
      } else if (m.fromAccountId === account.id) {
        totalTransfersOut += amount;
      }
    }
  });

  // Filter movements by period & category & search
  const filteredMovements = accountMovements.filter(m => {
    if (!m) return false;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const rawDate = m.createdAt || new Date().toISOString();
    const mDate = new Date(rawDate);
    const mDateStr = rawDate.split('T')[0] || '';

    // Period Filter
    if (periodFilter === 'TODAY' && mDateStr !== todayStr) return false;
    if (periodFilter === 'WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      if (mDate < weekAgo) return false;
    }
    if (periodFilter === 'MONTH') {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      if (mDate < monthAgo) return false;
    }
    if (periodFilter === 'YEAR') {
      const yearAgo = new Date();
      yearAgo.setFullYear(now.getFullYear() - 1);
      if (mDate < yearAgo) return false;
    }
    if (periodFilter === 'CUSTOM') {
      if (customStartDate && mDateStr < customStartDate) return false;
      if (customEndDate && mDateStr > customEndDate) return false;
    }

    // Category Filter
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'INFLOW' && m.movementType !== 'INFLOW') return false;
      if (categoryFilter === 'OUTFLOW' && m.movementType !== 'OUTFLOW') return false;
      if (categoryFilter === 'TRANSFER' && m.movementType !== 'TRANSFER') return false;
      if (categoryFilter === 'ADJUSTMENT' && m.category !== 'BALANCE_ADJUSTMENT') return false;
      if (categoryFilter === 'RESET' && m.category !== 'ACCOUNT_RESET') return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const ref = (m.reference || '').toLowerCase();
      const num = (m.movementNumber || '').toLowerCase();
      const notes = (m.notes || '').toLowerCase();
      const reason = (m.reason || '').toLowerCase();
      const user = (m.performedByUserName || '').toLowerCase();
      const label = (m.categoryLabel || '').toLowerCase();
      if (!ref.includes(q) && !num.includes(q) && !notes.includes(q) && !reason.includes(q) && !user.includes(q) && !label.includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb / Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-brand-600" />
          <span>← Retour aux comptes financiers</span>
        </button>

        <div className="flex items-center gap-2">
          <Badge
            variant={account.isArchived ? 'outline' : account.isActive ? 'success' : 'outline'}
            size="sm"
            className="font-bold text-xs"
          >
            {account.isArchived ? 'Archivé' : account.isActive ? '🟢 Compte Actif' : '🔴 Compte Inactif'}
          </Badge>
          <span className="text-xs text-slate-400 font-mono">
            ID: {account.id}
          </span>
        </div>
      </div>

      {/* Main Account Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shrink-0 ${
              isBank
                ? 'bg-amber-600 text-white shadow-amber-600/30'
                : isMomo
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-amber-500 text-white shadow-amber-500/30'
            }`}>
              {isBank ? <Landmark className="w-7 h-7" /> : isMomo ? <Smartphone className="w-7 h-7" /> : <Wallet className="w-7 h-7" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">{account.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-white/10 text-slate-200 font-bold border border-white/10">
                  {account.code}
                </span>
                {account.isDefault && (
                  <span className="bg-brand-500/30 text-brand-300 border border-brand-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Compte par Défaut
                  </span>
                )}
                {account.isMainCash && (
                  <span className="bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Caisse Principale Obligatoire
                  </span>
                )}
                {account.isPettyCash && (
                  <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Petite Caisse
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300">
                {isBank ? 'Compte Bancaire' : isMomo ? 'Portefeuille Mobile Money' : 'Caisse d\'Espèces'}
                {account.bankName ? ` • ${account.bankName}` : ''}
                {account.accountNumber ? ` • N° ${account.accountNumber}` : ''}
                {account.description ? ` • ${account.description}` : ''}
              </p>
            </div>
          </div>

          {/* Solde Actuel Display */}
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 min-w-[200px] text-left md:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Solde Actuel Disponible</span>
            <div className="text-2xl font-black text-brand-400 mt-0.5">
              {formatCurrency(account.currentBalance || 0, currency)}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-700">
              <span>Solde Initial : {formatCurrency(account.initialBalance || 0, currency)}</span>
              <span>Devise : {currency}</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-800">
          {/* Transfer is available to operations if active and balance > 0 */}
          <Button
            size="sm"
            variant="outline"
            icon={ArrowRightLeft}
            onClick={() => onTransfer(account.id)}
            disabled={!account.isActive || (account.currentBalance || 0) <= 0}
            className="text-xs font-bold text-brand-300 bg-brand-950/40 hover:bg-brand-900/60 border-brand-800/80"
          >
            Transférer des Fonds
          </Button>

          {/* SENSITIVE ACTIONS: Only visible to authorized administrators */}
          {canManageSensitiveFinancials ? (
            <>
              <Button
                size="sm"
                variant="outline"
                icon={Edit}
                onClick={() => onEdit(account)}
                className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-750 border-slate-700"
              >
                Modifier le Compte
              </Button>

              <Button
                size="sm"
                variant="outline"
                icon={Scale}
                onClick={() => onAdjust(account)}
                className="text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border-amber-800/80"
              >
                Ajuster le Solde
              </Button>

              <Button
                size="sm"
                variant="outline"
                icon={AlertOctagon}
                onClick={() => onReset(account)}
                className="text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/80"
              >
                Réinitialiser à 0 GNF
              </Button>

              {!account.isMainCash && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={Power}
                  onClick={() => onToggleStatus(account)}
                  className={`text-xs font-bold ${
                    account.isActive
                      ? 'text-amber-400 bg-slate-800 hover:bg-slate-700 border-slate-700'
                      : 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800'
                  }`}
                >
                  {account.isActive ? 'Désactiver' : 'Réactiver'}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                icon={Trash2}
                onClick={() => onDeleteOrTransfer(account)}
                className="text-xs font-bold text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 border-slate-700 sm:ml-auto"
              >
                Supprimer / Assistant
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 sm:ml-auto">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Mode Consultation — Actions administratives sensibles (Modifier, Supprimer, Réinitialiser) restreintes.</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINANCIAL SUMMARY KPI TILES (5 Indicateurs Clés) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-3.5 border-l-4 border-l-brand-500 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Solde Disponible</span>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatCurrency(account.currentBalance || 0, currency)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Initial : {formatCurrency(account.initialBalance || 0, currency)}</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Total Entrées</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatCurrency(totalInflows, currency)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Recettes & encaissements</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-rose-500 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">Total Sorties</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
            -{formatCurrency(totalOutflows, currency)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Dépenses & règlements</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-brand-500 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-brand-600 block tracking-wider">Transferts Reçus</span>
            <ArrowRightLeft className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-lg font-black text-brand-600 dark:text-brand-400 mt-1">
            +{formatCurrency(totalTransfersIn, currency)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Virements entrants</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Transferts Émis</span>
            <ArrowRightLeft className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">
            -{formatCurrency(totalTransfersOut, currency)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Virements sortants</span>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'movements'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Mouvements Récents & Écritures ({accountMovements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Journal des Actions Administratives ({accountAuditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres & Modes Associés</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MOVEMENTS & FLOWS */}
      {/* ========================================================================= */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="w-40">
                <Select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as any)}
                  options={[
                    { value: 'ALL', label: 'Toutes les dates' },
                    { value: 'TODAY', label: "Aujourd'hui" },
                    { value: 'WEEK', label: '7 derniers jours' },
                    { value: 'MONTH', label: 'Ce mois-ci' },
                    { value: 'YEAR', label: 'Cette année' },
                    { value: 'CUSTOM', label: 'Période personnalisée' }
                  ]}
                />
              </div>

              {periodFilter === 'CUSTOM' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-xs p-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-400">à</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-xs p-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              <div className="w-44">
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'Tous les flux' },
                    { value: 'INFLOW', label: 'Entrées (+)' },
                    { value: 'OUTFLOW', label: 'Sorties (-)' },
                    { value: 'TRANSFER', label: 'Transferts internes' },
                    { value: 'ADJUSTMENT', label: 'Ajustements de solde' },
                    { value: 'RESET', label: 'Réinitialisations' }
                  ]}
                />
              </div>
            </div>

            <div className="w-full sm:w-64 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher réf, motif, auteur..."
                className="pl-9 text-xs h-9 rounded-xl"
              />
            </div>
          </div>

          {/* Movements Table */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Réf</TableHead>
                    <TableHead>Catégorie / Type</TableHead>
                    <TableHead className="text-right">Entrée (+)</TableHead>
                    <TableHead className="text-right">Sortie (-)</TableHead>
                    <TableHead className="text-right">Solde Après</TableHead>
                    <TableHead>Motif / Observation</TableHead>
                    <TableHead>Auteur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        Aucune écriture financière trouvée pour les filtres sélectionnés.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements.map(m => {
                      const isIncoming = m.movementType === 'INFLOW' || (m.movementType === 'TRANSFER' && m.toAccountId === account.id);
                      const isAdjustment = m.category === 'BALANCE_ADJUSTMENT';
                      const isReset = m.category === 'ACCOUNT_RESET';
                      const amount = Number(m.amount) || 0;
                      const balAfter = m.balanceAfter !== undefined ? m.balanceAfter : (account.currentBalance || 0);

                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <span className="font-mono font-bold text-xs text-brand-600 block">
                              {m.reference || m.movementNumber || '—'}
                            </span>
                            <span className="text-[10px] text-slate-400">{formatDate(m.createdAt)}</span>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                isReset
                                  ? 'danger'
                                  : isAdjustment
                                  ? 'warning'
                                  : isIncoming
                                  ? 'success'
                                  : 'danger'
                              }
                              size="sm"
                              className="font-bold text-[10px]"
                            >
                              {m.categoryLabel || (isIncoming ? 'Entrée' : 'Sortie')}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            {isIncoming ? (
                              <span className="text-xs font-black text-emerald-600">
                                +{formatCurrency(amount, currency)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {!isIncoming ? (
                              <span className="text-xs font-black text-rose-600">
                                -{formatCurrency(amount, currency)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatCurrency(balAfter, currency)}
                            </span>
                          </TableCell>

                          <TableCell className="max-w-xs truncate text-xs text-slate-600 dark:text-slate-400">
                            {m.notes || m.reason || '—'}
                          </TableCell>

                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                            {m.performedByUserName || 'Système'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ADMINISTRATIVE AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2.5 shadow-sm">
            <ShieldCheck className="w-5 h-5 shrink-0 text-amber-600" />
            <span>
              Journal officiel des actions administratives (Créations, Modifications, Ajustements manuels de solde, Réinitialisations, etc.).
            </span>
          </div>

          <div className="space-y-3">
            {accountAuditLogs.length === 0 ? (
              <Card className="p-10 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800">
                Aucune trace d'audit administratif enregistrée pour ce compte.
              </Card>
            ) : (
              accountAuditLogs.map(log => {
                const isReset = log.action === 'FINANCIAL_ACCOUNT_RESET';
                const isAdj = log.action === 'FINANCIAL_ACCOUNT_ADJUSTED';
                const isStatus = log.action.includes('ACTIVATED') || log.action.includes('DEACTIVATED');

                return (
                  <Card
                    key={log.id}
                    className="p-4 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={isReset ? 'danger' : isAdj ? 'warning' : isStatus ? 'outline' : 'primary'}
                          size="sm"
                          className="font-bold text-[10px]"
                        >
                          {log.action.replace('FINANCIAL_ACCOUNT_', '').replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {log.userName || 'Administrateur'}
                        </span>
                        {log.newValues?.userRole && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {log.newValues.userRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDate(log.createdAt, 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>

                    {log.newValues?.description && (
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100/70 dark:bg-slate-800/50 p-2 rounded-lg">
                        {log.newValues.description}
                      </p>
                    )}

                    {log.newValues && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                        {log.newValues.reason && (
                          <div><strong>Motif consigné :</strong> {log.newValues.reason}</div>
                        )}
                        {log.newValues.differenceFormatted && (
                          <div><strong>Écart appliqué :</strong> {log.newValues.differenceFormatted}</div>
                        )}
                        {log.newValues.previousBalance !== undefined && (
                          <div><strong>Ancien Solde :</strong> {formatCurrency(log.newValues.previousBalance, currency)}</div>
                        )}
                        {log.newValues.newBalance !== undefined && (
                          <div><strong>Nouveau Solde :</strong> {formatCurrency(log.newValues.newBalance, currency)}</div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONFIGURATION & DETAILS */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                Informations Système
              </span>
              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Nom Officiel :</span>
                  <strong className="text-slate-900 dark:text-white">{account.name}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Code Compte :</span>
                  <strong className="font-mono">{account.code}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Type de Compte :</span>
                  <strong>{isBank ? 'Banque' : isMomo ? 'Mobile Money' : 'Caisse Espèces'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Devise :</span>
                  <strong>{currency}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Date d'Enregistrement :</span>
                  <span>{formatDate(account.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Créé par :</span>
                  <span>{account.createdByUserName || 'Administrateur'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                Coordonnées & Établissement
              </span>
              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Banque / Établissement :</span>
                  <strong>{account.bankName || 'Non spécifié'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>N° Compte / N° Téléphone :</span>
                  <strong className="font-mono">{account.accountNumber || 'Non spécifié'}</strong>
                </div>
                <div className="py-1">
                  <span className="block text-slate-500 mb-0.5">Description & Utilisation :</span>
                  <p className="italic text-slate-800 dark:text-slate-200">{account.description || 'Aucune description spécifique.'}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Associated Payment Methods */}
          <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
              Modes de Paiement Associés à ce Compte
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {account.associatedPaymentMethods && account.associatedPaymentMethods.length > 0 ? (
                account.associatedPaymentMethods.map(pm => (
                  <Badge key={pm} variant="primary" size="sm" className="font-bold text-xs py-1 px-2.5">
                    {pm.replace('_', ' ')}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Tous les modes compatibles avec le type {account.type} sont acceptés par défaut.
                </span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export const FinancialAccountDetailView: React.FC<Props> = (props) => {
  return (
    <DetailErrorBoundary onBack={props.onBack}>
      <FinancialAccountDetailViewInternal {...props} />
    </DetailErrorBoundary>
  );
};
