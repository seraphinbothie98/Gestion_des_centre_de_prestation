import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Order } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  DollarSign, Users, AlertCircle, TrendingUp, Calendar,
  Filter, Search, Download, Printer, CheckCircle2, Clock,
  Truck, ArrowUpRight, ArrowDownRight, FileText, ShoppingBag, Lock, Unlock
} from 'lucide-react';
import { OrderPaymentModal } from '../orders/OrderPaymentModal';
import { OrderDeliveryModal } from '../orders/OrderDeliveryModal';
import { OpenCashModal } from '../cash/OpenCashModal';

export const ClientDebtsView: React.FC = () => {
  const { currentTenant, hasPermission } = useAuth();
  const state = dbStore.getState();

  const openSession = state.cashSessions.find(cs => cs.status === 'OPEN');
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryFilter, setDeliveryFilter] = useState<'ALL' | 'DELIVERED_UNPAID' | 'UNDELIVERED'>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIALLY_PAID'>('ALL');

  // Selected Order for Payment Modal
  const [orderForPayment, setOrderForPayment] = useState<Order | null>(null);
  const [orderForDelivery, setOrderForDelivery] = useState<Order | null>(null);

  // Compute Orders with Debts (dueAmount > 0)
  const debtorOrders = useMemo(() => {
    return state.orders.filter(o => {
      const due = o.dueAmount !== undefined ? o.dueAmount : Math.max(0, o.totalAmount - o.paidAmount);
      return due > 0 && o.status !== 'CANCELLED';
    });
  }, [state.orders]);

  // Filtered Orders with Debts
  const filteredDebts = useMemo(() => {
    return debtorOrders.filter(o => {
      // 1. Search filter
      const matchSearch =
        o.personName.toLowerCase().includes(search.toLowerCase()) ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        (o.personPhone && o.personPhone.includes(search));

      // 2. Delivery status filter
      let matchDelivery = true;
      if (deliveryFilter === 'DELIVERED_UNPAID') matchDelivery = o.status === 'DELIVERED';
      if (deliveryFilter === 'UNDELIVERED') matchDelivery = o.status !== 'DELIVERED';

      // 3. Payment status filter
      let matchPayment = true;
      const isUnpaid = o.paidAmount === 0;
      if (paymentStatusFilter === 'UNPAID') matchPayment = isUnpaid;
      if (paymentStatusFilter === 'PARTIALLY_PAID') matchPayment = !isUnpaid;

      // 4. Period filter
      let matchPeriod = true;
      const orderDate = new Date(o.createdAt);
      const now = new Date();

      if (periodFilter === 'TODAY') {
        const todayStr = now.toISOString().split('T')[0];
        matchPeriod = o.createdAt.startsWith(todayStr);
      } else if (periodFilter === 'WEEK') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const startWeek = new Date(now.setDate(diff));
        startWeek.setHours(0, 0, 0, 0);
        matchPeriod = orderDate >= startWeek;
      } else if (periodFilter === 'MONTH') {
        matchPeriod = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      } else if (periodFilter === 'YEAR') {
        matchPeriod = orderDate.getFullYear() === now.getFullYear();
      } else if (periodFilter === 'CUSTOM') {
        const start = new Date(customStartDate + 'T00:00:00');
        const end = new Date(customEndDate + 'T23:59:59');
        matchPeriod = orderDate >= start && orderDate <= end;
      }

      return matchSearch && matchDelivery && matchPayment && matchPeriod;
    });
  }, [debtorOrders, search, deliveryFilter, paymentStatusFilter, periodFilter, customStartDate, customEndDate]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalOrdersCount = state.orders.filter(o => o.status !== 'CANCELLED').length;
    const totalBilled = state.orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.totalAmount, 0);
    const totalCollected = state.orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.paidAmount, 0);
    const totalDebt = debtorOrders.reduce((s, o) => s + (o.dueAmount !== undefined ? o.dueAmount : Math.max(0, o.totalAmount - o.paidAmount)), 0);

    const distinctDebtorClients = new Set(debtorOrders.map(o => o.personId)).size;
    const fullyUnpaidCount = debtorOrders.filter(o => o.paidAmount === 0).length;
    const partiallyPaidCount = debtorOrders.filter(o => o.paidAmount > 0).length;
    const deliveredUnpaidCount = debtorOrders.filter(o => o.status === 'DELIVERED').length;

    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

    return {
      totalBilled,
      totalCollected,
      totalDebt,
      collectionRate,
      distinctDebtorClients,
      fullyUnpaidCount,
      partiallyPaidCount,
      deliveredUnpaidCount,
      totalDebtorOrders: debtorOrders.length
    };
  }, [state.orders, debtorOrders]);

  const handleExportCSV = () => {
    const rows = [
      ['N° Commande', 'Date', 'Client', 'Téléphone', 'Total (GNF)', 'Déjà Payé (GNF)', 'Dette Restante (GNF)', 'Statut Commande', 'Statut Paiement', 'Livrée non soldée'],
      ...filteredDebts.map(o => [
        o.orderNumber,
        formatDate(o.createdAt, 'dd/MM/yyyy'),
        o.personName,
        o.personPhone || '',
        o.totalAmount,
        o.paidAmount,
        o.dueAmount || (o.totalAmount - o.paidAmount),
        o.status,
        o.paidAmount === 0 ? 'NON_PAYE' : 'PARTIELLEMENT_PAYE',
        o.status === 'DELIVERED' ? 'OUI' : 'NON'
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dettes_Clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Closed Cash Session Warning & Direct Open Button */}
      {!openSession && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 text-amber-600 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-xs font-black text-amber-900 dark:text-amber-200 block">
                Session de Caisse Actuellement Fermée 🔴
              </strong>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Pour enregistrer un encaissement de dette, solder une commande ou percevoir un acompte, vous devez d'abord ouvrir la caisse du jour.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            icon={Unlock}
            onClick={() => setIsOpenCashModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 font-extrabold text-xs shrink-0"
          >
            Ouvrir la Caisse du Jour
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-500" />
            Suivi des Dettes & Créances Clients
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestion des avances, commandes livrées non soldées, paiements différés et recouvrement des créances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Download} onClick={handleExportCSV}>
            Exporter CSV
          </Button>
          <Button variant="primary" icon={Printer} onClick={() => window.print()}>
            Imprimer État des Dettes
          </Button>
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Créances / Dettes */}
        <Card className="p-4 border-l-4 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-rose-600 uppercase">Total Créances Clients</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(stats.totalDebt)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{stats.totalDebtorOrders} commande(s) en attente de solde</p>
        </Card>

        {/* 2. Nombre de clients débiteurs */}
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-amber-600 uppercase">Clients Débiteurs</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {stats.distinctDebtorClients} clients
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Ayant au moins 1 commande non soldée</p>
        </Card>

        {/* 3. Commandes livrées non soldées */}
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-purple-600 uppercase">Livrées Non Soldées</span>
            <Truck className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-1">
            {stats.deliveredUnpaidCount} commandes
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Marchandises déjà remises aux clients</p>
        </Card>

        {/* 4. Taux d'Encaissement Global */}
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 uppercase">Taux d'Encaissement</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
            {stats.collectionRate}%
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(stats.totalCollected)} encaissés sur {formatCurrency(stats.totalBilled)}</p>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="p-4 sm:p-5 space-y-4">
        {/* Period Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
            <button
              onClick={() => setPeriodFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                periodFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Toutes les périodes
            </button>
            <button
              onClick={() => setPeriodFilter('TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                periodFilter === 'TODAY'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setPeriodFilter('WEEK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                periodFilter === 'WEEK'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Cette Semaine
            </button>
            <button
              onClick={() => setPeriodFilter('MONTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                periodFilter === 'MONTH'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Ce Mois
            </button>
            <button
              onClick={() => setPeriodFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                periodFilter === 'CUSTOM'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Personnalisée
            </button>
          </div>

          <span className="text-xs font-bold text-rose-600">
            {filteredDebts.length} commande(s) filtrée(s) • Dette: {formatCurrency(filteredDebts.reduce((s, o) => s + (o.dueAmount || 0), 0))}
          </span>
        </div>

        {/* Input filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="md:col-span-2">
            <Input
              placeholder="Rechercher par client, commande, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tous les statuts de livraison</option>
              <option value="DELIVERED_UNPAID">🚚 Livrées non soldées ({stats.deliveredUnpaidCount})</option>
              <option value="UNDELIVERED">⏳ Non livrées (En atelier / Prêtes)</option>
            </select>
          </div>

          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tous les types de dette</option>
              <option value="UNPAID">🔴 100% Impayées (Sans avance)</option>
              <option value="PARTIALLY_PAID">🟠 Partiellement payées (Avec avance)</option>
            </select>
          </div>

          {periodFilter === 'CUSTOM' && (
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
        </div>
      </Card>

      {/* Debts Table on Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Commande</TableHead>
              <TableHead>Date Création</TableHead>
              <TableHead>Client & Contact</TableHead>
              <TableHead>Total Commande</TableHead>
              <TableHead>Déjà Réglé</TableHead>
              <TableHead>Dette Restante</TableHead>
              <TableHead>Statut Livraison</TableHead>
              <TableHead>Statut Paiement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDebts.map(order => {
              const due = order.dueAmount !== undefined ? order.dueAmount : Math.max(0, order.totalAmount - order.paidAmount);

              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-brand-600 block">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">{order.items.length} prestation(s)</span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block">
                      {formatDate(order.createdAt, 'dd/MM/yyyy')}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(order.createdAt, 'HH:mm')}</span>
                  </TableCell>

                  <TableCell>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      {order.personName}
                    </span>
                    <span className="text-[10px] text-slate-400">{order.personPhone || 'Aucun contact'}</span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs font-bold text-emerald-600">
                      {formatCurrency(order.paidAmount)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm font-black text-rose-600">
                      {formatCurrency(due)}
                    </span>
                  </TableCell>

                  <TableCell>
                    {order.status === 'DELIVERED' ? (
                      <Badge variant="purple" size="sm">🚚 Livrée non soldée</Badge>
                    ) : order.status === 'READY' ? (
                      <Badge variant="success" size="sm">✨ Prête pour retrait</Badge>
                    ) : order.status === 'IN_PRODUCTION' ? (
                      <Badge variant="info" size="sm">⚙️ En production</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">⏳ En attente</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {order.paidAmount === 0 ? (
                      <Badge variant="danger" size="sm">🔴 Non Payé</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">🟠 Avance partielle</Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {order.status !== 'DELIVERED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Truck}
                          onClick={() => setOrderForDelivery(order)}
                          title="Livrer la commande"
                          className="text-xs"
                        >
                          Livrer
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="primary"
                        icon={DollarSign}
                        onClick={() => setOrderForPayment(order)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        Encaisser
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredDebts.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-400 text-xs">
                  Aucune dette client trouvée pour ces critères de recherche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Responsive Debts Cards */}
      <div className="md:hidden space-y-3">
        {filteredDebts.map(order => {
          const due = order.dueAmount !== undefined ? order.dueAmount : Math.max(0, order.totalAmount - order.paidAmount);

          return (
            <Card key={order.id} className="p-4 space-y-3 border-l-4 border-l-rose-500">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-600 block">
                    {order.orderNumber} • {order.personName}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(order.createdAt, 'dd/MM/yyyy HH:mm')} • {order.personPhone}
                  </span>
                </div>
                {order.status === 'DELIVERED' ? (
                  <Badge variant="purple" size="sm">🚚 Livrée</Badge>
                ) : (
                  <Badge variant="warning" size="sm">{order.status}</Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Total</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Payé</span>
                  <span className="font-bold text-emerald-600 mt-0.5 block">
                    {formatCurrency(order.paidAmount)}
                  </span>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/40 p-1 rounded-lg">
                  <span className="text-[10px] text-rose-600 uppercase font-black block">Dette</span>
                  <span className="font-black text-rose-600 mt-0.5 block">
                    {formatCurrency(due)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                {order.status !== 'DELIVERED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Truck}
                    onClick={() => setOrderForDelivery(order)}
                    className="text-xs"
                  >
                    Livrer
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="primary"
                  icon={DollarSign}
                  onClick={() => setOrderForPayment(order)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                >
                  Encaisser Règlement
                </Button>
              </div>
            </Card>
          );
        })}
        {filteredDebts.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucune dette client trouvée.
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {orderForPayment && (
        <OrderPaymentModal
          order={orderForPayment}
          isOpen={!!orderForPayment}
          onClose={() => setOrderForPayment(null)}
        />
      )}

      {/* Delivery Modal */}
      {orderForDelivery && (
        <OrderDeliveryModal
          order={orderForDelivery}
          isOpen={!!orderForDelivery}
          onClose={() => setOrderForDelivery(null)}
        />
      )}

      {/* Reusable Open Cash Modal */}
      <OpenCashModal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        contextMessage="L'ouverture de la session de caisse permet d'enregistrer et de ventiler les encaissements de dettes et créances clients."
      />
    </div>
  );
};
