import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { CashSession, CashMovement, Expense, ExpenseCategory, PaymentMethod, FinancialAccount, FinancialMovement, FinancialAccountType, SupplierDebt, SupplierPayment } from '../../types';
import { formatCurrency, formatDate, generateDocNumber } from '../../lib/utils';
import {
  Wallet, Lock, Unlock, Plus, Minus, ArrowUpRight,
  ArrowDownRight, CheckCircle2, AlertTriangle, History, DollarSign,
  Printer, Download, Calendar, Filter, FileText, Check, X,
  ShoppingBag, GraduationCap, Percent, TrendingUp, TrendingDown,
  PieChart as PieIcon, BarChart3, AlertCircle, ShieldCheck, User, RefreshCw,
  Landmark, Smartphone, ArrowRightLeft, CreditCard, Edit, Eye, Power,
  Scale, AlertOctagon, Trash2, MoreVertical, LayoutGrid, List, Search, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

import { ClientDebtsView } from '../debts/ClientDebtsView';
import { FinancialAccountDetailModal } from './components/FinancialAccountDetailModal';
import { FinancialAccountEditModal } from './components/FinancialAccountEditModal';
import { FinancialAccountAdjustBalanceModal } from './components/FinancialAccountAdjustBalanceModal';
import { FinancialAccountResetModal } from './components/FinancialAccountResetModal';
import { FinancialAccountDeleteAssistantModal } from './components/FinancialAccountDeleteAssistantModal';
import { FinancialAccountCard } from './components/FinancialAccountCard';
import { FinancialAccountDetailView } from './components/FinancialAccountDetailView';
import { FinancialYearsAndPeriodsView } from './components/FinancialYearsAndPeriodsView';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money (Orange/MTN/Wave)',
  BANK_TRANSFER: 'Virement bancaire',
  CARD: 'Carte bancaire',
  CHECK: 'Chèque',
  OTHER: 'Autre'
};

