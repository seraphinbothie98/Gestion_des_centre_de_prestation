import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { dbStore } from '../../../server/db/mockStore';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { FinancialYear, FinancialPeriod, FinancialPeriodStatus } from '../../../types';
import { formatCurrency, formatDate } from '../../../lib/utils';
import {
  Calendar, Lock, Unlock, Archive, RefreshCw, Plus, CheckCircle2,
  AlertTriangle, Eye, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown, DollarSign, Clock, ShieldCheck, Printer,
  FileSpreadsheet
} from 'lucide-react';

interface FinancialYearsAndPeriodsViewProps {
  selectedYearId: string;
  selectedPeriodId: string;
  onSelectYear: (yearId: string) => void;
  onSelectPeriod: (periodId: string) => void;
}

export const FinancialYearsAndPeriodsView: React.FC<FinancialYearsAndPeriodsViewProps> = ({
  selectedYearId,
  selectedPeriodId,
  onSelectYear,
  onSelectPeriod
}) => {
  const { currentTenant, currentUser, isSuperAdmin, canManageSensitiveFinancials } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const currentAgencyId = currentTenant?.id || 't-001';
  const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur';

  // Financial Years for this tenant
  const financialYears = useMemo(() => {
    return dbStore.getFinancialYears(currentAgencyId);
  }, [state.financialYears, currentAgencyId]);

  // Current selected Financial Year object
  const activeYear = useMemo(() => {
    return financialYears.find(y => y.id === selectedYearId) || financialYears.find(y => y.isCurrentYear) || financialYears[0];
  }, [financialYears, selectedYearId]);

  // Financial Periods for selected year
  const financialPeriods = useMemo(() => {
    if (!activeYear) return [];
    return dbStore.getFinancialPeriods(activeYear.id, currentAgencyId);
  }, [state.financialPeriods, activeYear, currentAgencyId]);

  // Modals state
  const [isCreateYearModalOpen, setIsCreateYearModalOpen] = useState(false);
  const [newYearNumber, setNewYearNumber] = useState<number>(new Date().getFullYear() + 1);
  const [newYearName, setNewYearName] = useState('');
  const [newYearCode, setNewYearCode] = useState('');
  const [newYearNotes, setNewYearNotes] = useState('');

  const [periodToClose, setPeriodToClose] = useState<FinancialPeriod | null>(null);
  const [periodToArchive, setPeriodToArchive] = useState<FinancialPeriod | null>(null);
  const [periodToReopen, setPeriodToReopen] = useState<FinancialPeriod | null>(null);
  const [periodToReset, setPeriodToReset] = useState<FinancialPeriod | null>(null);
  const [resetOption, setResetOption] = useState<'ZERO_ALL' | 'KEEP_BALANCES' | 'CUSTOM'>('ZERO_ALL');
  const [customBalances, setCustomBalances] = useState<Record<string, number>>({});

  const [periodForDetail, setPeriodForDetail] = useState<FinancialPeriod | null>(null);

  // Agency accounts for custom balance inputs
  const agencyAccounts = useMemo(() => {
    if (currentAgencyId === 'ALL') return state.financialAccounts || [];
    return (state.financialAccounts || []).filter(a => a.tenantId === currentAgencyId);
  }, [state.financialAccounts, currentAgencyId]);

  // Handle Create Year
  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    const res = dbStore.createFinancialYear({
      year: Number(newYearNumber),
      code: newYearCode || `EX-${newYearNumber}`,
      name: newYearName || `Exercice Financier ${newYearNumber}`,
      notes: newYearNotes,
      activateNow: false
    }, currentAgencyId, userName, isSuperAdmin);

    if (res.success && res.year) {
      showToast(res.message, 'success');
      setIsCreateYearModalOpen(false);
      onSelectYear(res.year.id);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Handle Close Period
  const handleConfirmClosePeriod = () => {
    if (!periodToClose) return;
    const res = dbStore.closeFinancialPeriod(periodToClose.id, currentAgencyId, userName, isSuperAdmin);
    if (res.success) {
      showToast(res.message, 'success');
      setPeriodToClose(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Handle Archive Period
  const handleConfirmArchivePeriod = () => {
    if (!periodToArchive) return;
    const res = dbStore.archiveFinancialPeriod(periodToArchive.id, currentAgencyId, userName, isSuperAdmin);
    if (res.success) {
      showToast(res.message, 'success');
      setPeriodToArchive(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Handle Reopen Period
  const handleConfirmReopenPeriod = () => {
    if (!periodToReopen) return;
    const res = dbStore.reopenFinancialPeriod(periodToReopen.id, currentAgencyId, userName, isSuperAdmin);
    if (res.success) {
      showToast(res.message, 'success');
      setPeriodToReopen(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Handle Reset Period (Fresh Start)
  const handleConfirmResetPeriod = () => {
    if (!periodToReset) return;
    const res = dbStore.resetFinancialPeriod(
      periodToReset.id,
      currentAgencyId,
      resetOption,
      customBalances,
      userName,
      isSuperAdmin
    );
    if (res.success) {
      showToast(res.message, 'success');
      setPeriodToReset(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Detail summary for modal
  const periodDetailSummary = useMemo(() => {
    if (!periodForDetail) return null;
    return dbStore.getPeriodFinancialSummary(currentAgencyId, periodForDetail.financialYearId, periodForDetail.id);
  }, [periodForDetail, currentAgencyId, state]);

  // Calculate statistics for each period in grid
  const periodSummaries = useMemo(() => {
    const map: Record<string, ReturnType<typeof dbStore.getPeriodFinancialSummary>> = {};
    financialPeriods.forEach(p => {
      map[p.id] = dbStore.getPeriodFinancialSummary(currentAgencyId, p.financialYearId, p.id);
    });
    return map;
  }, [financialPeriods, currentAgencyId, state.financialMovements, state.financialAccounts]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION: FINANCIAL YEARS & ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-900/50">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Calendar className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Exercices & Périodes Financières</h2>
              <p className="text-xs text-slate-300">
                Architecture comptable officielle, isolation temporelle des flux et archivage réglementaire.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year selector pills */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {financialYears.map(fy => {
              const isSelected = activeYear?.id === fy.id;
              return (
                <button
                  key={fy.id}
                  onClick={() => onSelectYear(fy.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <span>{fy.name}</span>
                  {fy.isCurrentYear && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Exercice en cours" />
                  )}
                </button>
              );
            })}
          </div>

          {canManageSensitiveFinancials && (
            <Button
              onClick={() => {
                setNewYearNumber(activeYear ? activeYear.year + 1 : new Date().getFullYear() + 1);
                setNewYearName(`Exercice Financier ${activeYear ? activeYear.year + 1 : new Date().getFullYear() + 1}`);
                setNewYearCode(`EX-${activeYear ? activeYear.year + 1 : new Date().getFullYear() + 1}`);
                setIsCreateYearModalOpen(true);
              }}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold py-2 px-3.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Nouvel Exercice
            </Button>
          )}
        </div>
      </div>

      {/* ACTIVE YEAR BANNER & CONTROLS */}
      {activeYear && (
        <Card className="border-indigo-100 dark:border-indigo-950 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-black text-lg">
                {activeYear.year}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{activeYear.name}</h3>
                  <Badge
                    variant={
                      activeYear.status === 'ACTIVE' ? 'success' : activeYear.status === 'CLOSED' ? 'warning' : 'outline'
                    }
                    className="text-[11px] font-semibold"
                  >
                    {activeYear.status === 'ACTIVE' ? 'ACTIF' : activeYear.status === 'CLOSED' ? 'CLÔTURÉ' : 'ARCHIVÉ'}
                  </Badge>
                  {activeYear.isCurrentYear && (
                    <Badge variant="primary" className="text-[10px] uppercase font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                      Exercice par Défaut
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Période du <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(activeYear.startDate)}</span> au <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(activeYear.endDate)}</span> • Code : {activeYear.code}
                </p>
              </div>
            </div>

            {canManageSensitiveFinancials && (
              <div className="flex items-center gap-2">
                {!activeYear.isCurrentYear && activeYear.status === 'ACTIVE' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const res = dbStore.setActiveFinancialYear(activeYear.id, currentAgencyId, userName, isSuperAdmin);
                      if (res.success) {
                        showToast(res.message, 'success');
                        onSelectYear(activeYear.id);
                      }
                    }}
                    className="text-xs font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Définir Actif
                  </Button>
                )}

                {activeYear.status === 'ACTIVE' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Attention : cette action peut avoir un impact sur les données financières. Êtes-vous sûr de vouloir continuer ?\n\nClôturer l'exercice financier ${activeYear.year} ? Toutes ses périodes seront également clôturées.`)) {
                        const res = dbStore.closeFinancialYear(activeYear.id, currentAgencyId, userName, isSuperAdmin);
                        if (res.success) showToast(res.message, 'success');
                      }
                    }}
                    className="text-xs font-medium text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    Clôturer l'Exercice
                  </Button>
                )}

                {activeYear.status === 'CLOSED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Attention : cette action peut avoir un impact sur les données financières. Êtes-vous sûr de vouloir continuer ?\n\nArchiver définitivement l'exercice financier ${activeYear.year} ?`)) {
                        const res = dbStore.archiveFinancialYear(activeYear.id, currentAgencyId, userName, isSuperAdmin);
                        if (res.success) showToast(res.message, 'success');
                      }
                    }}
                    className="text-xs font-medium text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800 hover:bg-purple-50"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1.5" />
                    Archiver l'Exercice
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* MONTHLY PERIODS GRID (12 PERIODS) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Périodes Mensuelles ({financialPeriods.length})</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Exercice {activeYear?.year || 2026}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cliquez sur une période pour l'inspecter, clôturer ses écritures ou initialiser un nouveau cycle.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {financialPeriods.map(period => {
            const summary = periodSummaries[period.id];
            const isSelected = selectedPeriodId === period.id;
            const isOpen = period.status === 'OPEN';
            const isClosed = period.status === 'CLOSED';
            const isArchived = period.status === 'ARCHIVED';

            return (
              <div
                key={period.id}
                className={`relative rounded-2xl p-4 transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                {/* TOP ROW: MONTH & STATUS */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {period.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {period.code}
                      </p>
                    </div>

                    <Badge
                      variant={
                        isOpen ? 'success' : isClosed ? 'warning' : 'outline'
                      }
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 flex items-center gap-1"
                    >
                      {isOpen && <Unlock className="w-3 h-3" />}
                      {isClosed && <Lock className="w-3 h-3" />}
                      {isArchived && <Archive className="w-3 h-3" />}
                      <span>{isOpen ? 'OUVERTE' : isClosed ? 'CLÔTURÉE' : 'ARCHIVÉE'}</span>
                    </Badge>
                  </div>

                  {/* DATES */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-1.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>Du {formatDate(period.startDate)}</span>
                    <span>Au {formatDate(period.endDate)}</span>
                  </div>

                  {/* KPI STATS FOR PERIOD */}
                  {summary && (
                    <div className="space-y-1.5 text-xs mb-4">
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                          Encaissements :
                        </span>
                        <span>+{formatCurrency(summary.totalInflows)} GNF</span>
                      </div>

                      <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-medium">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                          Décaissements :
                        </span>
                        <span>-{formatCurrency(summary.totalOutflows)} GNF</span>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                        <span className="text-slate-700 dark:text-slate-300 text-[11px]">Flux Net :</span>
                        <span className={summary.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)} GNF
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span>Opérations :</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{summary.movementsCount} écriture(s)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSelectPeriod(period.id);
                      setPeriodForDetail(period);
                    }}
                    className="flex-1 text-[11px] py-1 h-7 font-medium text-slate-700 dark:text-slate-300"
                  >
                    <Eye className="w-3 h-3 mr-1 text-indigo-500" />
                    Bilan
                  </Button>

                  {canManageSensitiveFinancials && (
                    <>
                      {isOpen ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPeriodToClose(period)}
                          className="text-[11px] py-1 h-7 font-medium text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50"
                          title="Clôturer cette période mensuelle"
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Clôturer
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPeriodToReopen(period)}
                          className="text-[11px] py-1 h-7 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50"
                          title="Réouvrir cette période mensuelle"
                        >
                          <Unlock className="w-3 h-3 mr-1" />
                          Réouvrir
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPeriodToReset(period);
                          setResetOption('ZERO_ALL');
                          const initialCustom: Record<string, number> = {};
                          agencyAccounts.forEach(a => {
                            initialCustom[a.id] = 0;
                          });
                          setCustomBalances(initialCustom);
                        }}
                        className="text-[11px] py-1 h-7 font-medium text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50"
                        title="Nouveau départ / Configuration des soldes"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CRÉER UN NOUVEL EXERCICE FINANCIER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateYearModalOpen}
        onClose={() => setIsCreateYearModalOpen(false)}
        title="Création d'un Nouvel Exercice Financier"
      >
        <form onSubmit={handleCreateYear} className="space-y-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300">
            <p className="font-semibold mb-1">Architecture Comptable Automatisée :</p>
            <p>
              La création d'un exercice financier génère automatiquement les <strong>12 périodes mensuelles</strong> de Janvier à Décembre associées à votre agence.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Année de l'exercice *
            </label>
            <Input
              type="number"
              min={2020}
              max={2050}
              value={newYearNumber}
              onChange={e => {
                const y = Number(e.target.value);
                setNewYearNumber(y);
                setNewYearName(`Exercice Financier ${y}`);
                setNewYearCode(`EX-${y}`);
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Code Exercice
              </label>
              <Input
                value={newYearCode}
                onChange={e => setNewYearCode(e.target.value)}
                placeholder="EX-2027"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Intitulé Exercice
              </label>
              <Input
                value={newYearName}
                onChange={e => setNewYearName(e.target.value)}
                placeholder="Exercice Financier 2027"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observations / Contexte
            </label>
            <Input
              value={newYearNotes}
              onChange={e => setNewYearNotes(e.target.value)}
              placeholder="Ex: Nouvel exercice prévisionnel de développement..."
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateYearModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Créer l'Exercice & 12 Périodes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CLÔTURE DE PÉRIODE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(periodToClose)}
        onClose={() => setPeriodToClose(null)}
        title={`Clôture de la période : ${periodToClose?.name}`}
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Attention - Règle de Verrouillage Comptable :</p>
              <p>
                La clôture de la période <strong>{periodToClose?.name}</strong> verrouille toutes les écritures financières associées.
                Aucun encaissement, décaissement, dépense ou transfert ne pourra plus être enregistré avec une date comprise dans cette période.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Les rapports financiers resteront consultables et imprimables en lecture seule dans l'historique de votre agence.
          </p>

          <div className="pt-3 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPeriodToClose(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmClosePeriod}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Confirmer la Clôture
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ARCHIVAGE DE PÉRIODE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(periodToArchive)}
        onClose={() => setPeriodToArchive(null)}
        title={`Archivage : ${periodToArchive?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Confirmez-vous l'archivage de la période <strong>{periodToArchive?.name}</strong> ?
            Elle passera en statut <span className="font-semibold text-purple-600">ARCHIVÉE</span>.
          </p>
          <div className="pt-3 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPeriodToArchive(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmArchivePeriod}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              Confirmer l'Archivage
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: RÉOUVERTURE DE PÉRIODE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(periodToReopen)}
        onClose={() => setPeriodToReopen(null)}
        title={`Réouverture : ${periodToReopen?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Êtes-vous sûr de vouloir réouvrir la période <strong>{periodToReopen?.name}</strong> ?
            Elle repassera en statut <span className="font-semibold text-emerald-600">OUVERTE</span> et permettra à nouveau la saisie d'écritures.
          </p>
          <div className="pt-3 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPeriodToReopen(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmReopenPeriod}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Confirmer la Réouverture
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: NOUVEAU DÉPART / RÉINITIALISATION DE PÉRIODE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(periodToReset)}
        onClose={() => setPeriodToReset(null)}
        title={`Configuration du cycle : ${periodToReset?.name}`}
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Garantie d'intégrité comptable :
            </div>
            <p>
              Toutes les transactions, encaissements et dépenses des périodes antérieures sont conservés intacts dans l'historique et les rapports passés.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Choisissez l'option d'initialisation pour cette période :
            </label>

            <div className="grid grid-cols-1 gap-2">
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  resetOption === 'ZERO_ALL'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  checked={resetOption === 'ZERO_ALL'}
                  onChange={() => setResetOption('ZERO_ALL')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Départ propre à 0 GNF (Recommandé pour nouvelle période nette)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tous les comptes financiers de l'agence démarrent avec un solde actif de 0 GNF pour cette période.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  resetOption === 'KEEP_BALANCES'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  checked={resetOption === 'KEEP_BALANCES'}
                  onChange={() => setResetOption('KEEP_BALANCES')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Report à nouveau des soldes actuels
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Les soldes de clôture de la période précédente sont automatiquement reconduits comme soldes initiaux.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  resetOption === 'CUSTOM'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  checked={resetOption === 'CUSTOM'}
                  onChange={() => setResetOption('CUSTOM')}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Soldes d'ouverture personnalisés par compte
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Saisissez manuellement le solde de départ pour chaque compte financier.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* CUSTOM BALANCES FORM */}
          {resetOption === 'CUSTOM' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Soldes initiaux par compte :
              </p>
              {agencyAccounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{acc.name} :</span>
                  <div className="w-36">
                    <Input
                      type="number"
                      min={0}
                      value={customBalances[acc.id] || 0}
                      onChange={e => setCustomBalances({
                        ...customBalances,
                        [acc.id]: Number(e.target.value)
                      })}
                      className="text-right h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPeriodToReset(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmResetPeriod}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Appliquer la Configuration
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: BILAN & DÉTAILS DE LA PÉRIODE */}
      {/* ========================================================================= */}
      {periodForDetail && periodDetailSummary && (
        <Modal
          isOpen={Boolean(periodForDetail)}
          onClose={() => setPeriodForDetail(null)}
          title={`Bilan Financier : ${periodForDetail.name}`}
          maxWidth="lg"
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* PERIOD BANNER */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-bold">{periodForDetail.name}</span>
                  <Badge variant={periodForDetail.status === 'OPEN' ? 'success' : 'warning'}>
                    {periodForDetail.status === 'OPEN' ? 'OUVERTE' : 'CLÔTURÉE'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">
                  Du {formatDate(periodForDetail.startDate)} au {formatDate(periodForDetail.endDate)} • Code : {periodForDetail.code}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-indigo-300 uppercase tracking-wider font-semibold">Trésorerie Consolidée</p>
                <p className="text-xl font-black text-emerald-400">
                  {formatCurrency(periodDetailSummary.consolidatedTreasury)} GNF
                </p>
              </div>
            </div>

            {/* KPI METRICS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Total Encaissements</p>
                <p className="text-base font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                  +{formatCurrency(periodDetailSummary.totalInflows)} GNF
                </p>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50">
                <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">Total Décaissements</p>
                <p className="text-base font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                  -{formatCurrency(periodDetailSummary.totalOutflows)} GNF
                </p>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50">
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">Flux Net Période</p>
                <p className={`text-base font-bold mt-0.5 ${periodDetailSummary.netCashFlow >= 0 ? 'text-indigo-900 dark:text-indigo-300' : 'text-rose-700'}`}>
                  {periodDetailSummary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(periodDetailSummary.netCashFlow)} GNF
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Écritures Enregistrées</p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {periodDetailSummary.movementsCount} opération(s)
                </p>
              </div>
            </div>

            {/* BREAKDOWN BY ACCOUNT */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-indigo-500" />
                Situation par Compte Financier
              </h4>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                    <TableRow>
                      <TableHead className="text-xs">Compte</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs text-right">Encaissements</TableHead>
                      <TableHead className="text-xs text-right">Décaissements</TableHead>
                      <TableHead className="text-xs text-right">Solde Actuel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodDetailSummary.accountsBreakdown.map(acc => (
                      <TableRow key={acc.id} className="text-xs">
                        <TableCell className="font-medium text-slate-800 dark:text-slate-100">
                          {acc.name}
                          {acc.isMainCash && (
                            <span className="ml-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">(Caisse Principale)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {acc.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-semibold">
                          +{formatCurrency(acc.inflows)} GNF
                        </TableCell>
                        <TableCell className="text-right text-rose-600 font-semibold">
                          -{formatCurrency(acc.outflows)} GNF
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(acc.currentBalance)} GNF
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between items-center">
              <div className="text-xs text-slate-500">
                Agence : <span className="font-semibold text-slate-700 dark:text-slate-300">{currentTenant?.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimer Bilan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPeriodForDetail(null)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
