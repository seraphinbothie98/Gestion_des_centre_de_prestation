import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
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
  Settings, Clock, User, AlertTriangle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  onEdit: (account: FinancialAccount) => void;
  onAdjust: (account: FinancialAccount) => void;
  onReset: (account: FinancialAccount) => void;
  onToggleStatus: (account: FinancialAccount) => void;
  onDeleteOrTransfer: (account: FinancialAccount) => void;
  onTransfer: (fromAccountId: string) => void;
}

export const FinancialAccountDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  account,
  onEdit,
  onAdjust,
  onReset,
  onToggleStatus,
  onDeleteOrTransfer,
  onTransfer
}) => {
  const { currentTenant, isSuperAdmin } = useAuth();
  const state = dbStore.getState();

  const [activeTab, setActiveTab] = useState<'movements' | 'audit' | 'config'>('movements');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!account) return null;

  const isBank = account.type === 'BANK';
  const isMomo = account.type === 'MOBILE_MONEY';
  const isCash = account.type === 'CASH';

  // Extract movements for this specific account
  const accountMovements = useMemo(() => {
    return (state.financialMovements || []).filter(
      m => m.financialAccountId === account.id || m.fromAccountId === account.id || m.toAccountId === account.id
    );
  }, [state.financialMovements, account.id]);

  // Extract audit logs for this specific account
  const accountAuditLogs = useMemo(() => {
    return dbStore.getFinancialAccountAuditLogs(account.id, account.tenantId);
  }, [state.auditLogs, account.id, account.tenantId]);

  // Filter movements by period & category & search
  const filteredMovements = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return accountMovements.filter(m => {
      const mDate = new Date(m.createdAt);
      const mDateStr = m.createdAt.split('T')[0];

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
        const matchesRef = m.reference && m.reference.toLowerCase().includes(q);
        const matchesMvtNum = m.movementNumber && m.movementNumber.toLowerCase().includes(q);
        const matchesNotes = m.notes && m.notes.toLowerCase().includes(q);
        const matchesUser = m.performedByUserName && m.performedByUserName.toLowerCase().includes(q);
        const matchesLabel = m.categoryLabel && m.categoryLabel.toLowerCase().includes(q);
        if (!matchesRef && !matchesMvtNum && !matchesNotes && !matchesUser && !matchesLabel) return false;
      }

      return true;
    });
  }, [accountMovements, periodFilter, customStartDate, customEndDate, categoryFilter, searchQuery]);

  // Movement Statistics for filtered period
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredMovements.forEach(m => {
      const isIncoming = m.movementType === 'INFLOW' || (m.movementType === 'TRANSFER' && m.toAccountId === account.id);
      if (isIncoming) totalIn += m.amount;
      else totalOut += m.amount;
    });
    return { totalIn, totalOut, count: filteredMovements.length };
  }, [filteredMovements, account.id]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fiche Détaillée du Compte Financier"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md ${
                isBank
                  ? 'bg-amber-600 text-white'
                  : isMomo
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                {isBank ? <Landmark className="w-6 h-6" /> : isMomo ? <Smartphone className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white">{account.name}</h3>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
                    {account.code}
                  </span>
                  {account.isDefault && (
                    <span className="bg-brand-500/30 text-brand-300 border border-brand-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Compte par Défaut
                    </span>
                  )}
                  {account.isMainCash && (
                    <span className="bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Caisse Principale
                    </span>
                  )}
                  {account.isPettyCash && (
                    <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Petite Caisse
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBank ? 'Compte Bancaire' : isMomo ? 'Portefeuille Mobile Money' : 'Caisse d\'Espèces'}
                  {account.bankName ? ` • ${account.bankName}` : ''}
                  {account.accountNumber ? ` • N° ${account.accountNumber}` : ''}
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
              <span className="text-[10px] uppercase font-bold text-slate-400">Solde Actuel Disponible</span>
              <div className="text-2xl font-black text-brand-400">
                {formatCurrency(account.currentBalance, account.currency)}
              </div>
              <Badge variant={account.isActive ? 'success' : 'outline'} size="sm" className="mt-1">
                {account.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-700/80">
            <Button
              size="sm"
              variant="outline"
              icon={Edit}
              onClick={() => onEdit(account)}
              className="text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-600"
            >
              Modifier
            </Button>

            <Button
              size="sm"
              variant="outline"
              icon={Scale}
              onClick={() => onAdjust(account)}
              className="text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border-amber-800/80"
            >
              Ajuster Solde
            </Button>

            <Button
              size="sm"
              variant="outline"
              icon={ArrowRightLeft}
              onClick={() => onTransfer(account.id)}
              disabled={!account.isActive || account.currentBalance <= 0}
              className="text-xs font-bold text-brand-300 bg-brand-950/40 hover:bg-brand-900/60 border-brand-800/80"
            >
              Transférer
            </Button>

            <Button
              size="sm"
              variant="outline"
              icon={AlertOctagon}
              onClick={() => onReset(account)}
              className="text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/80"
            >
              Réinitialiser à 0
            </Button>

            {!account.isMainCash && (
              <Button
                size="sm"
                variant="outline"
                icon={Power}
                onClick={() => onToggleStatus(account)}
                className={`text-xs font-bold ${
                  account.isActive
                    ? 'text-amber-400 bg-slate-800 hover:bg-slate-700 border-slate-600'
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
              className="text-xs font-bold text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 border-slate-600 ml-auto"
            >
              Supprimer / Assistant
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'movements'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mouvements & Écritures ({accountMovements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Journal des Actions Administratives ({accountAuditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
            {/* KPI Cards for Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Entrées (Période)</span>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  +{formatCurrency(stats.totalIn, account.currency)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sorties (Période)</span>
                <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  -{formatCurrency(stats.totalOut, account.currency)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Solde Initial Enregistré</span>
                <div className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                  {formatCurrency(account.initialBalance, account.currency)}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="w-36">
                  <Select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value as any)}
                    options={[
                      { value: 'ALL', label: 'Toutes les dates' },
                      { value: 'TODAY', label: "Aujourd'hui" },
                      { value: 'WEEK', label: '7 derniers jours' },
                      { value: 'MONTH', label: 'Ce mois-ci' },
                      { value: 'YEAR', label: 'Cette année' },
                      { value: 'CUSTOM', label: 'Personnalisée' }
                    ]}
                  />
                </div>

                {periodFilter === 'CUSTOM' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs p-1.5 border rounded-lg bg-white dark:bg-slate-900"
                    />
                    <span className="text-xs text-slate-400">à</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs p-1.5 border rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>
                )}

                <div className="w-40">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'Tous les flux' },
                      { value: 'INFLOW', label: 'Entrées (+)' },
                      { value: 'OUTFLOW', label: 'Sorties (-)' },
                      { value: 'TRANSFER', label: 'Transferts' },
                      { value: 'ADJUSTMENT', label: 'Ajustements Solde' },
                      { value: 'RESET', label: 'Réinitialisations' }
                    ]}
                  />
                </div>
              </div>

              <div className="w-full sm:w-60 relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher référence, motif..."
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>

            {/* Movements Table */}
            <div className="overflow-x-auto max-h-96 border rounded-xl border-slate-200 dark:border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Réf</TableHead>
                    <TableHead>Catégorie / Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">Solde Après</TableHead>
                    <TableHead>Motif / Détails</TableHead>
                    <TableHead>Auteur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        Aucun mouvement financier trouvé pour les filtres sélectionnés.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements.map(m => {
                      const isIncoming = m.movementType === 'INFLOW' || (m.movementType === 'TRANSFER' && m.toAccountId === account.id);
                      const isAdjustment = m.category === 'BALANCE_ADJUSTMENT';
                      const isReset = m.category === 'ACCOUNT_RESET';

                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <span className="font-mono font-bold text-xs text-brand-600 block">
                              {m.reference || m.movementNumber}
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
                            <span className={`text-xs font-black ${isIncoming ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isIncoming ? '+' : '-'}{formatCurrency(m.amount, account.currency)}
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {formatCurrency(m.balanceAfter, account.currency)}
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ADMINISTRATIVE AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Traçabilité sécurisée des actions administratives (Créations, Modifications, Ajustements manuels, Réinitialisations, etc.).
              </span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {accountAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Aucune trace d'audit administratif enregistrée pour ce compte.
                </div>
              ) : (
                accountAuditLogs.map(log => {
                  const isReset = log.action === 'FINANCIAL_ACCOUNT_RESET';
                  const isAdj = log.action === 'FINANCIAL_ACCOUNT_ADJUSTED';
                  const isStatus = log.action.includes('ACTIVATED') || log.action.includes('DEACTIVATED');

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
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
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {log.newValues && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5">
                          {log.newValues.reason && (
                            <div><strong>Motif :</strong> {log.newValues.reason}</div>
                          )}
                          {log.newValues.differenceFormatted && (
                            <div><strong>Écart appliqué :</strong> {log.newValues.differenceFormatted}</div>
                          )}
                          {log.newValues.previousBalance !== undefined && (
                            <div><strong>Ancien Solde :</strong> {formatCurrency(log.newValues.previousBalance, account.currency)}</div>
                          )}
                          {log.newValues.newBalance !== undefined && (
                            <div><strong>Nouveau Solde :</strong> {formatCurrency(log.newValues.newBalance, account.currency)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CONFIGURATION & ASSOCIATED PAYMENT METHODS */}
        {/* ========================================================================= */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                  Informations Générales
                </span>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Code Compte :</span>
                    <strong className="font-mono">{account.code}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Devise :</span>
                    <strong>{account.currency}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Statut :</span>
                    <strong className={account.isActive ? 'text-emerald-600' : 'text-slate-400'}>
                      {account.isActive ? 'Actif' : 'Inactif'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Date de Création :</span>
                    <span>{formatDate(account.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Créé par :</span>
                    <span>{account.createdByUserName || 'Administrateur'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                  Coordonnées & Établissement
                </span>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Banque / Opérateur :</span>
                    <strong>{account.bankName || 'Non spécifié'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>N° Compte / N° Téléphone :</span>
                    <strong className="font-mono">{account.accountNumber || 'Non spécifié'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Description :</span>
                    <span>{account.description || 'Aucune description'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Associated Payment Methods */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
                Modes de Paiement Liés
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {account.associatedPaymentMethods && account.associatedPaymentMethods.length > 0 ? (
                  account.associatedPaymentMethods.map(pm => (
                    <Badge key={pm} variant="primary" size="sm" className="font-bold text-xs">
                      {pm.replace('_', ' ')}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Tous les modes compatibles avec le type {account.type} sont acceptés.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Fermer la Fiche
          </Button>
        </div>
      </div>
    </Modal>
  );
};