export const CashView: React.FC = () => {
  const { currentTenant, currentUser, hasPermission, isSuperAdmin, canManageSensitiveFinancials } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const [activeTab, setActiveTab] = useState<'accounts' | 'today' | 'transfers' | 'ledger' | 'years-periods' | 'period-reports' | 'debts' | 'history' | 'expenses'>('accounts');

  const currentAgencyId = currentTenant?.id || 't-001';
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(currentAgencyId);

  // Sync selectedAgencyId when currentAgencyId changes in AuthContext
  useEffect(() => {
    setSelectedAgencyId(currentAgencyId);
  }, [currentAgencyId]);

  // Target agency ID for operations (defaults to current agency if 'ALL' is selected for viewing)
  const targetAgencyId = (selectedAgencyId && selectedAgencyId !== 'ALL') ? selectedAgencyId : currentAgencyId;

  // Fiscal Years for selected Agency
  const agencyYears = useMemo(() => {
    return dbStore.getFinancialYears(selectedAgencyId);
  }, [state.financialYears, selectedAgencyId]);

  const [selectedFinancialYearId, setSelectedFinancialYearId] = useState<string>(() => {
    const activeY = (state.financialYears || []).find(y => (y.tenantId === currentAgencyId || currentAgencyId === 'ALL') && y.isCurrentYear);
    return activeY?.id || (state.financialYears?.[0]?.id || 'fy-t-001-2026');
  });

  // Keep selectedFinancialYearId aligned if years list changes or agency switches
  useEffect(() => {
    if (agencyYears.length > 0) {
      const match = agencyYears.find(y => y.id === selectedFinancialYearId);
      if (!match) {
        const activeY = agencyYears.find(y => y.isCurrentYear) || agencyYears[0];
        setSelectedFinancialYearId(activeY.id);
      }
    }
  }, [agencyYears, selectedFinancialYearId]);

  const agencyPeriods = useMemo(() => {
    return dbStore.getFinancialPeriods(selectedFinancialYearId, selectedAgencyId);
  }, [state.financialPeriods, selectedFinancialYearId, selectedAgencyId]);

  const [selectedFinancialPeriodId, setSelectedFinancialPeriodId] = useState<string>(() => {
    const activeP = (state.financialPeriods || []).find(p => (p.tenantId === currentAgencyId || currentAgencyId === 'ALL') && p.isCurrentPeriod);
    return activeP?.id || 'ALL';
  });

  // Current selected period object
  const currentPeriodObj = useMemo(() => {
    return agencyPeriods.find(p => p.id === selectedFinancialPeriodId);
  }, [agencyPeriods, selectedFinancialPeriodId]);

  // Current selected year object
  const currentYearObj = useMemo(() => {
    return agencyYears.find(y => y.id === selectedFinancialYearId);
  }, [agencyYears, selectedFinancialYearId]);

  // Dynamic period financial summary
  const dynamicPeriodSummary = useMemo(() => {
    return dbStore.getPeriodFinancialSummary(selectedAgencyId, selectedFinancialYearId, selectedFinancialPeriodId);
  }, [selectedAgencyId, selectedFinancialYearId, selectedFinancialPeriodId, state.financialMovements, state.financialAccounts]);

  // Multi-Financial Accounts for Selected Agency (Strict isolation)
  const agencyAccounts = useMemo(() => {
    if (selectedAgencyId === 'ALL') {
      return state.financialAccounts || [];
    }
    return (state.financialAccounts || []).filter(a => a.tenantId === selectedAgencyId);
  }, [state.financialAccounts, selectedAgencyId]);

  // Agency Financial Movements
  const agencyFinancialMovements = useMemo(() => {
    if (selectedAgencyId === 'ALL') {
      return state.financialMovements || [];
    }
    return (state.financialMovements || []).filter(m => m.tenantId === selectedAgencyId);
  }, [state.financialMovements, selectedAgencyId]);

  // Agency Supplier Debts
  const agencySupplierDebts = useMemo(() => {
    if (selectedAgencyId === 'ALL') {
      return state.supplierDebts || [];
    }
    return (state.supplierDebts || []).filter(d => d.tenantId === selectedAgencyId);
  }, [state.supplierDebts, selectedAgencyId]);

  // Agency Supplier Payments
  const agencySupplierPayments = useMemo(() => {
    if (selectedAgencyId === 'ALL') {
      return state.supplierPayments || [];
    }
    return (state.supplierPayments || []).filter(p => p.tenantId === selectedAgencyId);
  }, [state.supplierPayments, selectedAgencyId]);

  // Consolidated Treasury Metrics
  const treasuryMetrics = useMemo(() => {
    const totalTreasury = agencyAccounts.filter(a => a.isActive).reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const cashTotal = agencyAccounts.filter(a => a.isActive && a.type === 'CASH').reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const bankTotal = agencyAccounts.filter(a => a.isActive && a.type === 'BANK').reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const momoTotal = agencyAccounts.filter(a => a.isActive && a.type === 'MOBILE_MONEY').reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const activeCount = agencyAccounts.filter(a => a.isActive).length;
    return { totalTreasury, cashTotal, bankTotal, momoTotal, activeCount };
  }, [agencyAccounts]);

  // Inter-Account Transfers
  const agencyTransfers = useMemo(() => {
    return agencyFinancialMovements.filter(m => m.movementType === 'TRANSFER' && m.category === 'TRANSFER_OUT');
  }, [agencyFinancialMovements]);

  // Dedicated Financial Accounts Admin Modals & Filter State
  const [selectedDetailAccountId, setSelectedDetailAccountId] = useState<string | null>(null);
  const [accountForDetail, setAccountForDetail] = useState<FinancialAccount | null>(null);
  const [accountForEdit, setAccountForEdit] = useState<FinancialAccount | null>(null);
  const [accountForAdjust, setAccountForAdjust] = useState<FinancialAccount | null>(null);
  const [accountForReset, setAccountForReset] = useState<FinancialAccount | null>(null);
  const [accountForDelete, setAccountForDelete] = useState<FinancialAccount | null>(null);
  const [accountLayoutView, setAccountLayoutView] = useState<'cards' | 'table'>('cards');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('ALL');
  const [accountStatusFilter, setAccountStatusFilter] = useState('ALL');

  // Filtered Agency Accounts
  const filteredAgencyAccounts = useMemo(() => {
    return agencyAccounts.filter(acc => {
      if (accountTypeFilter !== 'ALL' && acc.type !== accountTypeFilter) return false;
      if (accountStatusFilter === 'ACTIVE' && (!acc.isActive || acc.isArchived)) return false;
      if (accountStatusFilter === 'INACTIVE' && (acc.isActive || acc.isArchived)) return false;
      if (accountStatusFilter === 'ARCHIVED' && !acc.isArchived) return false;
      if (accountSearchQuery.trim()) {
        const q = accountSearchQuery.toLowerCase();
        const matchName = acc.name.toLowerCase().includes(q);
        const matchCode = acc.code.toLowerCase().includes(q);
        const matchBank = acc.bankName && acc.bankName.toLowerCase().includes(q);
        const matchNum = acc.accountNumber && acc.accountNumber.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBank && !matchNum) return false;
      }
      return true;
    });
  }, [agencyAccounts, accountTypeFilter, accountStatusFilter, accountSearchQuery]);

  // Account Modal State (Creation)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<FinancialAccount | null>(null);
  const [accName, setAccName] = useState('');
  const [accCode, setAccCode] = useState('');
  const [accType, setAccType] = useState<FinancialAccountType>('CASH');
  const [accInitialBalance, setAccInitialBalance] = useState<number>(0);
  const [accDescription, setAccDescription] = useState('');
  const [accBankName, setAccBankName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [accIsPettyCash, setAccIsPettyCash] = useState(false);
  const [accIsDefault, setAccIsDefault] = useState(false);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(50000);
  const [transferReason, setTransferReason] = useState('Alimentation Petite Caisse');

  // Ledger Filter State
  const [ledgerAccountFilter, setLedgerAccountFilter] = useState('ALL');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('ALL');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Filtered Financial Movements for Ledger
  const filteredFinancialMovements = useMemo(() => {
    return agencyFinancialMovements.filter(m => {
      const matchesAccount = ledgerAccountFilter === 'ALL' || m.financialAccountId === ledgerAccountFilter || m.fromAccountId === ledgerAccountFilter || m.toAccountId === ledgerAccountFilter;
      const matchesCat = ledgerCategoryFilter === 'ALL' || m.category === ledgerCategoryFilter || m.movementType === ledgerCategoryFilter;
      const q = ledgerSearch.toLowerCase();
      const matchesSearch =
        !q ||
        m.movementNumber.toLowerCase().includes(q) ||
        (m.reference && m.reference.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (m.categoryLabel && m.categoryLabel.toLowerCase().includes(q)) ||
        (m.performedByUserName && m.performedByUserName.toLowerCase().includes(q)) ||
        m.financialAccountName.toLowerCase().includes(q);

      return matchesAccount && matchesCat && matchesSearch;
    });
  }, [agencyFinancialMovements, ledgerAccountFilter, ledgerCategoryFilter, ledgerSearch]);

  const debtorOrdersCount = state.orders.filter(o => (o.dueAmount !== undefined ? o.dueAmount : Math.max(0, o.totalAmount - o.paidAmount)) > 0 && o.status !== 'CANCELLED').length;

  // Active Session
  const activeSession = state.cashSessions.find(cs => cs.status === 'OPEN');

  // Modals State
  const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false);
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCashInjectionModalOpen, setIsCashInjectionModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [sessionForReport, setSessionForReport] = useState<CashSession | null>(null);

  // Opening Form State
  const [openingBalance, setOpeningBalance] = useState<number>(100000);
  const [openingNotes, setOpeningNotes] = useState('');

  // Closing Form State
  const [closingActualBalance, setClosingActualBalance] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');

  // Cash Injection (Alimentation de Caisse) Form State
  const [cashInjectionAmount, setCashInjectionAmount] = useState<number>(50000);
  const [cashInjectionSource, setCashInjectionSource] = useState('Apport Direction / Gérant');
  const [cashInjectionReason, setCashInjectionReason] = useState('');

  // Refund (Remboursement Client) Form State
  const [refundAmount, setRefundAmount] = useState<number>(10000);
  const [refundClientName, setRefundClientName] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<PaymentMethod>('CASH');

  // Expense Form State
  const [expenseCategory, setExpenseCategory] = useState('Fournitures de bureau & consommables');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(15000);
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [expenseReceiptRef, setExpenseReceiptRef] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('CASH');

  // Expense Receipt and Custom Category Modals State
  const [selectedExpenseForReceipt, setSelectedExpenseForReceipt] = useState<Expense | null>(null);
  const [isCustomCategoryModalOpen, setIsCustomCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');

  // Categories list from DB with fallback
  const expenseCategories = useMemo(() => {
    return state.expenseCategories && state.expenseCategories.length > 0
      ? state.expenseCategories
      : [
          { id: 'cat-exp-01', name: 'Fournitures de bureau & consommables', icon: '📦', isSystem: true, isActive: true },
          { id: 'cat-exp-02', name: 'Entretien, nettoyage & hygiène', icon: '🧹', isSystem: true, isActive: true },
          { id: 'cat-exp-03', name: 'Électricité, eau & énergie', icon: '⚡', isSystem: true, isActive: true },
          { id: 'cat-exp-04', name: 'Frais de transport & courses urgentes', icon: '🛵', isSystem: true, isActive: true },
          { id: 'cat-exp-05', name: 'Restauration & collation équipe', icon: '☕', isSystem: true, isActive: true },
          { id: 'cat-exp-06', name: 'Maintenance machines & équipements', icon: '🔧', isSystem: true, isActive: true },
          { id: 'cat-exp-07', name: 'Achat de matières premières (papier, encre, bâches...)', icon: '📄', isSystem: true, isActive: true },
          { id: 'cat-exp-08', name: 'Avance sur salaire / Main d\'œuvre temporaire', icon: '💼', isSystem: true, isActive: true },
          { id: 'cat-exp-09', name: 'Communication, crédit téléphonique & internet', icon: '📶', isSystem: true, isActive: true },
          { id: 'cat-exp-10', name: 'Autres dépenses diverses autorisées', icon: '📑', isSystem: true, isActive: true }
        ];
  }, [state.expenseCategories]);

  // Period Reports Filters
  const [periodType, setPeriodType] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('ALL');

  // History Search & Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

  // Mouvements Filter in Active Day
  const [movementsTypeFilter, setMovementsTypeFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');

  // ============================================================================
  // LIVE TODAY / SESSION METRICS & BREAKDOWNS (GESTION DU DÉFICIT & ALIMENTATION)
  // ============================================================================
  const todaySessionMetrics = useMemo(() => {
    if (!activeSession) {
      return {
        openingBalance: 0,
        commercialRevenue: 0,
        cashInjections: 0,
        inflows: 0,
        expenses: 0,
        refunds: 0,
        outflows: 0,
        theoreticalBalance: 0,
        isDeficit: false,
        deficitAmount: 0,
        transactionCount: 0,
        ordersCount: 0,
        trainingsCount: 0,
        discountsTotal: 0,
        movements: [] as CashMovement[],
        serviceBreakdown: [] as { name: string; amount: number }[],
        paymentMethodBreakdown: [] as { name: string; amount: number }[]
      };
    }

    const movements = activeSession.movements || [];

    // Recettes Commerciales (Prestations, Commandes, Formations)
    const commercialRevenue = movements
      .filter(m => (m.movementType === 'INFLOW' || (m as any).movementType === 'DEPOSIT') && m.category !== 'Alimentation de Caisse' && m.category !== 'Apport de Fonds')
      .reduce((sum, m) => sum + m.amount, 0);

    // Alimentation de Caisse (Apports de fonds du gérant / direction - HORS Chiffre d'Affaires)
    const cashInjections = movements
      .filter(m => m.category === 'Alimentation de Caisse' || m.category === 'Apport de Fonds' || (m.movementType as string) === 'CASH_INJECTION')
      .reduce((sum, m) => sum + m.amount, 0);

    const inflows = commercialRevenue + cashInjections;

    // Dépenses et Sorties courantes payées
    const expenses = movements
      .filter(m => (m.movementType === 'OUTFLOW' || m.movementType === 'EXPENSE') && m.category !== 'Remboursement Client')
      .reduce((sum, m) => sum + m.amount, 0);

    // Remboursements clients
    const refunds = movements
      .filter(m => m.category === 'Remboursement Client' || (m.movementType as string) === 'REFUND')
      .reduce((sum, m) => sum + m.amount, 0);

    const outflows = expenses + refunds;

    // Solde théorique = Fonds Initial + Recettes Commerciales + Alimentations - Sorties - Remboursements
    // LE SOLDE THÉORIQUE PEUT ÊTRE NÉGATIF !
    const theoreticalBalance = activeSession.openingBalance + commercialRevenue + cashInjections - expenses - refunds;
    const isDeficit = theoreticalBalance < 0;
    const deficitAmount = isDeficit ? Math.abs(theoreticalBalance) : 0;

    // Filter payments linked to this session
    const sessionPayments = state.payments.filter(p => p.cashSessionId === activeSession.id);
    const ordersCount = sessionPayments.filter(p => p.targetType === 'ORDER').length;
    const trainingsCount = sessionPayments.filter(p => p.targetType === 'ENROLLMENT').length;

    // Estimate discount total from linked orders today
    const sessionDateStr = activeSession.openedAt.split('T')[0];
    const todaysOrders = state.orders.filter(o => o.createdAt.startsWith(sessionDateStr));
    const discountsTotal = todaysOrders.reduce((sum, o) => {
      const orderDiscount = o.items.reduce((iSum, i) => iSum + (i.discountAmount || 0), 0);
      return sum + orderDiscount;
    }, 0);

    // Breakdown by Service / Category (uniquement les recettes commerciales)
    const serviceMap = new Map<string, number>();
    movements
      .filter(m => m.movementType === 'INFLOW' && m.category !== 'Alimentation de Caisse' && m.category !== 'Apport de Fonds')
      .forEach(m => {
        const cat = m.category || 'Prestations Diverses';
        serviceMap.set(cat, (serviceMap.get(cat) || 0) + m.amount);
      });

    const serviceBreakdown = Array.from(serviceMap.entries()).map(([name, amount]) => ({
      name,
      amount
    }));

    if (serviceBreakdown.length === 0) {
      serviceBreakdown.push({ name: 'Aucune recette commerciale', amount: 0 });
    }

    // Breakdown by Payment Method
    const methodMap = new Map<string, number>();
    sessionPayments.forEach(p => {
      const methodLabel = PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod;
      methodMap.set(methodLabel, (methodMap.get(methodLabel) || 0) + p.amount);
    });

    if (methodMap.size === 0 && commercialRevenue > 0) {
      methodMap.set('Espèces', commercialRevenue);
    }

    const paymentMethodBreakdown = Array.from(methodMap.entries()).map(([name, amount]) => ({
      name,
      amount
    }));

    return {
      openingBalance: activeSession.openingBalance,
      commercialRevenue,
      cashInjections,
      inflows,
      expenses,
      refunds,
      outflows,
      theoreticalBalance,
      isDeficit,
      deficitAmount,
      transactionCount: movements.length,
      ordersCount: ordersCount || movements.filter(m => m.movementType === 'INFLOW').length,
      trainingsCount,
      discountsTotal,
      movements,
      serviceBreakdown,
      paymentMethodBreakdown
    };
  }, [activeSession, state.payments, state.orders]);

  // ============================================================================
  // PERIOD REPORTS CALCULATOR (TODAY, WEEK, MONTH, YEAR, CUSTOM)
  // ============================================================================
  const periodMetrics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (periodType === 'TODAY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (periodType === 'WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodType === 'YEAR') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (periodType === 'CUSTOM') {
      startDate = new Date(customStartDate + 'T00:00:00');
      endDate = new Date(customEndDate + 'T23:59:59');
    }

    // Filter payments in period
    let filteredPayments = state.payments.filter(p => {
      const d = new Date(p.createdAt);
      return d >= startDate && d <= endDate;
    });

    if (selectedUserFilter !== 'ALL') {
      filteredPayments = filteredPayments.filter(p => p.receivedByUserName?.includes(selectedUserFilter));
    }

    if (selectedMethodFilter !== 'ALL') {
      filteredPayments = filteredPayments.filter(p => p.paymentMethod === selectedMethodFilter);
    }

    // Filter expenses in period
    let filteredExpenses = state.expenses.filter(e => {
      const d = new Date(e.createdAt);
      return d >= startDate && d <= endDate;
    });

    if (selectedUserFilter !== 'ALL') {
      filteredExpenses = filteredExpenses.filter(e => e.createdByName?.includes(selectedUserFilter));
    }

    // Filter orders in period
    const filteredOrders = state.orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    });

    // Filter movements for cash injections and refunds in period
    const allMovementsInPeriod: CashMovement[] = [];
    state.cashSessions.forEach(cs => {
      const csDate = new Date(cs.openedAt);
      if (csDate >= startDate && csDate <= endDate && cs.movements) {
        allMovementsInPeriod.push(...cs.movements);
      }
    });

    const totalCommercialRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalCashInjections = allMovementsInPeriod
      .filter(m => m.category === 'Alimentation de Caisse' || m.category === 'Apport de Fonds' || (m.movementType as string) === 'CASH_INJECTION')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalDiscounts = filteredOrders.reduce((sum, o) => {
      return sum + o.items.reduce((iSum, i) => iSum + (i.discountAmount || 0), 0);
    }, 0);

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalRefunds = allMovementsInPeriod
      .filter(m => m.category === 'Remboursement Client' || (m.movementType as string) === 'REFUND')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalOutflows = totalExpenses + totalRefunds;
    const netOperatingProfit = totalCommercialRevenue - totalExpenses;
    const netCashFlow = totalCommercialRevenue + totalCashInjections - totalOutflows;

    // Supplier debts (Dettes Fournisseurs engagées non payées)
    const totalSupplierDebts = (state.purchaseOrders || [])
      .filter(po => po.status === 'ORDERED' || po.status === 'DRAFT')
      .reduce((sum, po) => sum + po.totalAmount, 0);

    // Client debts (Créances clients à recouvrer)
    const totalClientDebts = state.orders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Math.max(0, o.totalAmount - o.paidAmount), 0);

    const ordersCount = filteredOrders.length;
    const trainingsCount = filteredPayments.filter(p => p.targetType === 'ENROLLMENT').length;

    // Daily Trend Chart Data
    const trendMap = new Map<string, { date: string; label: string; recettes: number; depenses: number }>();
    
    filteredPayments.forEach(p => {
      const dayKey = p.createdAt.split('T')[0];
      if (!trendMap.has(dayKey)) {
        trendMap.set(dayKey, { date: dayKey, label: formatDate(p.createdAt, 'dd/MM'), recettes: 0, depenses: 0 });
      }
      trendMap.get(dayKey)!.recettes += p.amount;
    });

    filteredExpenses.forEach(e => {
      const dayKey = e.createdAt.split('T')[0];
      if (!trendMap.has(dayKey)) {
        trendMap.set(dayKey, { date: dayKey, label: formatDate(e.createdAt, 'dd/MM'), recettes: 0, depenses: 0 });
      }
      trendMap.get(dayKey)!.depenses += e.amount;
    });

    const trendData = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Service Breakdown in Period
    const serviceMap = new Map<string, number>();
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        const name = item.serviceName || 'Prestation';
        serviceMap.set(name, (serviceMap.get(name) || 0) + item.totalPrice);
      });
    });

    // Add trainings to service breakdown
    const trainingTotal = filteredPayments
      .filter(p => p.targetType === 'ENROLLMENT')
      .reduce((sum, p) => sum + p.amount, 0);
    if (trainingTotal > 0) {
      serviceMap.set('Formations Pédagogiques', trainingTotal);
    }

    const serviceBreakdown = Array.from(serviceMap.entries()).map(([name, amount]) => ({ name, amount }));

    // Payment Method Breakdown in Period
    const methodMap = new Map<string, number>();
    filteredPayments.forEach(p => {
      const label = PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod;
      methodMap.set(label, (methodMap.get(label) || 0) + p.amount);
    });

    const methodBreakdown = Array.from(methodMap.entries()).map(([name, amount]) => ({ name, amount }));

    return {
      startDate,
      endDate,
      totalGrossRevenue: totalCommercialRevenue,
      totalCommercialRevenue,
      totalCashInjections,
      totalDiscounts,
      totalExpenses,
      totalRefunds,
      totalOutflows,
      totalSupplierDebts,
      totalClientDebts,
      netOperatingProfit,
      netCashFlow,
      netRevenue: netOperatingProfit,
      ordersCount,
      trainingsCount,
      paymentsCount: filteredPayments.length,
      trendData,
      serviceBreakdown,
      methodBreakdown,
      payments: filteredPayments,
      expenses: filteredExpenses
    };
  }, [periodType, customStartDate, customEndDate, selectedUserFilter, selectedMethodFilter, state.payments, state.expenses, state.orders, state.cashSessions, state.purchaseOrders]);

  // ============================================================================
  // CASH SESSIONS HISTORY FILTERING
  // ============================================================================
  const filteredSessions = useMemo(() => {
    return state.cashSessions.filter(cs => {
      const matchesSearch =
        cs.userName.toLowerCase().includes(historySearch.toLowerCase()) ||
        cs.cashRegisterName.toLowerCase().includes(historySearch.toLowerCase()) ||
        cs.openedAt.includes(historySearch);

      const matchesStatus =
        historyStatusFilter === 'ALL' ||
        (historyStatusFilter === 'OPEN' && cs.status === 'OPEN') ||
        (historyStatusFilter === 'CLOSED' && cs.status === 'CLOSED') ||
        (historyStatusFilter === 'DISCREPANCY' && cs.differenceAmount !== 0 && cs.differenceAmount !== undefined);

      return matchesSearch && matchesStatus;
    });
  }, [state.cashSessions, historySearch, historyStatusFilter]);

  // ============================================================================
  // HANDLERS: COMPTES FINANCIERS & TRANSFERTS INTER-COMPTES
  // ============================================================================

  const handleOpenCreateAccount = () => {
    setAccountToEdit(null);
    setAccName('');
    setAccCode(`CPT-${Date.now().toString().slice(-4)}`);
    setAccType('CASH');
    setAccInitialBalance(0);
    setAccDescription('');
    setAccBankName('');
    setAccNumber('');
    setAccIsPettyCash(false);
    setAccIsDefault(false);
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: FinancialAccount) => {
    setAccountToEdit(acc);
    setAccName(acc.name);
    setAccCode(acc.code);
    setAccType(acc.type);
    setAccInitialBalance(acc.initialBalance);
    setAccDescription(acc.description || '');
    setAccBankName(acc.bankName || '');
    setAccNumber(acc.accountNumber || '');
    setAccIsPettyCash(Boolean(acc.isPettyCash));
    setAccIsDefault(Boolean(acc.isDefault));
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      showToast('Validation', 'Le nom du compte financier est obligatoire.', 'DANGER');
      return;
    }

    const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur';

    if (accountToEdit) {
      const res = dbStore.updateFinancialAccount(
        accountToEdit.id,
        {
          name: accName.trim(),
          code: accCode.trim().toUpperCase(),
          type: accType,
          description: accDescription.trim(),
          bankName: accBankName.trim(),
          accountNumber: accNumber.trim(),
          isPettyCash: accIsPettyCash,
          isDefault: accIsDefault
        },
        currentAgencyId,
        userName,
        isSuperAdmin
      );

      if (res.success) {
        showToast('Compte Modifié 🟢', res.message, 'SUCCESS');
        setIsAccountModalOpen(false);
      } else {
        showToast('Erreur', res.message, 'DANGER');
      }
    } else {
      const res = dbStore.createFinancialAccount(
        {
          name: accName.trim(),
          code: accCode.trim().toUpperCase(),
          type: accType,
          initialBalance: accInitialBalance,
          description: accDescription.trim(),
          bankName: accBankName.trim(),
          accountNumber: accNumber.trim(),
          isPettyCash: accIsPettyCash,
          isDefault: accIsDefault
        },
        currentAgencyId,
        userName,
        isSuperAdmin
      );

      if (res.success) {
        showToast('Compte Créé 🟢', res.message, 'SUCCESS');
        setIsAccountModalOpen(false);
      } else {
        showToast('Erreur', res.message, 'DANGER');
      }
    }
  };

  const handleToggleAccountStatus = (acc: FinancialAccount) => {
    const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur';
    const res = dbStore.toggleFinancialAccountStatus(acc.id, currentAgencyId, userName, isSuperAdmin);
    if (res.success) {
      showToast('Statut Mis à Jour', res.message, 'INFO');
    } else {
      showToast('Erreur', res.message, 'DANGER');
    }
  };

  const handleOpenTransfer = (fromAccId?: string, toAccId?: string) => {
    const defaultFrom = fromAccId || agencyAccounts[0]?.id || '';
    const otherAcc = agencyAccounts.find(a => a.id !== defaultFrom);
    const defaultTo = toAccId || otherAcc?.id || '';

    setTransferFromId(defaultFrom);
    setTransferToId(defaultTo);
    setTransferAmount(50000);
    setTransferReason('Virement interne de trésorerie');
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const periodCheck = dbStore.isOperationAllowedInPeriod(new Date().toISOString(), currentAgencyId);
    if (!periodCheck.allowed) {
      showToast('Période Verrouillée 🔒', periodCheck.reason || 'Cette période financière est clôturée ou archivée.', 'DANGER');
      return;
    }

    if (!transferFromId || !transferToId) {
      showToast('Validation', 'Veuillez sélectionner le compte source et le compte destination.', 'WARNING');
      return;
    }
    if (transferAmount <= 0) {
      showToast('Validation', 'Le montant du transfert doit être supérieur à zéro.', 'WARNING');
      return;
    }

    const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Gestionnaire';
    const res = dbStore.recordFinancialTransfer(
      transferFromId,
      transferToId,
      transferAmount,
      transferReason,
      currentAgencyId,
      userName,
      isSuperAdmin
    );

    if (res.success) {
      showToast('Transfert Réussi 🔄', res.message, 'SUCCESS');
      setIsTransferModalOpen(false);
    } else {
      showToast('Échec du Transfert ❌', res.message, 'DANGER');
    }
  };

  // ============================================================================
  // HANDLERS: OUVERTURE, DÉPENSE, CLÔTURE
  // ============================================================================
  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const periodCheck = dbStore.isOperationAllowedInPeriod(new Date().toISOString(), currentAgencyId);
    if (!periodCheck.allowed) {
      showToast('Période Verrouillée 🔒', periodCheck.reason || 'Cette période financière est clôturée ou archivée.', 'DANGER');
      return;
    }

    if (activeSession) {
      showToast('Session Active Existante', 'Une session de caisse est déjà ouverte.', 'WARNING');
      return;
    }

    if (openingBalance < 0) {
      showToast('Montant Invalide', 'Le fonds de caisse initial ne peut être négatif.', 'DANGER');
      return;
    }

    const newSessionId = `cs-${Date.now()}`;
    const newSession: CashSession = {
      id: newSessionId,
      tenantId: currentTenant?.id || 't-001',
      cashRegisterId: state.cashRegisters[0]?.id || 'cr-001',
      cashRegisterName: state.cashRegisters[0]?.name || 'Caisse Principale',
      userId: currentUser?.id || 'u-01',
      userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier',
      openingBalance,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      notes: openingNotes,
      movements: []
    };

    dbStore.updateState(draft => {
      draft.cashSessions.unshift(newSession);
    });

    dbStore.logAudit('CASH_SESSION_OPENED', 'CASH_SESSION', newSessionId, null, {
      openingBalance,
      userName: newSession.userName,
      notes: openingNotes
    });

    showToast('Caisse Ouverte 🟢', `Session ouverte avec un fonds initial de ${formatCurrency(openingBalance)}.`, 'SUCCESS');
    setIsOpenSessionModalOpen(false);
    setOpeningNotes('');
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const periodCheck = dbStore.isOperationAllowedInPeriod(new Date().toISOString(), currentAgencyId);
    if (!periodCheck.allowed) {
      showToast('Période Verrouillée 🔒', periodCheck.reason || 'Cette période financière est clôturée ou archivée.', 'DANGER');
      return;
    }

    if (!expenseDescription.trim() || expenseAmount <= 0) {
      showToast('Erreur', 'Veuillez renseigner la justification et un montant valide supérieur à 0.', 'DANGER');
      return;
    }

    const seq = (state.expenses?.length || 0) + 1;
    const expenseNumber = generateDocNumber('DEP', seq);
    const expenseId = `exp-${Date.now()}`;
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier';

    const newExpense: Expense = {
      id: expenseId,
      tenantId: currentTenant?.id || 't-001',
      cashSessionId: activeSession?.id,
      expenseNumber,
      category: expenseCategory,
      description: expenseDescription,
      amount: expenseAmount,
      paymentMethod: expensePaymentMethod,
      recipientName: expenseRecipient.trim() || 'Non spécifié',
      receiptNumber: expenseReceiptRef.trim() || undefined,
      authorizedByUserName: performedBy,
      createdByName: performedBy,
      createdAt: new Date().toISOString()
    };

    dbStore.updateState(draft => {
      draft.expenses = draft.expenses || [];
      draft.expenses.unshift(newExpense);

      // Add movement in active session if open
      if (activeSession) {
        const sess = draft.cashSessions.find(s => s.id === activeSession.id);
        if (sess) {
          sess.movements.unshift({
            id: `cm-${Date.now()}`,
            cashSessionId: sess.id,
            movementType: 'EXPENSE',
            amount: expenseAmount,
            category: expenseCategory,
            reason: `[${expenseCategory}] ${expenseDescription}${expenseRecipient ? ` (Bénéficiaire: ${expenseRecipient})` : ''}`,
            performedByUserName: performedBy,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    dbStore.logAudit('EXPENSE_CREATED', 'EXPENSE', expenseId, null, {
      amount: expenseAmount,
      category: expenseCategory,
      recipient: expenseRecipient,
      reason: expenseDescription
    });

    showToast('Sortie de Caisse Enregistrée 🟢', `Décaissement de ${formatCurrency(expenseAmount)} enregistré avec succès.`, 'SUCCESS');
    setIsExpenseModalOpen(false);
    setSelectedExpenseForReceipt(newExpense);
    setExpenseDescription('');
    setExpenseRecipient('');
    setExpenseReceiptRef('');
    setExpenseAmount(15000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showToast('Libellé requis', 'Veuillez saisir un nom pour ce motif de sortie.', 'DANGER');
      return;
    }

    const newCat: ExpenseCategory = {
      id: `cat-exp-${Date.now()}`,
      tenantId: currentTenant?.id || 't-001',
      name: newCategoryName.trim(),
      icon: newCategoryIcon || '📦',
      isSystem: false,
      isActive: true
    };

    dbStore.updateState(draft => {
      draft.expenseCategories = draft.expenseCategories || [];
      draft.expenseCategories.push(newCat);
    });

    dbStore.logAudit('EXPENSE_CATEGORY_CREATED', 'SYSTEM', newCat.id, null, { name: newCategoryName });
    showToast('Motif Enregistré 🟢', `Le motif « ${newCategoryName} » est désormais personnalisable et utilisable pour toutes les sorties.`, 'SUCCESS');
    setExpenseCategory(newCat.name);
    setNewCategoryName('');
    setIsCustomCategoryModalOpen(false);
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    dbStore.updateState(draft => {
      draft.expenseCategories = (draft.expenseCategories || []).filter(c => c.id !== catId);
    });
    dbStore.logAudit('EXPENSE_CATEGORY_DELETED', 'SYSTEM', catId, null, { name: catName });
    showToast('Motif Retiré', `Le motif « ${catName} » a été supprimé.`, 'SUCCESS');
    if (expenseCategory === catName) {
      setExpenseCategory('Fournitures de bureau & consommables');
    }
  };

  // ============================================================================
  // HANDLER: ALIMENTATION DE CAISSE (APPORT DE FONDS HORS CHIFFRE D'AFFAIRES)
  // ============================================================================
  const handleCashInjection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      showToast('Caisse Fermée', 'Veuillez d\'abord ouvrir la session de caisse.', 'WARNING');
      return;
    }
    if (cashInjectionAmount <= 0) {
      showToast('Montant Invalide', 'Veuillez saisir un montant d\'alimentation supérieur à 0 GNF.', 'DANGER');
      return;
    }
    if (!cashInjectionReason.trim()) {
      showToast('Motif Obligatoire', 'Veuillez préciser le motif de l\'alimentation de caisse.', 'DANGER');
      return;
    }

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Direction / Gérant';
    const movId = `cm-inj-${Date.now()}`;

    dbStore.updateState(draft => {
      const sess = draft.cashSessions.find(s => s.id === activeSession.id);
      if (sess) {
        sess.movements.unshift({
          id: movId,
          cashSessionId: sess.id,
          movementType: 'INFLOW',
          amount: cashInjectionAmount,
          category: 'Alimentation de Caisse',
          reason: `[Alimentation] ${cashInjectionReason.trim()} (Source: ${cashInjectionSource})`,
          isCommercialRevenue: false,
          performedByUserName: performedBy,
          createdAt: new Date().toISOString()
        });
      }
    });

    dbStore.logAudit('CASH_INJECTION_PERFORMED', 'CASH_SESSION', activeSession.id, null, {
      amount: cashInjectionAmount,
      source: cashInjectionSource,
      reason: cashInjectionReason,
      performedBy
    });

    showToast(
      'Alimentation de Caisse Validée 🟢',
      `Apport de ${formatCurrency(cashInjectionAmount)} enregistré avec succès. Les fonds disponibles augmentent immédiatement sans être comptabilisés en Chiffre d'Affaires.`,
      'SUCCESS'
    );

    setIsCashInjectionModalOpen(false);
    setCashInjectionAmount(50000);
    setCashInjectionReason('');
  };

  // ============================================================================
  // HANDLER: REMBOURSEMENT CLIENT
  // ============================================================================
  const handleRecordRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      showToast('Caisse Fermée', 'Veuillez d\'abord ouvrir la session de caisse.', 'WARNING');
      return;
    }
    if (refundAmount <= 0) {
      showToast('Montant Invalide', 'Veuillez saisir un montant de remboursement supérieur à 0 GNF.', 'DANGER');
      return;
    }
    if (!refundReason.trim()) {
      showToast('Motif Obligatoire', 'Veuillez préciser le motif du remboursement client.', 'DANGER');
      return;
    }

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier';
    const movId = `cm-ref-${Date.now()}`;

    dbStore.updateState(draft => {
      const sess = draft.cashSessions.find(s => s.id === activeSession.id);
      if (sess) {
        sess.movements.unshift({
          id: movId,
          cashSessionId: sess.id,
          movementType: 'OUTFLOW',
          amount: refundAmount,
          category: 'Remboursement Client',
          reason: `[Remboursement] ${refundReason.trim()}${refundClientName ? ` (Bénéficiaire: ${refundClientName})` : ''}`,
          performedByUserName: performedBy,
          createdAt: new Date().toISOString()
        });
      }
    });

    dbStore.logAudit('REFUND_PERFORMED', 'CASH_SESSION', activeSession.id, null, {
      amount: refundAmount,
      clientName: refundClientName,
      reason: refundReason,
      performedBy
    });

    showToast(
      'Remboursement Enregistré 🟢',
      `Remboursement de ${formatCurrency(refundAmount)} effectué.`,
      'SUCCESS'
    );

    setIsRefundModalOpen(false);
    setRefundAmount(10000);
    setRefundClientName('');
    setRefundReason('');
  };

  // ============================================================================
  // HANDLER: OUVERTURE DU MODAL DE CLÔTURE
  // ============================================================================
  const handleOpenCloseModal = () => {
    if (!activeSession) return;
    // RÈGLE FONDAMENTALE : Une caisse physique ne peut jamais contenir un montant négatif.
    // Si le solde théorique est négatif (ex: -15 000 GNF), la valeur par défaut proposée est 0 GNF.
    setClosingActualBalance(Math.max(0, todaySessionMetrics.theoreticalBalance));
    setClosingNotes('');
    setIsCloseSessionModalOpen(true);
  };

  // ============================================================================
  // HANDLER: VALIDATION DE LA CLÔTURE DE CAISSE (AVEC GESTION DU DÉFICIT)
  // ============================================================================
  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    if (closingActualBalance < 0) {
      showToast('Montant Invalide', 'Le montant réellement compté dans le tiroir-caisse ne peut pas être négatif.', 'DANGER');
      return;
    }

    const theoretical = todaySessionMetrics.theoreticalBalance;
    const diff = closingActualBalance - theoretical;
    const isDeficit = theoretical < 0;

    // Motif obligatoire si caisse déficitaire ou si écart constaté
    if ((isDeficit || diff !== 0) && !closingNotes.trim()) {
      showToast(
        isDeficit ? 'Motif du Déficit Obligatoire' : 'Motif Obligatoire',
        isDeficit
          ? `La caisse est déficitaire de ${formatCurrency(todaySessionMetrics.deficitAmount)}. Veuillez obligatoirement renseigner le motif du déficit pour valider la clôture.`
          : `Un écart de caisse de ${formatCurrency(diff)} est constaté. Veuillez obligatoirement renseigner une observation justificative.`,
        'DANGER'
      );
      return;
    }

    dbStore.updateState(draft => {
      const sess = draft.cashSessions.find(s => s.id === activeSession.id);
      if (sess) {
        sess.status = 'CLOSED';
        sess.closedAt = new Date().toISOString();
        sess.closingBalanceTheoretical = theoretical;
        sess.closingBalanceActual = closingActualBalance;
        sess.differenceAmount = diff;
        sess.notes = closingNotes;
      }
    });

    dbStore.logAudit('CASH_SESSION_CLOSED', 'CASH_SESSION', activeSession.id, null, {
      theoretical,
      actual: closingActualBalance,
      difference: diff,
      isDeficit,
      deficitAmount: isDeficit ? Math.abs(theoretical) : 0,
      notes: closingNotes
    });

    if (isDeficit) {
      showToast(
        'Caisse Clôturée avec Déficit Justifié 🔴',
        `Clôture validée. Déficit constaté de ${formatCurrency(todaySessionMetrics.deficitAmount)} consigné dans le journal d'audit.`,
        'WARNING'
      );
    } else if (diff === 0) {
      showToast(
        'Caisse Clôturée avec Succès 🟢',
        'La caisse est parfaitement équilibrée. Le rapport journalier officiel est disponible.',
        'SUCCESS'
      );
    } else {
      showToast(
        'Caisse Clôturée avec Écart 🟠',
        `Écart constaté de ${formatCurrency(diff)}. Clôture consignée dans le journal d'audit.`,
        'WARNING'
      );
    }

    setIsCloseSessionModalOpen(false);

    // Open daily report directly
    const closedSession = dbStore.getState().cashSessions.find(s => s.id === activeSession.id);
    if (closedSession) {
      setSessionForReport(closedSession);
    }
  };

  const handleExportCSV = (filename: string, rows: (string | number)[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Header with Live Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-6 h-6 text-brand-500" />
              Finance, Multi-Comptes & Trésorerie
            </h2>
            {activeSession ? (
              <Badge variant="success" size="sm" className="animate-pulse">
                🟢 Session Caisse Ouverte
              </Badge>
            ) : (
              <Badge variant="danger" size="sm">
                🔴 Caisse Principale Fermée
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Trésorerie multi-comptes (Espèces, Banques, Mobile Money), transferts internes, sessions de caisse et audit des flux.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            icon={ArrowRightLeft}
            onClick={() => handleOpenTransfer()}
            className="text-brand-700 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 border-brand-200 font-bold text-xs"
          >
            🔄 Nouveau Transfert
          </Button>
          <Button
            variant="outline"
            icon={Landmark}
            onClick={handleOpenCreateAccount}
            className="text-xs font-bold"
          >
            + Nouveau Compte
          </Button>

          {activeSession ? (
            <>
              <Button
                variant="outline"
                icon={Plus}
                onClick={() => setIsCashInjectionModalOpen(true)}
                className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 font-bold text-xs"
              >
                + Alimenter Caisse
              </Button>
              <Button
                variant="outline"
                icon={Minus}
                onClick={() => setIsExpenseModalOpen(true)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-semibold"
              >
                − Sortie Caisse
              </Button>
              <Button
                variant="danger"
                icon={Lock}
                onClick={handleOpenCloseModal}
                className="text-xs font-bold"
              >
                Clôturer la Caisse
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              icon={Unlock}
              onClick={() => {
                setOpeningBalance(100000);
                setIsOpenSessionModalOpen(true);
              }}
              className="text-xs font-bold"
            >
              Ouvrir la Caisse du Jour
            </Button>
          )}
        </div>
      </div>

      {/* Financial Context Bar (Agency, Exercice & Période Global Selector) */}
      <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Agency Selector (Super Admin) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-brand-400" />
                Agence :
              </span>
              <select
                value={selectedAgencyId}
                onChange={(e) => {
                  const newAgencyId = e.target.value;
                  setSelectedAgencyId(newAgencyId);
                  const years = dbStore.getFinancialYears(newAgencyId);
                  const curYear = years.find(y => y.isCurrentYear) || years[0];
                  setSelectedFinancialYearId(curYear?.id || '');
                  const pers = dbStore.getFinancialPeriods(curYear?.id || '', newAgencyId);
                  const curPeriod = pers.find(p => p.isCurrentPeriod) || pers[0];
                  setSelectedFinancialPeriodId(curPeriod?.id || 'ALL');
                }}
                className="bg-slate-800 text-white text-xs font-bold py-1 px-2.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                {state.tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    🏢 {t.name} ({t.code || t.id})
                  </option>
                ))}
                <option value="ALL">🌐 Toutes les agences — Vue Consolidée</option>
              </select>
            </div>
          )}

          {/* Exercice Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Exercice :
            </span>
            <select
              value={selectedFinancialYearId}
              onChange={(e) => {
                setSelectedFinancialYearId(e.target.value);
                const pers = dbStore.getFinancialPeriods(e.target.value, selectedAgencyId);
                const currentP = pers.find(p => p.isCurrentPeriod) || pers[0];
                setSelectedFinancialPeriodId(currentP?.id || 'ALL');
              }}
              className="bg-slate-800 text-white text-xs font-bold py-1 px-2.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
            >
              {agencyYears.map(fy => (
                <option key={fy.id} value={fy.id}>
                  {fy.code} : {fy.name} ({fy.status === 'ACTIVE' ? 'ACTIF' : fy.status === 'CLOSED' ? 'CLÔTURÉ' : 'ARCHIVÉ'})
                </option>
              ))}
            </select>
          </div>

          {/* Période Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Période :
            </span>
            <select
              value={selectedFinancialPeriodId}
              onChange={(e) => setSelectedFinancialPeriodId(e.target.value)}
              className="bg-slate-800 text-white text-xs font-bold py-1 px-2.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">Toutes les périodes ({currentYearObj?.year || 'Global'})</option>
              {agencyPeriods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status === 'OPEN' ? 'OUVERTE' : p.status === 'CLOSED' ? 'CLÔTURÉE' : 'ARCHIVÉE'})
                </option>
              ))}
            </select>
          </div>

          {/* Status Badge */}
          {currentPeriodObj ? (
            <Badge
              variant={
                currentPeriodObj.status === 'OPEN' ? 'success' : currentPeriodObj.status === 'CLOSED' ? 'warning' : 'outline'
              }
              className="text-[11px] font-bold px-2 py-0.5"
            >
              {currentPeriodObj.status === 'OPEN' && '🟢 Période Ouverte'}
              {currentPeriodObj.status === 'CLOSED' && '🔒 Période Clôturée'}
              {currentPeriodObj.status === 'ARCHIVED' && '📦 Période Archivée'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[11px] font-semibold text-slate-300 border-slate-700">
              Exercice Consolidé ({currentYearObj?.year || 2026})
            </Badge>
          )}
        </div>

        {/* Quick KPI for selected period */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-slate-400 text-[10px] block font-sans">Trésorerie Consolidée :</span>
            <span className="text-emerald-400 font-bold font-mono">
              {formatCurrency(dynamicPeriodSummary.consolidatedTreasury)} GNF
            </span>
          </div>
          <button
            onClick={() => setActiveTab('years-periods')}
            className="text-xs text-amber-400 hover:text-amber-300 underline font-sans font-medium"
          >
            Gérer les exercices & périodes →
          </button>
        </div>
      </div>

      {/* Warning banner if period is CLOSED or ARCHIVED */}
      {currentPeriodObj && currentPeriodObj.status !== 'OPEN' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Période {currentPeriodObj.status === 'CLOSED' ? 'Clôturée' : 'Archivée'} ({currentPeriodObj.name}) :</strong> Les écritures financières sur cette période sont verrouillées en lecture seule. Les nouvelles opérations de caisse et dépenses doivent être effectuées sur une période ouverte.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('years-periods')}
            className="text-[11px] py-1 h-7 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
          >
            Voir les Périodes
          </Button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <Tabs
        tabs={[
          { id: 'accounts', label: `Comptes & Trésorerie (${agencyAccounts.length})`, icon: Landmark },
          { id: 'years-periods', label: `Exercices & Périodes (${agencyYears.length})`, icon: Calendar },
          { id: 'today', label: `Caisse du Jour & Direct`, icon: Wallet },
          { id: 'transfers', label: `Transferts Inter-Comptes (${agencyTransfers.length})`, icon: ArrowRightLeft },
          { id: 'ledger', label: `Journal des Flux (${agencyFinancialMovements.length})`, icon: FileText },
          { id: 'period-reports', label: 'Rapports & Marges', icon: BarChart3 },
          { id: 'debts', label: 'Créances Clients', icon: DollarSign, count: debtorOrdersCount },
          { id: 'history', label: 'Historique Sessions', icon: History, count: state.cashSessions.length },
          { id: 'expenses', label: 'Sorties & Dépenses', icon: Minus, count: state.expenses.length },
        ]}
        activeTab={activeTab}
        onChange={(t) => {
          setActiveTab(t as any);
          setSelectedDetailAccountId(null);
        }}
      />

      {/* ========================================================================= */}
      {/* TAB: COMPTES FINANCIERS & TRÉSORERIE */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        selectedDetailAccountId ? (
          <FinancialAccountDetailView
            accountId={selectedDetailAccountId}
            onBack={() => setSelectedDetailAccountId(null)}
            onEdit={(acc) => {
              setAccountForEdit(acc);
            }}
            onAdjust={(acc) => {
              setAccountForAdjust(acc);
            }}
            onReset={(acc) => {
              setAccountForReset(acc);
            }}
            onToggleStatus={(acc) => {
              handleToggleAccountStatus(acc);
            }}
            onDeleteOrTransfer={(acc) => {
              setAccountForDelete(acc);
            }}
            onTransfer={(fromId) => {
              handleOpenTransfer(fromId);
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Global Treasury KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-brand-500 bg-gradient-to-br from-white to-brand-50/20 dark:from-slate-900 dark:to-brand-950/20 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trésorerie Consolidée</span>
                  <Landmark className="w-5 h-5 text-brand-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {formatCurrency(treasuryMetrics.totalTreasury)}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1 font-medium">
                  {treasuryMetrics.activeCount} compte(s) financier(s) actif(s)
                </span>
              </Card>

              <Card className="p-4 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/20 dark:from-slate-900 dark:to-amber-950/20 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Caisses & Espèces</span>
                  <Wallet className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {formatCurrency(treasuryMetrics.cashTotal)}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Caisse Principale & Petites Caisses
                </span>
              </Card>

              <Card className="p-4 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/20 dark:from-slate-900 dark:to-amber-950/20 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Comptes Bancaires</span>
                  <Landmark className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {formatCurrency(treasuryMetrics.bankTotal)}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Virements & Dépôts bancaires
                </span>
              </Card>

              <Card className="p-4 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/20 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Mobile Money</span>
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  {formatCurrency(treasuryMetrics.momoTotal)}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Orange Money & MTN MoMo
                </span>
              </Card>
            </div>

            {/* Accounts List Header & Filtering Controls */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-brand-600" />
                    Gestion Administrative des Comptes Financiers ({filteredAgencyAccounts.length}/{agencyAccounts.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contrôle individuel par compte : consultation, modification, ajustement manuel, réinitialisation sécurisée et transferts.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Cards / Table Toggle */}
                  <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setAccountLayoutView('cards')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        accountLayoutView === 'cards'
                          ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Vue Cartes"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden md:inline">Cartes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountLayoutView('table')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        accountLayoutView === 'table'
                          ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Vue Tableau"
                    >
                      <List className="w-4 h-4" />
                      <span className="hidden md:inline">Tableau</span>
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    icon={ArrowRightLeft}
                    onClick={() => handleOpenTransfer()}
                    className="text-xs font-bold text-brand-700 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 border-brand-200"
                  >
                    Effectuer un Virement
                  </Button>
                  {canManageSensitiveFinancials && (
                    <Button
                      variant="primary"
                      icon={Plus}
                      onClick={handleOpenCreateAccount}
                      className="text-xs font-bold shadow-sm shadow-brand-500/20"
                    >
                      + Nouveau Compte
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="w-44">
                    <Select
                      value={accountTypeFilter}
                      onChange={(e) => setAccountTypeFilter(e.target.value)}
                      options={[
                        { value: 'ALL', label: 'Tous les Types' },
                        { value: 'CASH', label: 'Espèces / Caisses' },
                        { value: 'BANK', label: 'Banques' },
                        { value: 'MOBILE_MONEY', label: 'Mobile Money' },
                        { value: 'ELECTRONIC', label: 'Portefeuille Électronique' },
                        { value: 'OTHER', label: 'Autres' }
                      ]}
                    />
                  </div>

                  <div className="w-36">
                    <Select
                      value={accountStatusFilter}
                      onChange={(e) => setAccountStatusFilter(e.target.value)}
                      options={[
                        { value: 'ALL', label: 'Tous Statuts' },
                        { value: 'ACTIVE', label: 'Actifs' },
                        { value: 'INACTIVE', label: 'Inactifs' },
                        { value: 'ARCHIVED', label: 'Archivés' }
                      ]}
                    />
                  </div>
                </div>

                <div className="w-full sm:w-72 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                    placeholder="Rechercher compte, code, banque..."
                    className="pl-9 text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              {/* Empty State */}
              {filteredAgencyAccounts.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <Landmark className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    Aucun compte financier trouvé
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Aucun compte ne correspond aux filtres sélectionnés. Ajustez vos critères ou créez un nouveau compte.
                  </p>
                  {canManageSensitiveFinancials && (
                    <Button
                      variant="primary"
                      icon={Plus}
                      size="sm"
                      onClick={handleOpenCreateAccount}
                      className="text-xs font-bold"
                    >
                      Créer un Compte
                    </Button>
                  )}
                </div>
              ) : accountLayoutView === 'cards' ? (
                /* ========================================================================= */
                /* 1. CARDS VIEW (RESPONSIVE WITH ZERO OVERFLOW & DROPDOWN) */
                /* ========================================================================= */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAgencyAccounts.map(acc => (
                    <FinancialAccountCard
                      key={acc.id}
                      account={acc}
                      onViewDetail={(account) => setSelectedDetailAccountId(account.id)}
                      onEdit={(account) => setAccountForEdit(account)}
                      onAdjust={(account) => setAccountForAdjust(account)}
                      onTransfer={(fromId) => handleOpenTransfer(fromId)}
                      onToggleStatus={(account) => handleToggleAccountStatus(account)}
                      onReset={(account) => setAccountForReset(account)}
                      onDelete={(account) => setAccountForDelete(account)}
                    />
                  ))}
                </div>
              ) : (
                /* ========================================================================= */
                /* 2. TABLE VIEW (STRUCTURED DESKTOP TABLE) */
                /* ========================================================================= */
                <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code & Nom du Compte</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Établissement / Coordonnées</TableHead>
                          <TableHead className="text-right">Solde Actuel</TableHead>
                          <TableHead>Rôles Spécifiques</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAgencyAccounts.map(acc => {
                          const isCash = acc.type === 'CASH';
                          const isBank = acc.type === 'BANK';
                          const isMomo = acc.type === 'MOBILE_MONEY';

                          return (
                            <TableRow key={acc.id} className={acc.isArchived ? 'opacity-60 bg-slate-50 dark:bg-slate-900/30' : ''}>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isBank
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                        : isMomo
                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                        : 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400'
                                    }`}>
                                    {isBank ? <Landmark className="w-4 h-4" /> : isMomo ? <Smartphone className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                                      {acc.name}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {acc.code}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <Badge variant="outline" size="sm" className="font-bold text-[10px]">
                                  {isBank ? 'Banque' : isMomo ? 'Mobile Money' : 'Espèces'}
                                </Badge>
                              </TableCell>

                              <TableCell>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                  <div>{acc.bankName || '—'}</div>
                                  {acc.accountNumber && <div className="font-mono text-[10px] text-slate-400">N° {acc.accountNumber}</div>}
                                </div>
                              </TableCell>

                              <TableCell className="text-right">
                                <span className="font-black text-sm text-slate-900 dark:text-white">
                                  {formatCurrency(acc.currentBalance, acc.currency)}
                                </span>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {acc.isMainCash && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                      Caisse Principale
                                    </span>
                                  )}
                                  {acc.isDefault && (
                                    <span className="bg-brand-100 text-brand-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                      Défaut
                                    </span>
                                  )}
                                  {acc.isPettyCash && (
                                    <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                      Petite Caisse
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant={acc.isArchived ? 'outline' : acc.isActive ? 'success' : 'outline'}
                                  size="sm"
                                  className="font-bold text-[10px]"
                                >
                                  {acc.isArchived ? 'Archivé' : acc.isActive ? 'Actif' : 'Inactif'}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={Eye}
                                    onClick={() => setSelectedDetailAccountId(acc.id)}
                                    className="h-8 px-2 text-xs font-bold text-brand-600 hover:bg-brand-50"
                                    title="Consulter la fiche détaillée"
                                  >
                                    Fiche
                                  </Button>
                                  {canManageSensitiveFinancials && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        icon={Edit}
                                        onClick={() => setAccountForEdit(acc)}
                                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                                        title="Modifier"
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        icon={Scale}
                                        onClick={() => setAccountForAdjust(acc)}
                                        className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                                        title="Ajuster le solde"
                                      />
                                    </>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    icon={ArrowRightLeft}
                                    onClick={() => handleOpenTransfer(acc.id)}
                                    disabled={!acc.isActive || acc.currentBalance <= 0}
                                    className="h-8 w-8 p-0 text-brand-600 hover:bg-brand-50"
                                    title="Transférer"
                                  />
                                  {canManageSensitiveFinancials && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        icon={AlertOctagon}
                                        onClick={() => setAccountForReset(acc)}
                                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                                        title="Réinitialiser à 0"
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        icon={Trash2}
                                        onClick={() => setAccountForDelete(acc)}
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                                        title="Supprimer / Archiver"
                                      />
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* TAB: EXERCICES & PÉRIODES FINANCIÈRES */}
      {/* ========================================================================= */}
      {activeTab === 'years-periods' && (
        <FinancialYearsAndPeriodsView
          selectedYearId={selectedFinancialYearId}
          selectedPeriodId={selectedFinancialPeriodId}
          onSelectYear={(yearId) => {
            setSelectedFinancialYearId(yearId);
            const pers = dbStore.getFinancialPeriods(yearId, selectedAgencyId);
            const currentP = pers.find(p => p.isCurrentPeriod) || pers[0];
            setSelectedFinancialPeriodId(currentP?.id || 'ALL');
          }}
          onSelectPeriod={(periodId) => {
            setSelectedFinancialPeriodId(periodId);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: TRANSFERTS INTER-COMPTES */}
      {/* ========================================================================= */}
      {activeTab === 'transfers' && (
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-brand-600" />
                Virements & Transferts Inter-Comptes ({agencyTransfers.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Translations internes de fonds entre caisses, comptes bancaires et mobile money (non comptabilisés en dépenses ni recettes).
              </p>
            </div>

            <Button
              variant="primary"
              icon={Plus}
              onClick={() => handleOpenTransfer()}
              className="text-xs font-bold"
            >
              + Nouveau Transfert
            </Button>
          </div>

          {/* Transfers Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Référence</TableHead>
                  <TableHead>Compte Source (Débité)</TableHead>
                  <TableHead>Compte Cible (Crédité)</TableHead>
                  <TableHead className="text-right">Montant Transféré</TableHead>
                  <TableHead>Motif / Justification</TableHead>
                  <TableHead>Enregistré par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencyTransfers.map(trf => (
                  <TableRow key={trf.id}>
                    <TableCell>
                      <span className="font-mono font-bold text-xs text-brand-600 block">{trf.reference || trf.movementNumber}</span>
                      <span className="text-[11px] text-slate-400">{formatDate(trf.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" size="sm" className="font-bold text-rose-600 border-rose-200">
                        {trf.fromAccountName || trf.financialAccountName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" size="sm" className="font-bold text-emerald-600 border-emerald-200">
                        {trf.toAccountName || 'Compte Cible'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-xs text-slate-900 dark:text-white">
                      {formatCurrency(trf.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {trf.notes || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {trf.performedByUserName || 'Gestionnaire'}
                    </TableCell>
                  </TableRow>
                ))}

                {agencyTransfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      Aucun virement inter-comptes enregistré pour le moment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB: JOURNAL DES FLUX FINANCIERS (LEDGER CENTRALISÉ) */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                Grand Livre des Flux Financiers ({filteredFinancialMovements.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Traçabilité intégrale de toutes les entrées, sorties, paiements fournisseurs et virements multi-comptes.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="flex-1 relative">
              <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher par N° mouvement, référence, motif, auteur..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={ledgerAccountFilter}
                onChange={(e) => setLedgerAccountFilter(e.target.value)}
                className="text-xs min-w-[170px]"
              >
                <option value="ALL">Tous les Comptes Financiers</option>
                {agencyAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>

              <Select
                value={ledgerCategoryFilter}
                onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                className="text-xs min-w-[160px]"
              >
                <option value="ALL">Toutes les Catégories</option>
                <option value="INFLOW">🟢 Entrées (Inflows)</option>
                <option value="OUTFLOW">🔴 Sorties (Outflows)</option>
                <option value="TRANSFER">🔄 Transferts Inter-Comptes</option>
                <option value="COMMERCIAL_PAYMENT">Ventes & Prestations</option>
                <option value="SUPPLIER_PAYMENT">Paiements Fournisseurs</option>
                <option value="EXPENSE">Dépenses Générales</option>
              </Select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & N°</TableHead>
                  <TableHead>Compte Financier</TableHead>
                  <TableHead>Type & Catégorie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Solde Après</TableHead>
                  <TableHead>Référence / Motif</TableHead>
                  <TableHead>Auteur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFinancialMovements.map(mvt => {
                  const isInflow = mvt.movementType === 'INFLOW' || mvt.category === 'TRANSFER_IN';
                  const isOutflow = mvt.movementType === 'OUTFLOW' || mvt.category === 'TRANSFER_OUT';

                  return (
                    <TableRow key={mvt.id}>
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-brand-600 block">{mvt.movementNumber}</span>
                        <span className="text-[11px] text-slate-400">{formatDate(mvt.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {mvt.financialAccountName}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {mvt.financialAccountType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isInflow ? 'success' : isOutflow ? 'danger' : 'outline'}
                          size="sm"
                          className="font-bold text-[10px]"
                        >
                          {mvt.categoryLabel || mvt.category}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-black text-xs ${isInflow ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isInflow ? '+' : '-'}{formatCurrency(mvt.amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs text-slate-700 dark:text-slate-300">
                        {formatCurrency(mvt.balanceAfter)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        <div>{mvt.reference && <strong className="font-mono text-slate-700 dark:text-slate-300">[{mvt.reference}] </strong>}{mvt.notes || '-'}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {mvt.performedByUserName || 'Système'}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredFinancialMovements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                      Aucun mouvement financier trouvé avec ces filtres.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CAISSE DU JOUR / SESSION ACTIVE */}
      {/* ========================================================================= */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {!activeSession ? (
            <Card className="p-8 text-center border-dashed border-2 border-slate-300 dark:border-slate-800 space-y-4">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Aucune session de caisse ouverte</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Pour commencer à enregistrer les encaissements de commandes, prestations ou formations de la journée, veuillez ouvrir la caisse avec le fonds initial.
                </p>
              </div>
              <Button
                variant="primary"
                icon={Unlock}
                onClick={() => setIsOpenSessionModalOpen(true)}
              >
                Ouvrir la Caisse avec Fonds Initial
              </Button>
            </Card>
          ) : (
            <>
              {/* Session Info Ribbon */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 sm:p-5 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base">
                        Session #{activeSession.id.toUpperCase()}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        🟢 EN COURS
                      </span>
                      {todaySessionMetrics.isDeficit && (
                        <span className="bg-rose-500/30 text-rose-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-rose-500/40 animate-pulse">
                          🔴 DÉFICITAIRE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">
                      Ouverte par <strong>{activeSession.userName}</strong> à {formatDate(activeSession.openedAt, 'HH:mm')} ({formatDate(activeSession.openedAt, 'dd/MM/yyyy')})
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs"
                    icon={Plus}
                    onClick={() => setIsCashInjectionModalOpen(true)}
                  >
                    + Alimenter Caisse
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
                    icon={FileText}
                    onClick={() => setSessionForReport(activeSession)}
                  >
                    Aperçu Rapport Journalier
                  </Button>
                </div>
              </div>

              {/* KPI Metrics Responsive Grid (5 Indicateurs Financiers Distincts) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* 1. Fonds Initial */}
                <Card className="p-4 border-l-4 border-l-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Fonds Initial</span>
                    <Unlock className="w-4 h-4 text-slate-500" />
                  </div>
                  <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {formatCurrency(todaySessionMetrics.openingBalance)}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Monnaie de démarrage</p>
                </Card>

                {/* 2. Recettes Commerciales (CA Encaissé) */}
                <Card className="p-4 border-l-4 border-l-emerald-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Recettes (Ventes)</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-base sm:text-xl font-extrabold text-emerald-600 mt-1">
                    +{formatCurrency(todaySessionMetrics.commercialRevenue)}
                  </h3>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                    {todaySessionMetrics.ordersCount} cmd • {todaySessionMetrics.trainingsCount} form.
                  </p>
                </Card>

                {/* 3. Alimentations de Caisse */}
                <Card className="p-4 border-l-4 border-l-amber-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Alimentations</span>
                    <Plus className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-base sm:text-xl font-extrabold text-amber-600 mt-1">
                    +{formatCurrency(todaySessionMetrics.cashInjections)}
                  </h3>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
                    Apports (hors CA)
                  </p>
                </Card>

                {/* 4. Sorties & Décaissements */}
                <Card className="p-4 border-l-4 border-l-rose-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Sorties & Décaissem.</span>
                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                  </div>
                  <h3 className="text-base sm:text-xl font-extrabold text-rose-600 mt-1">
                    -{formatCurrency(todaySessionMetrics.outflows)}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Dép: {formatCurrency(todaySessionMetrics.expenses)} | Remb: {formatCurrency(todaySessionMetrics.refunds)}
                  </p>
                </Card>

                {/* 5. Solde Théorique en Caisse */}
                <Card className={`p-4 border-l-4 col-span-2 sm:col-span-1 ${
                  todaySessionMetrics.isDeficit
                    ? 'border-l-rose-600 bg-rose-50/50 dark:bg-rose-950/30'
                    : 'border-l-brand-500 bg-brand-50/20 dark:bg-brand-950/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] sm:text-xs font-black uppercase ${
                      todaySessionMetrics.isDeficit ? 'text-rose-600' : 'text-brand-600 dark:text-brand-400'
                    }`}>
                      {todaySessionMetrics.isDeficit ? '🔴 Caisse Déficitaire' : 'Solde Théorique'}
                    </span>
                    <Wallet className={`w-4 h-4 ${todaySessionMetrics.isDeficit ? 'text-rose-600' : 'text-brand-500'}`} />
                  </div>
                  <h3 className={`text-base sm:text-xl font-black mt-1 ${
                    todaySessionMetrics.isDeficit ? 'text-rose-600' : 'text-brand-700 dark:text-brand-300'
                  }`}>
                    {formatCurrency(todaySessionMetrics.theoreticalBalance)}
                  </h3>
                  <p className={`text-[10px] mt-0.5 font-bold ${
                    todaySessionMetrics.isDeficit ? 'text-rose-700' : 'text-slate-500'
                  }`}>
                    {todaySessionMetrics.isDeficit ? `Déficit: ${formatCurrency(todaySessionMetrics.deficitAmount)}` : 'Fonds + Entrées - Sorties'}
                  </p>
                </Card>
              </div>

              {/* Secondary Stats: Remises et Volumes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Remises Accordées</span>
                    <span className="text-sm sm:text-base font-extrabold text-amber-600">
                      {formatCurrency(todaySessionMetrics.discountsTotal)}
                    </span>
                  </div>
                </Card>

                <Card className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Commandes Encaissées</span>
                    <span className="text-sm sm:text-base font-extrabold text-brand-600">
                      {todaySessionMetrics.ordersCount} commandes
                    </span>
                  </div>
                </Card>

                <Card className="p-3 sm:p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Paiements Formations</span>
                    <span className="text-sm sm:text-base font-extrabold text-amber-600">
                      {todaySessionMetrics.trainingsCount} règlements
                    </span>
                  </div>
                </Card>
              </div>

              {/* Breakdowns: Par Prestation & Par Mode de Paiement */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Répartition par Prestation */}
                <Card className="p-4 sm:p-6 space-y-4">
                  <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-emerald-500" />
                      Répartition des Recettes par Prestation
                    </CardTitle>
                    <span className="text-xs font-extrabold text-emerald-600">
                      Total: {formatCurrency(todaySessionMetrics.inflows)}
                    </span>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3">
                    {todaySessionMetrics.serviceBreakdown.map((item, idx) => {
                      const percent = todaySessionMetrics.inflows > 0
                        ? Math.round((item.amount / todaySessionMetrics.inflows) * 100)
                        : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(item.amount)} <span className="text-slate-400 font-normal">({percent}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* 2. Répartition par Mode de Paiement */}
                <Card className="p-4 sm:p-6 space-y-4">
                  <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-500" />
                      Répartition par Mode de Paiement
                    </CardTitle>
                    <span className="text-xs font-extrabold text-amber-600">
                      Total: {formatCurrency(todaySessionMetrics.inflows)}
                    </span>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3">
                    {todaySessionMetrics.paymentMethodBreakdown.map((item, idx) => {
                      const percent = todaySessionMetrics.inflows > 0
                        ? Math.round((item.amount / todaySessionMetrics.inflows) * 100)
                        : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(item.amount)} <span className="text-slate-400 font-normal">({percent}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Live Journal of Movements for the Session */}
              <Card className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-brand-500" />
                      Journal des Transactions de la Journée
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Toutes les entrées et sorties consignées en direct dans la session en cours.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={movementsTypeFilter}
                      onChange={(e) => setMovementsTypeFilter(e.target.value as any)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Tous les flux ({todaySessionMetrics.movements.length})</option>
                      <option value="INFLOW">🟢 Recettes uniquement</option>
                      <option value="OUTFLOW">🔴 Sorties & Dépenses</option>
                    </select>
                  </div>
                </div>

                {/* Movements Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Heure / Ref</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Description & Motif</TableHead>
                        <TableHead>Opérateur</TableHead>
                        <TableHead className="text-right">Montant (GNF)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaySessionMetrics.movements
                        .filter(m => {
                          if (movementsTypeFilter === 'INFLOW') return m.movementType === 'INFLOW';
                          if (movementsTypeFilter === 'OUTFLOW') return m.movementType === 'OUTFLOW' || m.movementType === 'EXPENSE';
                          return true;
                        })
                        .map(m => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white block">
                                {formatDate(m.createdAt, 'HH:mm:ss')}
                              </span>
                              <span className="text-[10px] text-slate-400">{m.id}</span>
                            </TableCell>

                            <TableCell>
                              {m.movementType === 'INFLOW' ? (
                                <Badge variant="success" size="sm">🟢 Recette</Badge>
                              ) : (
                                <Badge variant="danger" size="sm">🔴 Sortie</Badge>
                              )}
                            </TableCell>

                            <TableCell>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {m.category || 'Général'}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="text-xs text-slate-600 dark:text-slate-300 block max-w-xs truncate">
                                {m.reason}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="text-xs text-slate-500">
                                {m.performedByUserName || 'Caissier'}
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <span className={`font-extrabold text-xs ${
                                m.movementType === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {m.movementType === 'INFLOW' ? '+' : '-'}{formatCurrency(m.amount)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      {todaySessionMetrics.movements.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                            Aucune opération enregistrée pour le moment dans cette session.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards for Movements */}
                <div className="md:hidden space-y-2.5">
                  {todaySessionMetrics.movements
                    .filter(m => {
                      if (movementsTypeFilter === 'INFLOW') return m.movementType === 'INFLOW';
                      if (movementsTypeFilter === 'OUTFLOW') return m.movementType === 'OUTFLOW' || m.movementType === 'EXPENSE';
                      return true;
                    })
                    .map(m => (
                      <Card key={m.id} className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {formatDate(m.createdAt, 'HH:mm')}
                            </span>
                            <Badge variant={m.movementType === 'INFLOW' ? 'success' : 'danger'} size="sm">
                              {m.movementType === 'INFLOW' ? 'Recette' : 'Sortie'}
                            </Badge>
                          </div>
                          <span className={`font-extrabold text-xs ${
                            m.movementType === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {m.movementType === 'INFLOW' ? '+' : '-'}{formatCurrency(m.amount)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {m.reason}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>Catégorie: {m.category || 'Général'}</span>
                          <span>Par: {m.performedByUserName || 'Caissier'}</span>
                        </div>
                      </Card>
                    ))}
                  {todaySessionMetrics.movements.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Aucune opération enregistrée pour le moment.
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RAPPORTS PÉRIODIQUES (JOUR, SEMAINE, MOIS, ANNÉE, PERSONNALISÉ) */}
      {/* ========================================================================= */}
      {activeTab === 'period-reports' && (
        <div className="space-y-6">
          {/* Period Selector Card */}
          <Card className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  Sélection de la Période d'Analyse
                </h3>
                <p className="text-xs text-slate-400">
                  Consultez les résultats financiers consolidés selon l'échelle temporelle souhaitée.
                </p>
              </div>

              {/* Quick Period Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
                <button
                  onClick={() => setPeriodType('TODAY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    periodType === 'TODAY'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => setPeriodType('WEEK')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    periodType === 'WEEK'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Cette Semaine
                </button>
                <button
                  onClick={() => setPeriodType('MONTH')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    periodType === 'MONTH'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Ce Mois
                </button>
                <button
                  onClick={() => setPeriodType('YEAR')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    periodType === 'YEAR'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Cette Année
                </button>
                <button
                  onClick={() => setPeriodType('CUSTOM')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    periodType === 'CUSTOM'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Personnalisée
                </button>
              </div>
            </div>

            {/* Custom Dates Inputs & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {periodType === 'CUSTOM' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Date Début</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Date Fin</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Opérateur / Caissier</label>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tous les collaborateurs</option>
                  {state.users.filter(u => u.tenantId === currentTenant?.id).map(u => (
                    <option key={u.id} value={`${u.firstName} ${u.lastName}`}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Mode de Règlement</label>
                <select
                  value={selectedMethodFilter}
                  onChange={(e) => setSelectedMethodFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tous les modes</option>
                  <option value="CASH">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="BANK_TRANSFER">Virement Bancaire</option>
                  <option value="CARD">Carte Bancaire</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Period Financial Summary KPIs (Séparation stricte CA, Apports, Dépenses, Remboursements, Dettes) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase block">1. Recettes (CA)</span>
              <h3 className="text-base sm:text-xl font-extrabold text-emerald-600 mt-1">
                {formatCurrency(periodMetrics.totalCommercialRevenue)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{periodMetrics.paymentsCount} encaissements</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <span className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase block">2. Alimentations</span>
              <h3 className="text-base sm:text-xl font-extrabold text-amber-600 mt-1">
                {formatCurrency(periodMetrics.totalCashInjections)}
              </h3>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Apports (hors CA)</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-rose-500">
              <span className="text-[10px] sm:text-xs font-bold text-rose-500 uppercase block">3. Sorties / Dépenses</span>
              <h3 className="text-base sm:text-xl font-extrabold text-rose-600 mt-1">
                {formatCurrency(periodMetrics.totalExpenses)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{periodMetrics.expenses.length} décaissements</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <span className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase block">4. Remboursements</span>
              <h3 className="text-base sm:text-xl font-extrabold text-amber-600 mt-1">
                {formatCurrency(periodMetrics.totalRefunds)}
              </h3>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Rendus clients</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-rose-500">
              <span className="text-[10px] sm:text-xs font-bold text-rose-500 uppercase block">5. Dettes Fournisseurs</span>
              <h3 className="text-base sm:text-xl font-extrabold text-rose-600 mt-1">
                {formatCurrency(periodMetrics.totalSupplierDebts)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Engagées non payées</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-brand-500 bg-brand-50/20 dark:bg-brand-950/20">
              <span className="text-[10px] sm:text-xs font-bold text-brand-600 dark:text-brand-400 uppercase block">6. Trésorerie Nette</span>
              <h3 className="text-base sm:text-xl font-black text-brand-700 dark:text-brand-300 mt-1">
                {formatCurrency(periodMetrics.netCashFlow)}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Recettes+Apports-Sorties</p>
            </Card>
          </div>

          {/* Trend Chart (Daily evolution over the period) */}
          {periodMetrics.trendData.length > 0 && (
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Évolution Quotidienne des Recettes & Dépenses
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Comparaison journalière des flux entrants et sortants sur la période sélectionnée.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Download}
                    onClick={() => {
                      const rows = [
                        ['Date', 'Recettes (GNF)', 'Dépenses (GNF)'],
                        ...periodMetrics.trendData.map(t => [t.date, t.recettes, t.depenses])
                      ];
                      handleExportCSV(`Rapport_Evolution_${periodType}`, rows);
                    }}
                  >
                    Exporter CSV
                  </Button>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodMetrics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val), '']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Legend />
                    <Bar dataKey="recettes" name="Recettes Encaissées" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="depenses" name="Dépenses & Sorties" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Period Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Services breakdown in period */}
            <Card className="p-4 sm:p-6 space-y-4">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand-500" />
                  Recettes par Prestation & Pôle
                </span>
                <span className="text-xs font-extrabold text-brand-600">
                  {formatCurrency(periodMetrics.totalGrossRevenue)}
                </span>
              </CardTitle>
              <div className="space-y-3">
                {periodMetrics.serviceBreakdown.map((s, idx) => {
                  const percent = periodMetrics.totalGrossRevenue > 0
                    ? Math.round((s.amount / periodMetrics.totalGrossRevenue) * 100)
                    : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{s.name}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(s.amount)} <span className="text-slate-400 font-normal">({percent}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Payment methods breakdown in period */}
            <Card className="p-4 sm:p-6 space-y-4">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-amber-500" />
                  Recettes par Mode de Paiement
                </span>
                <span className="text-xs font-extrabold text-amber-600">
                  {formatCurrency(periodMetrics.totalGrossRevenue)}
                </span>
              </CardTitle>
              <div className="space-y-3">
                {periodMetrics.methodBreakdown.map((m, idx) => {
                  const percent = periodMetrics.totalGrossRevenue > 0
                    ? Math.round((m.amount / periodMetrics.totalGrossRevenue) * 100)
                    : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{m.name}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(m.amount)} <span className="text-slate-400 font-normal">({percent}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: SUIVI DES DETTES & CRÉANCES CLIENTS */}
      {/* ========================================================================= */}
      {activeTab === 'debts' && (
        <ClientDebtsView />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORIQUE DES SESSIONS DE CAISSE */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Search & Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  placeholder="Rechercher par caissier, date, caisse..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Toutes les sessions ({state.cashSessions.length})</option>
                  <option value="OPEN">🟢 Sessions Ouvertes</option>
                  <option value="CLOSED">🔒 Sessions Clôturées</option>
                  <option value="DISCREPANCY">⚠️ Avec Écart constaté</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Horaires</TableHead>
                  <TableHead>Caissier / Opérateur</TableHead>
                  <TableHead>Fonds Initial</TableHead>
                  <TableHead>Recettes</TableHead>
                  <TableHead>Sorties</TableHead>
                  <TableHead>Solde Théorique</TableHead>
                  <TableHead>Solde Réel / Écart</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Rapport</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map(cs => {
                  const inflows = cs.movements?.filter(m => m.movementType === 'INFLOW').reduce((s, m) => s + m.amount, 0) || 0;
                  const outflows = cs.movements?.filter(m => m.movementType === 'OUTFLOW' || m.movementType === 'EXPENSE').reduce((s, m) => s + m.amount, 0) || 0;
                  const theoretical = cs.status === 'CLOSED' && cs.closingBalanceTheoretical !== undefined
                    ? cs.closingBalanceTheoretical
                    : cs.openingBalance + inflows - outflows;

                  const diff = cs.differenceAmount || 0;

                  return (
                    <TableRow key={cs.id}>
                      <TableCell>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          {formatDate(cs.openedAt, 'dd/MM/yyyy')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(cs.openedAt, 'HH:mm')} {cs.closedAt ? `➔ ${formatDate(cs.closedAt, 'HH:mm')}` : ''}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                          {cs.userName}
                        </span>
                        <span className="text-[10px] text-slate-400">{cs.cashRegisterName}</span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {formatCurrency(cs.openingBalance)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-bold text-emerald-600">
                          +{formatCurrency(inflows)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-bold text-rose-600">
                          -{formatCurrency(outflows)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(theoretical)}
                        </span>
                      </TableCell>

                      <TableCell>
                        {cs.status === 'CLOSED' ? (
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                              {formatCurrency(cs.closingBalanceActual || theoretical)}
                            </span>
                            {diff === 0 ? (
                              <Badge variant="success" size="sm">🟢 Équilibrée</Badge>
                            ) : diff < 0 ? (
                              <Badge variant="danger" size="sm">🔴 Écart {formatCurrency(diff)}</Badge>
                            ) : (
                              <Badge variant="warning" size="sm">🟠 Excédent +{formatCurrency(diff)}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">En cours</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {cs.status === 'OPEN' ? (
                          <Badge variant="success" size="sm">🟢 Ouverte</Badge>
                        ) : (
                          <Badge variant="outline" size="sm">🔒 Clôturée</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={FileText}
                          onClick={() => setSessionForReport(cs)}
                          title="Voir rapport journalier"
                        >
                          Rapport
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Cards for Cash History */}
          <div className="md:hidden space-y-3">
            {filteredSessions.map(cs => {
              const inflows = cs.movements?.filter(m => m.movementType === 'INFLOW').reduce((s, m) => s + m.amount, 0) || 0;
              const outflows = cs.movements?.filter(m => m.movementType === 'OUTFLOW' || m.movementType === 'EXPENSE').reduce((s, m) => s + m.amount, 0) || 0;
              const theoretical = cs.status === 'CLOSED' && cs.closingBalanceTheoretical !== undefined
                ? cs.closingBalanceTheoretical
                : cs.openingBalance + inflows - outflows;
              const diff = cs.differenceAmount || 0;

              return (
                <Card key={cs.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                        Session {formatDate(cs.openedAt, 'dd/MM/yyyy')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {cs.userName} • {formatDate(cs.openedAt, 'HH:mm')} {cs.closedAt ? `➔ ${formatDate(cs.closedAt, 'HH:mm')}` : ''}
                      </span>
                    </div>
                    <Badge variant={cs.status === 'OPEN' ? 'success' : 'outline'} size="sm">
                      {cs.status === 'OPEN' ? '🟢 Ouverte' : '🔒 Clôturée'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Fonds Initial</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(cs.openingBalance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Recettes Nettes</span>
                      <span className="font-bold text-emerald-600">
                        +{formatCurrency(inflows)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Dépenses / Sorties</span>
                      <span className="font-bold text-rose-600">
                        -{formatCurrency(outflows)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Solde Théorique</span>
                      <span className="font-extrabold text-brand-600">
                        {formatCurrency(theoretical)}
                      </span>
                    </div>
                  </div>

                  {cs.status === 'CLOSED' && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Compté: <strong>{formatCurrency(cs.closingBalanceActual || theoretical)}</strong></span>
                      {diff === 0 ? (
                        <Badge variant="success" size="sm">🟢 Équilibrée</Badge>
                      ) : (
                        <Badge variant={diff < 0 ? 'danger' : 'warning'} size="sm">
                          {diff < 0 ? `🔴 Manque ${formatCurrency(diff)}` : `🟠 Excédent +${formatCurrency(diff)}`}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      icon={FileText}
                      onClick={() => setSessionForReport(cs)}
                    >
                      Consulter Rapport Journalier
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GESTION DES DÉPENSES ET SORTIES */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Registre des Dépenses & Sorties de Caisse</h3>
              <p className="text-xs text-slate-400">Achats courants, fournitures d'atelier, courses et décaissements autorisés.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                icon={Plus}
                onClick={() => setIsCustomCategoryModalOpen(true)}
                className="text-xs"
              >
                + Nouveau Motif de Sortie
              </Button>
              <Button
                variant="primary"
                icon={Minus}
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-xs font-bold"
              >
                Effectuer une Sortie de Caisse
              </Button>
            </div>
          </div>

          {/* Categories Management Cards for Admin */}
          <Card className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span>🏷️</span> Motifs de Sortie Personnalisés & Enregistrés ({expenseCategories.length})
              </h4>
              <button
                type="button"
                onClick={() => setIsCustomCategoryModalOpen(true)}
                className="text-xs text-brand-600 hover:underline font-bold"
              >
                + Ajouter un motif personnalisé
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {expenseCategories.map(cat => (
                <div
                  key={cat.id}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2 shadow-sm"
                >
                  <span>{cat.icon || '📦'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                  {!cat.isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="text-slate-400 hover:text-rose-600 transition-colors ml-1"
                      title="Supprimer ce motif"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Expenses Table */}
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Bon</TableHead>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Motif / Catégorie</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Justification / Description</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.expenses && state.expenses.length > 0 ? (
                  state.expenses.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-rose-600">{e.expenseNumber}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {formatDate(e.createdAt, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" size="sm">{e.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {e.recipientName || 'Non spécifié'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                          {e.description}
                        </span>
                        {e.receiptNumber && (
                          <span className="text-[10px] text-slate-400 block">Réf pièce: {e.receiptNumber}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">{e.createdByName || 'Collaborateur'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-extrabold text-sm text-rose-600">
                          -{formatCurrency(e.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Printer}
                          onClick={() => setSelectedExpenseForReceipt(e)}
                          className="text-xs"
                        >
                          Bon
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                      Aucune dépense ou sortie de caisse enregistrée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: OUVERTURE DE LA CAISSE AVEC FONDS INITIAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOpenSessionModalOpen}
        onClose={() => setIsOpenSessionModalOpen(false)}
        title="Ouverture de la Caisse du Jour"
        maxWidth="md"
      >
        <form onSubmit={handleOpenSession} className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <Unlock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <strong className="block font-bold mb-0.5">Organisation de la Journée</strong>
              L'ouverture de la session permet d'enregistrer et de ventiler l'ensemble des encaissements (commandes, formations) et décaissements de la journée.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block">Date d'Ouverture</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatDate(new Date().toISOString(), 'dd/MM/yyyy')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Heure d'Ouverture</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatDate(new Date().toISOString(), 'HH:mm')}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block">Opérateur / Caissier</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Caissier Connecté'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Fonds de Caisse Initial (GNF) *
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">
              Monnaie disponible dans le tiroir-caisse au démarrage. (Non comptabilisé comme recette de vente).
            </p>
            <Input
              type="number"
              min="0"
              step="any"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(parseInt(e.target.value) || 0)}
              required
              className="text-lg font-black text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Observation / Note d'Ouverture (Facultatif)
            </label>
            <textarea
              rows={2}
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="Ex: Monnaie d'ouverture vérifiée et conforme..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsOpenSessionModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" icon={Check} type="submit">
              Confirmer l'Ouverture
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CLÔTURE DE CAISSE AVEC CALCUL DU DÉFICIT ET CONTRÔLE DES ÉCARTS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCloseSessionModalOpen}
        onClose={() => setIsCloseSessionModalOpen(false)}
        title="Clôture Journalière de la Caisse"
        maxWidth="lg"
      >
        <form onSubmit={handleCloseSession} className="space-y-5">
          {/* Summary Box Before Closing - 5 Indicateurs Fondamentaux */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">1. Fonds Initial</span>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {formatCurrency(todaySessionMetrics.openingBalance)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-bold">2. Recettes Comm.</span>
              <span className="font-extrabold text-sm text-emerald-600">
                +{formatCurrency(todaySessionMetrics.commercialRevenue)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block uppercase font-bold">3. Alimentation</span>
              <span className="font-extrabold text-sm text-amber-600">
                +{formatCurrency(todaySessionMetrics.cashInjections)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase font-bold">4. Sorties / Dép.</span>
              <span className="font-extrabold text-sm text-rose-600">
                -{formatCurrency(todaySessionMetrics.expenses)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block uppercase font-bold">5. Remboursements</span>
              <span className="font-extrabold text-sm text-amber-600">
                -{formatCurrency(todaySessionMetrics.refunds)}
              </span>
            </div>
          </div>

          {/* Theoretical Balance Box with Deficit Indicator */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            todaySessionMetrics.isDeficit
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60'
              : 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-900'
          }`}>
            <div>
              <span className={`text-[11px] font-black uppercase tracking-wider block ${
                todaySessionMetrics.isDeficit ? 'text-rose-700 dark:text-rose-300' : 'text-brand-700 dark:text-brand-300'
              }`}>
                {todaySessionMetrics.isDeficit ? '🔴 SOLDE THÉORIQUE (CAISSE DÉFICITAIRE)' : '🟢 SOLDE THÉORIQUE ATTENDU'}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Calcul : Fonds ({formatCurrency(todaySessionMetrics.openingBalance)}) + Recettes ({formatCurrency(todaySessionMetrics.commercialRevenue)}) + Apports ({formatCurrency(todaySessionMetrics.cashInjections)}) - Sorties ({formatCurrency(todaySessionMetrics.expenses)}) - Remb. ({formatCurrency(todaySessionMetrics.refunds)})
              </p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black ${
                todaySessionMetrics.isDeficit ? 'text-rose-600' : 'text-brand-700 dark:text-brand-300'
              }`}>
                {formatCurrency(todaySessionMetrics.theoreticalBalance)}
              </span>
              {todaySessionMetrics.isDeficit && (
                <span className="block text-[11px] font-extrabold text-rose-700">
                  Déficit théorique : {formatCurrency(todaySessionMetrics.deficitAmount)}
                </span>
              )}
            </div>
          </div>

          {/* Actual Cash Count Input (Toujours >= 0 GNF) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                Montant Réellement Compté dans le Tiroir-Caisse (GNF) *
              </label>
              <span className="text-[11px] text-slate-400 font-semibold">
                (Toujours ≥ 0 GNF — Une caisse physique ne peut pas être négative)
              </span>
            </div>
            <Input
              type="number"
              min="0"
              step="any"
              value={closingActualBalance}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setClosingActualBalance(val);
              }}
              required
              className="text-xl font-black text-slate-900 bg-white"
            />
          </div>

          {/* Automatic Situation / Discrepancy Alert */}
          {(() => {
            const diff = closingActualBalance - todaySessionMetrics.theoreticalBalance;
            const isDeficit = todaySessionMetrics.isDeficit;

            if (isDeficit) {
              return (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs font-extrabold text-rose-900 dark:text-rose-200 block">
                      🔴 CAISSE DÉFICITAIRE — DÉFICIT : {formatCurrency(todaySessionMetrics.deficitAmount)}
                    </strong>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                      Les sorties et remboursements ({formatCurrency(todaySessionMetrics.outflows)}) dépassent les fonds disponibles ({formatCurrency(todaySessionMetrics.openingBalance + todaySessionMetrics.inflows)}). La clôture reste possible, mais vous devez <strong>obligatoirement motiver et justifier ce déficit</strong> ci-dessous.
                    </p>
                  </div>
                </div>
              );
            } else if (diff === 0) {
              return (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 block">
                      🟢 CAISSE PARFAITEMENT ÉQUILIBRÉE
                    </strong>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Le montant compté ({formatCurrency(closingActualBalance)}) correspond exactement au solde théorique attendu. Aucun écart constaté.
                    </p>
                  </div>
                </div>
              );
            } else if (diff < 0) {
              return (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs font-extrabold text-rose-900 dark:text-rose-200 block">
                      🔴 ÉCART NÉGATIF CONSTATÉ : {formatCurrency(diff)} (MANQUE DE CAISSE)
                    </strong>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                      Le tiroir-caisse contient moins d'argent que le solde théorique attendu. Veuillez obligatoirement justifier cet écart ci-dessous.
                    </p>
                  </div>
                </div>
              );
            } else {
              return (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs font-extrabold text-amber-900 dark:text-amber-200 block">
                      🟠 EXCÉDENT DE CAISSE CONSTATÉ : +{formatCurrency(diff)}
                    </strong>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      Le tiroir-caisse contient plus d'argent que le solde théorique attendu. Veuillez obligatoirement justifier cet excédent ci-dessous.
                    </p>
                  </div>
                </div>
              );
            }
          })()}

          {/* Mandatory observation if deficit or discrepancy exists */}
          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              {todaySessionMetrics.isDeficit ? (
                <>Motif Obligatoire du Déficit <span className="text-rose-600">* (Requis pour clôturer)</span></>
              ) : closingActualBalance !== todaySessionMetrics.theoreticalBalance ? (
                <>Observation Obligatoire de l'Écart <span className="text-rose-600">* (Requis pour clôturer)</span></>
              ) : (
                <>Observation / Note de Clôture (Facultatif)</>
              )}
            </label>
            <textarea
              rows={2}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder={
                todaySessionMetrics.isDeficit
                  ? "Ex: Dépense urgente payée alors que la caisse ne disposait pas de fonds suffisants..."
                  : closingActualBalance !== todaySessionMetrics.theoreticalBalance
                  ? "Ex: Erreur de rendu de monnaie sur commande CMD-00125..."
                  : "Ex: Clôture d'inventaire journalière sans incident..."
              }
              required={todaySessionMetrics.isDeficit || closingActualBalance !== todaySessionMetrics.theoreticalBalance}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCloseSessionModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              icon={Lock}
              type="submit"
              disabled={(todaySessionMetrics.isDeficit || closingActualBalance !== todaySessionMetrics.theoreticalBalance) && !closingNotes.trim()}
            >
              Valider la Clôture Définitive
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ENREGISTREMENT D'UNE SORTIE DE CAISSE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Sortie de Caisse / Décaissement"
        maxWidth="lg"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4">
          <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
            <Minus className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200">
              <strong className="block font-bold mb-0.5">Décaissement de Fonds</strong>
              Toute sortie de fonds réduit le solde théorique de la session de caisse en cours et génère un bon officiel de sortie.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  Motif / Catégorie de sortie *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategoryModalOpen(true)}
                  className="text-[11px] text-brand-600 hover:underline font-bold"
                >
                  + Nouveau motif
                </button>
              </div>
              <Select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                options={expenseCategories.map(c => ({
                  value: c.name,
                  label: `${c.icon || '📦'} ${c.name}`
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                Montant Décaissé (GNF) *
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(parseInt(e.target.value) || 0)}
                required
                className="text-lg font-black text-rose-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Bénéficiaire de la somme (Nom & Fonction)
              </label>
              <Input
                value={expenseRecipient}
                onChange={(e) => setExpenseRecipient(e.target.value)}
                placeholder="ex: Mamadou Bah (Agent entretien), EDG..."
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                N° Reçu / Facture fournisseur externe (Optionnel)
              </label>
              <Input
                value={expenseReceiptRef}
                onChange={(e) => setExpenseReceiptRef(e.target.value)}
                placeholder="ex: Facture N° 00482, Reçu carburant..."
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Justification & Description Détaillée de la Dépense *
            </label>
            <textarea
              rows={3}
              value={expenseDescription}
              onChange={(e) => setExpenseDescription(e.target.value)}
              placeholder="ex: Achat de 2 ramettes papier 80g et liquide vaisselle pour le centre..."
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsExpenseModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" icon={Minus} type="submit">
              Valider le Décaissement ({formatCurrency(expenseAmount)})
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: AJOUT D'UN MOTIF DE SORTIE PERSONNALISÉ */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCustomCategoryModalOpen}
        onClose={() => setIsCustomCategoryModalOpen(false)}
        title="Personnaliser les Motifs de Sortie de Caisse"
        maxWidth="md"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl text-xs text-brand-900 dark:text-brand-200">
            L'administrateur peut créer des motifs sur mesure selon les besoins opérationnels du centre.
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Libellé du Nouveau Motif de Sortie *
            </label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="ex: Carburant groupe électrogène, Frais d'impression sous-traitée..."
              required
              className="text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Icône représentative
            </label>
            <div className="flex items-center gap-2">
              {['📦', '🧹', '⚡', '🛵', '☕', '🔧', '📄', '💼', '📶', '⛽', '🍔', '🏥', '📑'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewCategoryIcon(emoji)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-all ${
                    newCategoryIcon === emoji
                      ? 'bg-brand-100 border-brand-500 shadow-sm scale-110'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCustomCategoryModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" icon={Plus} type="submit">
              Enregistrer ce Motif
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: BON DE DÉCAISSEMENT / REÇU DE SORTIE IMPRIMABLE */}
      {/* ========================================================================= */}
      {selectedExpenseForReceipt && (
        <Modal
          isOpen={!!selectedExpenseForReceipt}
          onClose={() => setSelectedExpenseForReceipt(null)}
          title={`Bon de Décaissement : ${selectedExpenseForReceipt.expenseNumber}`}
          maxWidth="md"
        >
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-5 text-slate-900 dark:text-white">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm uppercase">{currentTenant?.name || 'CENTRE DE GESTION'}</h3>
                  <p className="text-[11px] text-rose-600 font-bold tracking-wider">BON OFFICIEL DE SORTIE DE CAISSE</p>
                </div>
                <div className="text-right font-mono text-xs font-bold text-rose-600">
                  {selectedExpenseForReceipt.expenseNumber}
                </div>
              </div>

              {/* Body details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Date & Heure :</span>
                  <span className="font-bold">{formatDate(selectedExpenseForReceipt.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Motif / Catégorie :</span>
                  <Badge variant="outline" size="sm">{selectedExpenseForReceipt.category}</Badge>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Bénéficiaire :</span>
                  <span className="font-bold">{selectedExpenseForReceipt.recipientName || 'Non spécifié'}</span>
                </div>
                {selectedExpenseForReceipt.receiptNumber && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Pièce justificative :</span>
                    <span>{selectedExpenseForReceipt.receiptNumber}</span>
                  </div>
                )}
                <div className="py-1">
                  <span className="text-slate-400 block mb-0.5">Description / Justificatif :</span>
                  <p className="font-semibold p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{selectedExpenseForReceipt.description}</p>
                </div>
              </div>

              {/* Amount Box */}
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase">Montant Décaissé :</span>
                <span className="text-xl font-black text-rose-600">{formatCurrency(selectedExpenseForReceipt.amount)}</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-center text-[10px]">
                <div>
                  <span className="font-bold text-slate-600 uppercase block">Émis par (Caissier)</span>
                  <p className="text-slate-400 mt-0.5">{selectedExpenseForReceipt.createdByName}</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mt-1"></div>
                </div>
                <div>
                  <span className="font-bold text-slate-600 uppercase block">Signature Bénéficiaire</span>
                  <p className="text-slate-400 mt-0.5">{selectedExpenseForReceipt.recipientName || 'Reçu pour acquis'}</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mt-1"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedExpenseForReceipt(null)}>
                Fermer
              </Button>
              <Button variant="primary" icon={Printer} onClick={() => window.print()}>
                Imprimer le Bon de Décaissement
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* ========================================================================= */}
      {/* MODAL 7: ALIMENTATION DE CAISSE (APPORT DE FONDS HORS CA) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCashInjectionModalOpen}
        onClose={() => setIsCashInjectionModalOpen(false)}
        title="Alimentation de Caisse (Apport de Fonds)"
        maxWidth="md"
      >
        <form onSubmit={handleCashInjection} className="space-y-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
            <Plus className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="block font-bold mb-0.5">Apport de Liquidités de Caisse</strong>
              L'alimentation de caisse augmente le solde de trésorerie disponible pour les opérations du centre sans être comptabilisée comme chiffre d'affaires commercial.
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Montant de l'Alimentation (GNF) *
            </label>
            <Input
              type="number"
              min="1"
              step="any"
              value={cashInjectionAmount}
              onChange={(e) => setCashInjectionAmount(parseInt(e.target.value) || 0)}
              required
              className="text-lg font-black text-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Origine des Fonds / Source
            </label>
            <Select
              value={cashInjectionSource}
              onChange={(e) => setCashInjectionSource(e.target.value)}
              options={[
                { value: 'Apport Direction / Gérant', label: '💼 Apport Direction / Gérant' },
                { value: 'Transfert Bancaire / Retrait Compte', label: '🏦 Virement / Retrait Compte Bancaire' },
                { value: 'Fonds de Roulement d\'Urgence', label: '⚡ Fonds de Roulement d\'Urgence' },
                { value: 'Autre Apport Externe', label: '📑 Autre Apport de Trésorerie' }
              ]}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Motif de l'Alimentation *
            </label>
            <Input
              value={cashInjectionReason}
              onChange={(e) => setCashInjectionReason(e.target.value)}
              placeholder="ex: Apport pour paiement urgent matières premières et monnaie..."
              required
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCashInjectionModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" icon={Plus} type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Valider l'Alimentation ({formatCurrency(cashInjectionAmount)})
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 8: REMBOURSEMENT CLIENT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Remboursement Client"
        maxWidth="md"
      >
        <form onSubmit={handleRecordRefund} className="space-y-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <strong className="block font-bold mb-0.5">Sortie pour Remboursement</strong>
              Tout remboursement réduit le solde de caisse et est journalisé séparément des dépenses ordinaires d'atelier.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                Montant Remboursé (GNF) *
              </label>
              <Input
                type="number"
                min="1"
                step="any"
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseInt(e.target.value) || 0)}
                required
                className="text-lg font-black text-amber-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Client Bénéficiaire
              </label>
              <Input
                value={refundClientName}
                onChange={(e) => setRefundClientName(e.target.value)}
                placeholder="Nom du client..."
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
              Motif Détaillé du Remboursement *
            </label>
            <textarea
              rows={2}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="ex: Annulation commande CMD-00142 suite à rupture papier spécial..."
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsRefundModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" icon={RefreshCw} type="submit" className="bg-amber-600 hover:bg-amber-700">
              Valider le Remboursement ({formatCurrency(refundAmount)})
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: RAPPORT JOURNALIER OFFICIEL IMPRIMABLE / PDF */}
      {/* ========================================================================= */}
      {sessionForReport && (
        <Modal
          isOpen={!!sessionForReport}
          onClose={() => setSessionForReport(null)}
          title={`Rapport Journalier de Caisse — ${formatDate(sessionForReport.openedAt, 'dd/MM/yyyy')}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Printable Report Sheet */}
            <div id="daily-cash-report-sheet" className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {currentTenant?.name || 'CENTRE PRESTATION ET FORMATION'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    RAPPORT OFFICIEL D'INVENTAIRE & CLÔTURE DE CAISSE
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Date : <strong>{formatDate(sessionForReport.openedAt, 'dd/MM/yyyy')}</strong> • Session #{sessionForReport.id.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={sessionForReport.status === 'CLOSED' ? 'outline' : 'success'} size="sm">
                    {sessionForReport.status === 'CLOSED' ? '🔒 Clôturée' : '🟢 En cours'}
                  </Badge>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Caissier : <strong>{sessionForReport.userName}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Horaires : {formatDate(sessionForReport.openedAt, 'HH:mm')} {sessionForReport.closedAt ? `➔ ${formatDate(sessionForReport.closedAt, 'HH:mm')}` : ''}
                  </p>
                </div>
              </div>

              {/* Financial Balance Summary Table (5 Indicateurs Fondamentaux) */}
              {(() => {
                const movements = sessionForReport.movements || [];
                const commercialRevenue = movements
                  .filter(m => (m.movementType === 'INFLOW' || (m as any).movementType === 'DEPOSIT') && m.category !== 'Alimentation de Caisse' && m.category !== 'Apport de Fonds')
                  .reduce((s, m) => s + m.amount, 0);
                const cashInjections = movements
                  .filter(m => m.category === 'Alimentation de Caisse' || m.category === 'Apport de Fonds' || (m.movementType as string) === 'CASH_INJECTION')
                  .reduce((s, m) => s + m.amount, 0);
                const expenses = movements
                  .filter(m => (m.movementType === 'OUTFLOW' || m.movementType === 'EXPENSE') && m.category !== 'Remboursement Client')
                  .reduce((s, m) => s + m.amount, 0);
                const refunds = movements
                  .filter(m => m.category === 'Remboursement Client' || (m.movementType as string) === 'REFUND')
                  .reduce((s, m) => s + m.amount, 0);

                const theoretical = sessionForReport.closingBalanceTheoretical !== undefined
                  ? sessionForReport.closingBalanceTheoretical
                  : sessionForReport.openingBalance + commercialRevenue + cashInjections - expenses - refunds;
                
                const actual = sessionForReport.closingBalanceActual !== undefined ? sessionForReport.closingBalanceActual : Math.max(0, theoretical);
                const diff = sessionForReport.differenceAmount !== undefined ? sessionForReport.differenceAmount : (actual - theoretical);
                const isDeficit = theoretical < 0;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">1. Fonds Initial</span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {formatCurrency(sessionForReport.openingBalance)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block uppercase font-bold">2. Recettes Comm.</span>
                        <span className="font-extrabold text-emerald-600 text-sm">
                          +{formatCurrency(commercialRevenue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block uppercase font-bold">3. Alimentations</span>
                        <span className="font-extrabold text-amber-600 text-sm">
                          +{formatCurrency(cashInjections)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-600 block uppercase font-bold">4. Sorties / Dép.</span>
                        <span className="font-extrabold text-rose-600 text-sm">
                          -{formatCurrency(expenses)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block uppercase font-bold">5. Remboursem.</span>
                        <span className="font-extrabold text-amber-600 text-sm">
                          -{formatCurrency(refunds)}
                        </span>
                      </div>
                    </div>

                    {/* Discrepancy / Deficit verification row */}
                    <div className={`p-4 rounded-xl flex items-center justify-between text-xs border ${
                      isDeficit
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200'
                    }`}>
                      <div>
                        <span className="text-slate-500 block">Solde Théorique :</span>
                        <strong className={`text-base font-black ${isDeficit ? 'text-rose-600' : 'text-brand-600'}`}>
                          {formatCurrency(theoretical)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Montant Réellement Compté :</span>
                        <strong className="text-base font-black text-slate-900 dark:text-white">
                          {formatCurrency(actual)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block">Situation :</span>
                        {isDeficit ? (
                          <Badge variant="danger" size="sm">🔴 Caisse Déficitaire ({formatCurrency(Math.abs(theoretical))})</Badge>
                        ) : diff === 0 ? (
                          <Badge variant="success" size="sm">🟢 Équilibrée (0 GNF)</Badge>
                        ) : diff < 0 ? (
                          <Badge variant="danger" size="sm">🔴 Manque {formatCurrency(diff)}</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">🟠 Excédent +{formatCurrency(diff)}</Badge>
                        )}
                      </div>
                    </div>

                    {sessionForReport.notes && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Motif & Justification Consignée :</span>
                        <p className="text-slate-800 dark:text-slate-200 italic font-semibold">{sessionForReport.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Transactions List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Détail des Transactions ({sessionForReport.movements?.length || 0})
                </h4>
                <div className="max-h-48 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Heure</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Motif</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sessionForReport.movements || []).map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs font-mono">{formatDate(m.createdAt, 'HH:mm')}</TableCell>
                          <TableCell>
                            <Badge variant={m.movementType === 'INFLOW' ? 'success' : 'danger'} size="sm">
                              {m.movementType === 'INFLOW' ? 'Recette' : 'Sortie'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300">{m.reason}</TableCell>
                          <TableCell className={`text-right font-bold text-xs ${
                            m.movementType === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {m.movementType === 'INFLOW' ? '+' : '-'}{formatCurrency(m.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Signatures & Stamp Block */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center">
                <div>
                  <span className="text-xs font-bold text-slate-700 block uppercase">Visa & Signature Caissier</span>
                  <p className="text-[11px] text-slate-400 mt-1">{sessionForReport.userName}</p>
                  <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300 mt-2">
                    <span className="text-[10px] text-slate-400 italic">Signature Numérique Enregistrée</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-700 block uppercase">Contrôle & Cachet Direction</span>
                  <p className="text-[11px] text-slate-400 mt-1">Directeur du Centre</p>
                  <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300 mt-2">
                    {currentTenant?.settings?.digitalSignatures?.find(s => s.type === 'STAMP') ? (
                      <img
                        src={currentTenant.settings.digitalSignatures.find(s => s.type === 'STAMP')?.imageUrl}
                        alt="Cachet Officiel"
                        className="max-h-12 object-contain opacity-80"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Cachet Officiel</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSessionForReport(null)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                icon={Printer}
                onClick={() => window.print()}
              >
                Imprimer / Exporter PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRÉER / MODIFIER UN COMPTE FINANCIER */}
      {/* ========================================================================= */}
      {isAccountModalOpen && (
        <Modal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          title={accountToEdit ? `Modifier le Compte — ${accountToEdit.name}` : "Création d'un Nouveau Compte Financier"}
          maxWidth="md"
        >
          <form onSubmit={handleSaveAccount} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nom du Compte *
              </label>
              <Input
                type="text"
                placeholder="ex: Caisse Principale, Compte Vista Bank, Orange Money..."
                value={accName}
                onChange={(e) => {
                  setAccName(e.target.value);
                  if (!accountToEdit && !accCode) {
                    setAccCode(e.target.value.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  }
                }}
                required
                className="font-bold text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Type de Compte *
                </label>
                <Select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as any)}
                  className="font-bold text-xs"
                >
                  <option value="CASH">💵 Espèces / Caisse Physique</option>
                  <option value="BANK">🏦 Compte Bancaire Commercial</option>
                  <option value="MOBILE_MONEY">📱 Mobile Money (Orange / MTN)</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Code Compte *
                </label>
                <Input
                  type="text"
                  placeholder="ex: CP-01, BNK-01"
                  value={accCode}
                  onChange={(e) => setAccCode(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase font-bold text-xs"
                />
              </div>
            </div>

            {!accountToEdit && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Solde Initial (GNF)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={accInitialBalance}
                  onChange={(e) => setAccInitialBalance(parseInt(e.target.value) || 0)}
                  className="font-black text-emerald-600 text-sm"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Montant présent sur ce compte au démarrage du système.
                </span>
              </div>
            )}

            {accType === 'BANK' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nom de la Banque
                  </label>
                  <Input
                    type="text"
                    placeholder="ex: BICIGUI, Ecobank, Vista Bank..."
                    value={accBankName}
                    onChange={(e) => setAccBankName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Numéro de Compte / IBAN
                  </label>
                  <Input
                    type="text"
                    placeholder="ex: GN025-..."
                    value={accNumber}
                    onChange={(e) => setAccNumber(e.target.value)}
                  />
                </div>
              </div>
            )}

            {accType === 'MOBILE_MONEY' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Numéro de Ligne Marchande Mobile Money
                </label>
                <Input
                  type="text"
                  placeholder="ex: +224 620 00 11 22"
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description / Usage
              </label>
              <Input
                type="text"
                placeholder="ex: Compte destiné aux règlements fournisseurs..."
                value={accDescription}
                onChange={(e) => setAccDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={accIsPettyCash}
                  onChange={(e) => setAccIsPettyCash(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                Définir comme Petite Caisse (Menues dépenses)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={accIsDefault}
                  onChange={(e) => setAccIsDefault(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                Compte par Défaut
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsAccountModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" icon={CheckCircle2} className="font-bold">
                {accountToEdit ? "Enregistrer les Modifications" : "Créer le Compte Financier"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIREMENT / TRANSFERT INTER-COMPTES */}
      {/* ========================================================================= */}
      {isTransferModalOpen && (
        <Modal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          title="Virement / Transfert Inter-Comptes"
          maxWidth="md"
        >
          <form onSubmit={handleExecuteTransfer} className="space-y-4 pt-1">
            <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-200 dark:border-brand-800 text-xs text-brand-900 dark:text-brand-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ArrowRightLeft className="w-4 h-4 text-brand-600" />
                Translation de Trésorerie Interne
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Ce transfert déplace des liquidités entre deux comptes de l'agence. Il ne génère aucune charge ni revenu sur le résultat d'exploitation.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Compte Source (Débité) *
              </label>
              <Select
                value={transferFromId}
                onChange={(e) => setTransferFromId(e.target.value)}
                required
                className="font-bold text-xs"
              >
                {agencyAccounts.filter(a => a.isActive).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} — Solde dispo: {formatCurrency(a.currentBalance)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Compte Destination (Crédité) *
              </label>
              <Select
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                required
                className="font-bold text-xs"
              >
                {agencyAccounts.filter(a => a.isActive && a.id !== transferFromId).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} — Solde actuel: {formatCurrency(a.currentBalance)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Montant à Transférer (GNF) *
              </label>
              <Input
                type="number"
                min="1"
                value={transferAmount}
                onChange={(e) => setTransferAmount(parseInt(e.target.value) || 0)}
                required
                className="text-base font-black text-brand-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Motif / Justificatif du Transfert
              </label>
              <Input
                type="text"
                placeholder="ex: Alimentation Petite Caisse, Dépôt espèces en banque..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" icon={ArrowRightLeft} className="font-bold">
                Exécuter le Transfert
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODALS DÉDIÉS : GESTION ADMINISTRATIVE INDIVIDUELLE DES COMPTES */}
      {/* ========================================================================= */}
      <FinancialAccountDetailModal
        isOpen={Boolean(accountForDetail)}
        onClose={() => setAccountForDetail(null)}
        account={accountForDetail}
        onEdit={(acc) => {
          setAccountForDetail(null);
          setAccountForEdit(acc);
        }}
        onAdjust={(acc) => {
          setAccountForDetail(null);
          setAccountForAdjust(acc);
        }}
        onReset={(acc) => {
          setAccountForDetail(null);
          setAccountForReset(acc);
        }}
        onToggleStatus={(acc) => {
          handleToggleAccountStatus(acc);
          const updated = dbStore.getState().financialAccounts?.find(a => a.id === acc.id);
          if (updated) setAccountForDetail(updated);
        }}
        onDeleteOrTransfer={(acc) => {
          setAccountForDetail(null);
          setAccountForDelete(acc);
        }}
        onTransfer={(fromId) => {
          setAccountForDetail(null);
          handleOpenTransfer(fromId);
        }}
      />

      <FinancialAccountEditModal
        isOpen={Boolean(accountForEdit)}
        onClose={() => setAccountForEdit(null)}
        account={accountForEdit}
        onEditSuccess={() => {
          setAccountForEdit(null);
        }}
      />

      <FinancialAccountAdjustBalanceModal
        isOpen={Boolean(accountForAdjust)}
        onClose={() => setAccountForAdjust(null)}
        account={accountForAdjust}
        onAdjustSuccess={() => {
          setAccountForAdjust(null);
        }}
      />

      <FinancialAccountResetModal
        isOpen={Boolean(accountForReset)}
        onClose={() => setAccountForReset(null)}
        account={accountForReset}
        onResetSuccess={() => {
          setAccountForReset(null);
        }}
      />

      <FinancialAccountDeleteAssistantModal
        isOpen={Boolean(accountForDelete)}
        onClose={() => setAccountForDelete(null)}
        account={accountForDelete}
        agencyAccounts={agencyAccounts}
        onActionSuccess={() => {
          setAccountForDelete(null);
        }}
        onOpenResetModal={() => {
          if (accountForDelete) {
            const acc = accountForDelete;
            setAccountForDelete(null);
            setAccountForReset(acc);
          }
        }}
      />
    </div>
  );
};
