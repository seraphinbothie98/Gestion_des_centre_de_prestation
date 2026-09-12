import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Order, OrderStatus, Payment, OrderItem, ProductionStatus } from '../../types';
import { formatCurrency, formatDate, generateDocNumber } from '../../lib/utils';
import { computeDynamicOrderStatus, computeDynamicDeliveryStatus, calculateOrderTotals } from '../../lib/pricingEngine';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShoppingBag, Plus, Search, Filter, Eye, Printer,
  CheckCircle2, Clock, AlertCircle, FileText, ArrowRight, Truck,
  DollarSign, History, ShieldAlert, Layers, XCircle, RotateCcw,
  Sparkles, Tag, Package
} from 'lucide-react';
import { OrderPaymentModal } from './OrderPaymentModal';
import { OrderDeliveryModal } from './OrderDeliveryModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';

interface OrdersViewProps {
  onOpenQuickOrder: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onOpenQuickOrder }) => {
  const { currentTenant, currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const state = dbStore.getState();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'STANDARD' | 'MARKETPLACE' | 'QUOTES'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Modals
  const [orderForPayment, setOrderForPayment] = useState<Order | null>(null);
  const [orderForDelivery, setOrderForDelivery] = useState<Order | null>(null);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  // Single Item Cancellation Modal
  const [itemToCancel, setItemToCancel] = useState<{ order: Order; item: OrderItem } | null>(null);
  const [cancelReason, setCancelReason] = useState('Demande du client avant fabrication');

  // Marketplace Order Validation Modal State
  const [marketplaceOrderToValidate, setMarketplaceOrderToValidate] = useState<Order | null>(null);
  const [validationQuantities, setValidationQuantities] = useState<Record<string, number>>({});
  const [validationNotes, setValidationNotes] = useState('');

  const currentAgencyId = currentTenant?.id || 't-001';

  const allTenantOrders = useMemo(() => {
    return state.orders.filter(o => {
      if (currentAgencyId !== 'ALL' && currentAgencyId !== 'global' && o.tenantId !== currentAgencyId) {
        return false;
      }
      return true;
    });
  }, [state.orders, currentAgencyId]);

  const tenantQuotes = useMemo(() => {
    return state.invoices.filter(i => {
      if (currentAgencyId !== 'ALL' && currentAgencyId !== 'global' && i.tenantId !== currentAgencyId) {
        return false;
      }
      return i.invoiceType === 'QUOTE';
    });
  }, [state.invoices, currentAgencyId]);

  const unreadMarketplaceCount = useMemo(() => {
    return allTenantOrders.filter(o => o.orderSource === 'MARKETPLACE' && (o.isReadByMerchant === false || o.status === 'PENDING')).length;
  }, [allTenantOrders]);

  const standardOrdersCount = useMemo(() => {
    return allTenantOrders.filter(o => o.orderSource !== 'MARKETPLACE').length;
  }, [allTenantOrders]);

  const marketplaceOrdersCount = useMemo(() => {
    return allTenantOrders.filter(o => o.orderSource === 'MARKETPLACE').length;
  }, [allTenantOrders]);

  const filteredOrders = useMemo(() => {
    return allTenantOrders.filter(o => {
      if (sourceFilter === 'STANDARD' && o.orderSource === 'MARKETPLACE') return false;
      if (sourceFilter === 'MARKETPLACE' && o.orderSource !== 'MARKETPLACE') return false;

      const matchSearch =
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.personName.toLowerCase().includes(search.toLowerCase()) ||
        (o.personPhone && o.personPhone.includes(search)) ||
        (o.clientCity && o.clientCity.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;

      let matchPayment = true;
      if (paymentFilter === 'UNPAID') matchPayment = o.paidAmount === 0;
      if (paymentFilter === 'PARTIALLY_PAID') matchPayment = o.paidAmount > 0 && o.dueAmount > 0;
      if (paymentFilter === 'PAID') matchPayment = o.dueAmount === 0;

      return matchSearch && matchStatus && matchPayment;
    });
  }, [allTenantOrders, sourceFilter, search, statusFilter, paymentFilter]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    if (order.orderSource === 'MARKETPLACE' && order.isReadByMerchant === false) {
      dbStore.markMarketplaceOrderAsRead(order.id);
    }
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus, reason?: string) => {
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Commerçant';
    const result = dbStore.updateOrderStatus(orderId, newStatus, performedBy, reason);
    if (result.success && result.order) {
      showToast(
        'Statut mis à jour',
        `La commande ${result.order.orderNumber} est passée à : ${newStatus}`,
        newStatus === 'CANCELLED' ? 'WARNING' : 'SUCCESS'
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(result.order);
      }
    } else {
      showToast('Erreur', result.error || 'Impossible de mettre à jour le statut.', 'DANGER');
    }
  };

  const handleOpenMarketplaceValidation = (order: Order) => {
    const initialVals: Record<string, number> = {};
    const prods = state.products || [];
    order.items.forEach(it => {
      const prod = prods.find(p => p.id === it.productId);
      const stock = prod ? (prod.currentStock || 0) : 999;
      const requested = it.requestedQuantity !== undefined ? it.requestedQuantity : it.quantity;
      initialVals[it.id] = Math.min(stock, requested);
    });
    setValidationQuantities(initialVals);
    setValidationNotes('');
    setMarketplaceOrderToValidate(order);
  };

  const handleConfirmMarketplaceValidation = () => {
    if (!marketplaceOrderToValidate) return;
    const validations = Object.entries(validationQuantities).map(([itemId, validatedQuantity]) => ({
      itemId,
      validatedQuantity: Number(validatedQuantity) || 0
    }));

    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Commerçant';
    const result = dbStore.validateMarketplaceOrder({
      orderId: marketplaceOrderToValidate.id,
      itemValidations: validations,
      performedByName: performedBy,
      notes: validationNotes
    });

    if (result.success && result.order) {
      showToast(
        'Commande Marketplace Validée',
        `La commande ${result.order.orderNumber} a été validée avec succès. ${result.movementsCount || 0} mouvement(s) de stock enregistré(s).`,
        'SUCCESS'
      );
      setSelectedOrder(result.order);
      setMarketplaceOrderToValidate(null);
    } else {
      showToast('Erreur validation', result.error || 'Impossible de valider la commande.', 'DANGER');
    }
  };

  // Update Status of Single Item within Order
  const handleUpdateItemStatus = (orderId: string, itemId: string, newStatus: ProductionStatus) => {
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Opérateur';

    dbStore.updateState(draft => {
      const order = draft.orders.find(o => o.id === orderId);
      if (order) {
        const item = order.items.find(it => it.id === itemId);
        if (item) {
          item.productionStatus = newStatus;
          if (newStatus === 'IN_PRODUCTION' && !item.startedAt) item.startedAt = new Date().toISOString();
          if ((newStatus === 'DONE' || newStatus === 'READY') && !item.completedAt) item.completedAt = new Date().toISOString();
          if (newStatus === 'DELIVERED') {
            item.deliveredAt = new Date().toISOString();
            item.deliveredByUserName = performedBy;
          }
        }

        // Recompute dynamic global order status
        order.status = computeDynamicOrderStatus(order.items);
        order.deliveryStatus = computeDynamicDeliveryStatus(order.items);
        order.updatedAt = new Date().toISOString();
      }

      // Update linked ProductionJob
      if (draft.productionJobs) {
        const job = draft.productionJobs.find(j => j.orderId === orderId && (j.orderItemId === itemId || j.itemDescription === itemId));
        if (job) {
          job.status = newStatus;
          if (newStatus === 'IN_PRODUCTION') job.startedAt = new Date().toISOString();
          if (newStatus === 'DONE' || newStatus === 'READY') job.completedAt = new Date().toISOString();
        }
      }
    });

    dbStore.logAudit('ORDER_ITEM_STATUS_CHANGED', 'ORDER', orderId, null, { itemId, newStatus });
    showToast('Statut de ligne mis à jour', `La prestation est passée à : ${newStatus}`, 'SUCCESS');

    // Update selected order view
    const updated = dbStore.getState().orders.find(o => o.id === orderId);
    if (updated) setSelectedOrder(updated);
  };

  // Confirm Single Item Cancellation & Refund if needed
  const handleConfirmCancelItem = () => {
    if (!itemToCancel) return;
    const { order, item } = itemToCancel;
    const performedBy = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Gestionnaire';

    dbStore.updateState(draft => {
      const ord = draft.orders.find(o => o.id === order.id);
      if (ord) {
        const it = ord.items.find(i => i.id === item.id);
        if (it) {
          it.productionStatus = 'CANCELLED';
          it.notes = `${it.notes ? `${it.notes} - ` : ''}Annulé: ${cancelReason}`;
        }

        // Recalculate financial totals excluding cancelled item
        const totals = calculateOrderTotals(ord.items);
        ord.subtotal = totals.grossSubtotal;
        ord.discountAmount = totals.discountAmount;
        ord.totalAmount = totals.totalAmount;
        ord.dueAmount = Math.max(0, totals.totalAmount - ord.paidAmount);

        // Check if refund is necessary
        if (ord.paidAmount > totals.totalAmount) {
          const excessPaid = ord.paidAmount - totals.totalAmount;
          ord.paidAmount = totals.totalAmount;
          ord.refundAmount = (ord.refundAmount || 0) + excessPaid;
          ord.refundReason = `Remboursement suite à annulation de "${it?.serviceName || it?.productName}" (${cancelReason})`;
          ord.refundedAt = new Date().toISOString();
          ord.refundedByUserName = performedBy;

          // Record in cash session if open
          const openSess = draft.cashSessions.find(cs => cs.status === 'OPEN');
          if (openSess) {
            if (!openSess.movements) openSess.movements = [];
            openSess.movements.unshift({
              id: `cm-ref-${Date.now()}`,
              cashSessionId: openSess.id,
              movementType: 'REFUND',
              amount: excessPaid,
              category: 'Remboursement Prestation Annulée',
              reason: `Remboursement ligne "${it?.serviceName || it?.productName}" commande ${ord.orderNumber} - ${cancelReason}`,
              isCommercialRevenue: false,
              performedByUserName: performedBy,
              createdAt: new Date().toISOString()
            });
          }
        }

        ord.status = computeDynamicOrderStatus(ord.items);
        ord.deliveryStatus = computeDynamicDeliveryStatus(ord.items);
        ord.updatedAt = new Date().toISOString();
      }
    });

    // Restore stock and consumables for the cancelled item
    dbStore.restoreConsumablesForOrder(order.id, currentAgencyId, performedBy, `Annulation de la ligne ${item.serviceName || item.productName} (${cancelReason})`);

    dbStore.logAudit('ORDER_ITEM_CANCELLED', 'ORDER', order.id, null, {
      itemId: item.id,
      itemTitle: item.serviceName || item.productName,
      cancelReason
    });

    showToast('Ligne Annulée', `La prestation "${item.serviceName || item.productName}" a été annulée et le dossier recalculé.`, 'WARNING');
    setItemToCancel(null);

    const updated = dbStore.getState().orders.find(o => o.id === order.id);
    if (updated) setSelectedOrder(updated);
  };

  const handleGenerateInvoice = (order: Order) => {
    const docNumber = generateDocNumber('FAC', state.invoices.length + 1);
    const signatures = currentTenant?.settings?.digitalSignatures || [];
    const dirSig = signatures.find(s => s.type === 'DIRECTOR' && s.isActive);
    const stamp = signatures.find(s => s.type === 'STAMP' && s.isActive);

    dbStore.updateState(draft => {
      draft.invoices.unshift({
        id: `inv-${Date.now()}`,
        tenantId: currentTenant?.id || 't-001',
        personId: order.personId,
        personName: order.personName,
        personPhone: order.personPhone,
        orderId: order.id,
        invoiceType: 'INVOICE',
        documentNumber: docNumber,
        issueDate: new Date().toISOString().split('T')[0],
        subtotal: order.subtotal,
        taxRate: 0,
        taxAmount: 0,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        status: order.dueAmount === 0 ? 'PAID' : 'PARTIAL',
        notes: `Facture générée automatiquement depuis le dossier ${order.orderNumber}. Solde restant dû : ${formatCurrency(order.dueAmount)}.`,
        directorSignatureUrl: dirSig?.imageUrl,
        directorSignerName: dirSig?.signerName || currentTenant?.settings?.certificateSignerName || 'Le Directeur',
        directorSignerTitle: dirSig?.signerTitle || 'Directeur Général du Centre',
        officialStampUrl: stamp?.imageUrl,
        stampName: stamp?.signerName || 'Cachet Officiel',
        signatureVersion: dirSig?.version || 1,
        items: order.items.map(item => ({
          description: `${item.serviceName || item.productName} (${item.quantity} ${item.unit})`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        }))
      });
    });

    showToast('Facture créée', `Facture ${docNumber} générée avec signatures et cachet officiels.`, 'SUCCESS');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">Brouillon</Badge>;
      case 'PENDING': return <Badge variant="warning">En attente</Badge>;
      case 'CONFIRMED': return <Badge variant="primary">Confirmée</Badge>;
      case 'IN_PRODUCTION': return <Badge variant="warning">En production</Badge>;
      case 'PARTIALLY_DONE': return <Badge variant="warning">Partiellement Terminée</Badge>;
      case 'COMPLETED': return <Badge variant="success">Terminée</Badge>;
      case 'READY': return <Badge variant="success">Prête pour retrait</Badge>;
      case 'PARTIALLY_DELIVERED': return <Badge variant="warning">Partiellement Livrée</Badge>;
      case 'DELIVERED': return <Badge variant="success">Livrée</Badge>;
      case 'CANCELLED': return <Badge variant="danger">Annulée</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPaymentBadge = (order: Order) => {
    const due = order.dueAmount !== undefined ? order.dueAmount : Math.max(0, order.totalAmount - order.paidAmount);
    if (due === 0) {
      return <Badge variant="success" size="sm">🟢 Payé</Badge>;
    }
    if (order.paidAmount === 0) {
      return <Badge variant="danger" size="sm">🔴 Non Payé</Badge>;
    }
    return <Badge variant="warning" size="sm">🟠 Partiellement Payé</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-500" />
            Commandes & Devis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Module unifié de gestion des commandes atelier, ventes boutique et commandes de la marketplace.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={onOpenQuickOrder} className="font-bold">
          Nouvelle Commande
        </Button>
      </div>

      {/* Origin / Source Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setSourceFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            sourceFilter === 'ALL'
              ? 'bg-brand-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span>Toutes</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {allTenantOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('STANDARD')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            sourceFilter === 'STANDARD'
              ? 'bg-brand-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span>🛠️ Atelier & Standard</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
            {standardOrdersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('MARKETPLACE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            sourceFilter === 'MARKETPLACE'
              ? 'bg-yellow-500 text-slate-950 font-black shadow-md shadow-yellow-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span>🛒 Commandes Marketplace</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-yellow-400/30 text-yellow-900 dark:text-yellow-200 font-bold">
            {marketplaceOrdersCount}
          </span>
          {unreadMarketplaceCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
              🔴 {unreadMarketplaceCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('QUOTES')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            sourceFilter === 'QUOTES'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <span>📑 Devis</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
            {tenantQuotes.length}
          </span>
        </button>
      </div>

      {/* Filter Bar (for orders) */}
      {sourceFilter !== 'QUOTES' && (
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par N° commande, client, ville, tél..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs"
              options={[
                { value: 'ALL', label: 'Tous les statuts' },
                { value: 'PENDING', label: 'En attente / Nouvelle' },
                { value: 'CONFIRMED', label: 'Confirmée' },
                { value: 'IN_PRODUCTION', label: 'En préparation / production' },
                { value: 'READY', label: 'Prête pour retrait / expédition' },
                { value: 'PARTIALLY_DELIVERED', label: 'Partiellement Livrée' },
                { value: 'DELIVERED', label: 'Entièrement Livrée' },
                { value: 'CANCELLED', label: 'Annulée / Refusée' },
              ]}
            />

            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full text-xs"
              options={[
                { value: 'ALL', label: 'Tous les règlements' },
                { value: 'PAID', label: '🟢 Intégralement Payées (0 GNF dû)' },
                { value: 'PARTIALLY_PAID', label: '🟠 Partiellement Payées (Avances)' },
                { value: 'UNPAID', label: '🔴 100% Non Payées (Dettes)' },
              ]}
            />
          </div>
        </Card>
      )}

      {/* QUOTES VIEW */}
      {sourceFilter === 'QUOTES' ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro & Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Désignation & Lignes</TableHead>
                <TableHead>Montant Total</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantQuotes.length > 0 ? (
                tenantQuotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 block">
                        {q.documentNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(q.issueDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <strong className="text-xs text-slate-900 dark:text-white block">
                        {q.personName}
                      </strong>
                      {q.personPhone && (
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {q.personPhone}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-700 dark:text-slate-300 block">
                        {q.items.length} ligne{q.items.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                        {q.items.map(i => i.description).join(', ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {formatCurrency(q.totalAmount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" size="sm">
                        {q.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                    Aucun devis enregistré.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* ORDERS TABLE (Desktop) */
        <Card className="hidden md:block overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro & Source</TableHead>
                <TableHead>Client & Ville</TableHead>
                <TableHead>Articles & Unités</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant Total</TableHead>
                <TableHead>Règlement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(o => {
                  const due = o.dueAmount !== undefined ? o.dueAmount : Math.max(0, o.totalAmount - o.paidAmount);
                  const isMarketplace = o.orderSource === 'MARKETPLACE';
                  const isUnread = isMarketplace && (o.isReadByMerchant === false || o.status === 'PENDING');

                  return (
                    <TableRow key={o.id} className={isUnread ? 'bg-yellow-500/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-mono font-bold text-xs block ${isMarketplace ? 'text-yellow-600 dark:text-yellow-400' : 'text-brand-600 dark:text-brand-400'}`}>
                            {o.orderNumber}
                          </span>
                          {isMarketplace && (
                            <Badge variant="warning" size="sm" className="text-[9px] py-0 font-bold bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 border-yellow-500/30">
                              🛒 Marketplace
                            </Badge>
                          )}
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Nouvelle commande non lue" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {formatDate(o.createdAt, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-xs text-slate-900 dark:text-white block">
                            {o.personName}
                          </strong>
                          {o.customerType === 'WALK_IN' && !isMarketplace && (
                            <Badge variant="outline" size="sm" className="text-[9px] py-0 text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 font-bold">
                              ⚡ Passage
                            </Badge>
                          )}
                        </div>
                        {o.personPhone && (
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {o.personPhone}
                          </span>
                        )}
                        {o.clientCity && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                            📍 {o.clientCity} {o.deliveryAddress ? `(${o.deliveryAddress})` : ''}
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-xs space-y-1">
                          <strong className="text-slate-800 dark:text-slate-200">
                            {o.items.length} article{o.items.length > 1 ? 's' : ''}
                          </strong>
                          <div className="space-y-0.5 max-w-xs">
                            {o.items.map((it, idx) => (
                              <div key={it.id || idx} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                {it.productImageUrl && (
                                  <img src={it.productImageUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                                )}
                                <span>{it.quantity} {it.publicUnit || it.unit} • {it.productName || it.serviceName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{getStatusBadge(o.status)}</TableCell>

                      <TableCell>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          {formatCurrency(o.totalAmount)}
                        </span>
                      </TableCell>

                      <TableCell>
                        {due === 0 ? (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Soldé
                          </span>
                        ) : (
                          <div>
                            <span className="text-xs font-bold text-rose-600 block">
                              Reste: {formatCurrency(due)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Payé: {formatCurrency(o.paidAmount)}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Quick Workflow Transitions for Marketplace Orders */}
                          {/* Quick Workflow Transitions */}
                          {isMarketplace && o.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleUpdateOrderStatus(o.id, 'CONFIRMED')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-7 py-0"
                            >
                              Confirmer
                            </Button>
                          )}
                          {isMarketplace && o.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateOrderStatus(o.id, 'IN_PRODUCTION')}
                              className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 text-xs font-bold h-7 py-0"
                            >
                              Préparer
                            </Button>
                          )}
                          {isMarketplace && o.status === 'IN_PRODUCTION' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateOrderStatus(o.id, 'READY')}
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs font-bold h-7 py-0"
                            >
                              Prête
                            </Button>
                          )}
                          {o.status === 'READY' && (
                            due === 0 ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleUpdateOrderStatus(o.id, 'DELIVERED')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-7 py-0"
                              >
                                Livrée
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setOrderForPayment(o)}
                                title={`Paiement requis avant livraison (Solde restant : ${formatCurrency(due)})`}
                                className="text-amber-600 border-amber-300 hover:bg-amber-50 text-xs font-bold h-7 py-0 flex items-center gap-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Encaisser ({formatCurrency(due)})
                              </Button>
                            )
                          )}

                          {due > 0 && o.status !== 'READY' && (
                            <Button
                              size="sm"
                              variant="outline"
                              icon={DollarSign}
                              onClick={() => setOrderForPayment(o)}
                              title="Encaisser un versement"
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs font-bold h-7 py-0"
                            >
                              Encaisser
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Eye}
                            onClick={() => handleSelectOrder(o)}
                            className="text-xs font-bold h-7 py-0"
                          >
                            Détails
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    Aucune commande trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Dossier Commercial : ${selectedOrder.orderNumber}`}
          maxWidth="3xl"
        >
          <div className="space-y-6 pt-1">
            {/* Header Status & Progression */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Client : {selectedOrder.personName}
                  </span>
                  {selectedOrder.orderSource === 'MARKETPLACE' && (
                    <Badge variant="warning" size="sm" className="text-[10px] font-bold bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 border-yellow-500/30">
                      🛒 Commande Marketplace
                    </Badge>
                  )}
                  {selectedOrder.customerType === 'WALK_IN' && selectedOrder.orderSource !== 'MARKETPLACE' && (
                    <Badge variant="outline" size="sm" className="text-[10px] text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 font-bold">
                      ⚡ Client de passage
                    </Badge>
                  )}
                  {getStatusBadge(selectedOrder.status)}
                  {getPaymentBadge(selectedOrder)}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Créée le {formatDate(selectedOrder.createdAt, 'dd/MM/yyyy HH:mm')} • Priorité : <strong>{selectedOrder.priority}</strong>
                  {selectedOrder.personPhone && <span> • Tél: <strong className="font-mono">{selectedOrder.personPhone}</strong></span>}
                </p>

                {selectedOrder.clientCity && (
                  <div className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2">
                    <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Livraison : {selectedOrder.clientCity}</strong>
                      {selectedOrder.deliveryAddress && <span>Adresse : {selectedOrder.deliveryAddress}</span>}
                      {selectedOrder.deliveryNotes && (
                        <span className="block italic text-[11px] mt-0.5 text-amber-700 dark:text-amber-300">
                          « Note client : {selectedOrder.deliveryNotes} »
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {selectedOrder.instructions && !selectedOrder.clientCity && (
                  <p className="text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 p-2 rounded-lg">
                    Instructions : {selectedOrder.instructions}
                  </p>
                )}
              </div>

              {/* QR Code Tracking Component */}
              <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 shrink-0 text-center">
                <QRCodeSVG
                  value={`https://cms.cpep-guinee.com/track/order/${selectedOrder.orderNumber}`}
                  size={64}
                />
                <span className="text-[9px] text-slate-400 block mt-1 font-mono">Suivi QR</span>
              </div>
            </div>

            {/* Granular Items Table */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-500" />
                Articles & Prestations du Dossier ({selectedOrder.items.length})
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-2.5">Article / Prestation</th>
                      <th className="p-2.5 text-center">Quantité</th>
                      <th className="p-2.5 text-right">Tarif Unitaire</th>
                      <th className="p-2.5 text-right">Remise</th>
                      <th className="p-2.5 text-right">Total Net</th>
                      <th className="p-2.5 text-center">Statut Ligne</th>
                      <th className="p-2.5 text-right">Actions Ligne</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedOrder.items.map((item, idx) => {
                      const isCancelled = item.productionStatus === 'CANCELLED';

                      return (
                        <tr key={item.id || idx} className={isCancelled ? 'opacity-50 bg-slate-50 dark:bg-slate-950' : ''}>
                          <td className="p-2.5 font-medium">
                            <div className="flex items-center gap-2">
                              {item.productImageUrl ? (
                                <img src={item.productImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                              ) : (
                                <Badge
                                  variant={item.itemType === 'PRODUCT' ? 'warning' : 'primary'}
                                  size="sm"
                                  className="text-[9px] font-bold"
                                >
                                  {item.itemType === 'PRODUCT' ? '🛒 Boutique' : '🛠️ Prestation'}
                                </Badge>
                              )}
                              <div>
                                <strong className="text-slate-900 dark:text-white block">
                                  {item.productName || item.serviceName || item.description}
                                </strong>
                                {item.itemType === 'PRODUCT' && item.publicUnit && (
                                  <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold block">
                                    Vendu par {item.publicUnit}
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.discountReason && (
                              <span className="block text-[10px] text-amber-700 dark:text-amber-300 italic mt-0.5">
                                « Motif: {item.discountReason} »
                              </span>
                            )}
                            {item.notes && <span className="block text-[10px] text-slate-400">{item.notes}</span>}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {item.requestedQuantity !== undefined && item.validatedQuantity !== undefined && item.requestedQuantity !== item.validatedQuantity ? (
                              <div className="space-y-0.5">
                                <span className="text-slate-400 text-[10px] line-through block">
                                  Demandé : {item.requestedQuantity} {item.publicUnit || item.unit}
                                </span>
                                <span className="text-amber-600 dark:text-amber-400 font-extrabold block">
                                  Validé : {item.validatedQuantity} {item.publicUnit || item.unit}
                                </span>
                              </div>
                            ) : (
                              <span>{item.quantity} {item.publicUnit || item.unit}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {formatCurrency(item.unitPrice)}
                            </span>
                            {item.standardUnitPrice && item.standardUnitPrice > item.unitPrice && (
                              <span className="text-[10px] text-slate-400 line-through block">
                                Base: {formatCurrency(item.standardUnitPrice)}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            {item.discountAmount && item.discountAmount > 0 ? (
                              <Badge variant="success" size="sm">
                                -{formatCurrency(item.discountAmount)}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-extrabold text-brand-600">
                            {formatCurrency(item.totalPrice)}
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge
                              variant={
                                isCancelled
                                  ? 'danger'
                                  : item.productionStatus === 'DELIVERED'
                                  ? 'success'
                                  : item.productionStatus === 'READY' || item.productionStatus === 'DONE'
                                  ? 'success'
                                  : item.productionStatus === 'IN_PRODUCTION'
                                  ? 'warning'
                                  : 'warning'
                              }
                              size="sm"
                              className="font-bold text-[9px]"
                            >
                              {item.productionStatus === 'CANCELLED'
                                ? 'Annulée'
                                : item.productionStatus === 'DELIVERED'
                                ? 'Livrée'
                                : item.productionStatus === 'READY' || item.productionStatus === 'DONE'
                                ? 'Prête'
                                : item.productionStatus === 'IN_PRODUCTION'
                                ? 'En Prod'
                                : 'En Attente'}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-right">
                            {!isCancelled && item.productionStatus !== 'DELIVERED' && (
                              <div className="flex items-center justify-end gap-1">
                                {item.productionStatus === 'PENDING' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateItemStatus(selectedOrder.id, item.id, 'IN_PRODUCTION')}
                                    className="h-7 text-[10px] text-brand-600 hover:bg-brand-50"
                                  >
                                    Lancer
                                  </Button>
                                )}
                                {item.productionStatus === 'IN_PRODUCTION' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUpdateItemStatus(selectedOrder.id, item.id, 'READY')}
                                    className="h-7 text-[10px] text-emerald-600 hover:bg-emerald-50 font-bold"
                                  >
                                    Prête
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={XCircle}
                                  onClick={() => setItemToCancel({ order: selectedOrder, item })}
                                  className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                                  title="Annuler cet article"
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center text-xs">
              <div className="space-y-1">
                <div>Sous-total brut : <strong>{formatCurrency(selectedOrder.subtotal)}</strong></div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="text-emerald-400">Total Remises : -{formatCurrency(selectedOrder.discountAmount)}</div>
                )}
                {selectedOrder.refundAmount && selectedOrder.refundAmount > 0 && (
                  <div className="text-rose-400">Remboursé : {formatCurrency(selectedOrder.refundAmount)}</div>
                )}
                <div>Déjà Encaissé : <strong>{formatCurrency(selectedOrder.paidAmount)}</strong></div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 block">Total Net Commande :</span>
                <span className="text-lg font-extrabold text-brand-400">
                  {formatCurrency(selectedOrder.totalAmount)}
                </span>
                <span className={`block text-xs font-bold mt-1 ${selectedOrder.dueAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  Reste à payer : {formatCurrency(selectedOrder.dueAmount)}
                </span>
              </div>
            </div>

            {/* Payments History */}
            {(() => {
              const payments = state.payments.filter(p => p.orderId === selectedOrder.id);
              if (payments.length === 0) return null;

              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-500" />
                    Historique des Règlements Encaissés ({payments.length})
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {payments.map(p => (
                      <div key={p.id} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400">{p.paymentNumber}</span>
                            <Badge variant="outline" size="sm">{p.paymentMethod}</Badge>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(p.createdAt, 'dd/MM/yyyy HH:mm')} • Par {p.receivedByUserName || 'Caissier'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-600 block">+{formatCurrency(p.amount)}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptPayment(p)}
                            className="text-[10px] text-brand-600 hover:underline font-semibold"
                          >
                            Imprimer Reçu
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Workflow Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  icon={FileText}
                  onClick={() => handleGenerateInvoice(selectedOrder)}
                >
                  Générer Facture
                </Button>

                {/* Marketplace Merchant Quick Actions */}
                {selectedOrder.orderSource === 'MARKETPLACE' && (
                  <>
                    {selectedOrder.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={CheckCircle2}
                          onClick={() => handleOpenMarketplaceValidation(selectedOrder)}
                          className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                        >
                          Vérifier Stock & Valider Commande
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={XCircle}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CANCELLED', 'Refusée par le commerçant')}
                          className="text-rose-600 hover:bg-rose-50 font-bold"
                        >
                          Refuser
                        </Button>
                      </>
                    )}
                    {selectedOrder.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Clock}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'IN_PRODUCTION')}
                        className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                      >
                        Mettre en Préparation
                      </Button>
                    )}
                    {selectedOrder.status === 'IN_PRODUCTION' && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={CheckCircle2}
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'READY')}
                        className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                      >
                        Marquer Prête / Expédiée
                      </Button>
                    )}
                    {selectedOrder.status === 'READY' && (
                      selectedOrder.dueAmount === 0 ? (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={Truck}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'DELIVERED')}
                          className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                        >
                          Marquer Livrée
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/50 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-500" /> Paiement requis avant livraison
                          </span>
                        </div>
                      )
                    )}
                  </>
                )}

                {selectedOrder.dueAmount > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={DollarSign}
                    onClick={() => setOrderForPayment(selectedOrder)}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    Encaisser Règlement ({formatCurrency(selectedOrder.dueAmount)})
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.orderSource !== 'MARKETPLACE' && selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Truck}
                    onClick={() => setOrderForDelivery(selectedOrder)}
                    className="bg-brand-600 hover:bg-brand-700 font-bold"
                  >
                    Livraison Partielle / Complète
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Single Item Cancel Modal */}
      {itemToCancel && (
        <Modal
          isOpen={!!itemToCancel}
          onClose={() => setItemToCancel(null)}
          title={`Annuler la prestation — ${itemToCancel.item.serviceName || itemToCancel.item.productName}`}
          maxWidth="sm"
        >
          <div className="space-y-4 pt-1">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Voulez-vous vraiment annuler cette prestation spécifique ({itemToCancel.item.quantity} {itemToCancel.item.unit}) ? Le montant total du dossier sera recalculé.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Motif d'annulation *
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
                className="w-full text-xs p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setItemToCancel(null)}>
                Fermer
              </Button>
              <Button variant="danger" onClick={handleConfirmCancelItem} className="font-bold">
                Confirmer l'Annulation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      {orderForPayment && (
        <OrderPaymentModal
          order={orderForPayment}
          isOpen={!!orderForPayment}
          onClose={() => setOrderForPayment(null)}
          onPaymentSuccess={() => {
            const updated = dbStore.getState().orders.find(o => o.id === orderForPayment.id);
            if (updated && selectedOrder?.id === updated.id) setSelectedOrder(updated);
          }}
        />
      )}

      {/* Delivery Modal */}
      {orderForDelivery && (
        <OrderDeliveryModal
          order={orderForDelivery}
          isOpen={!!orderForDelivery}
          onClose={() => setOrderForDelivery(null)}
          onDeliverySuccess={() => {
            const updated = dbStore.getState().orders.find(o => o.id === orderForDelivery.id);
            if (updated && selectedOrder?.id === updated.id) setSelectedOrder(updated);
          }}
        />
      )}

      {/* Receipt Modal */}
      {selectedReceiptPayment && (
        <PaymentReceiptModal
          payment={selectedReceiptPayment}
          order={selectedOrder}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}

      {/* Marketplace Order Validation & Stock Deduction Modal */}
      {marketplaceOrderToValidate && (
        <Modal
          isOpen={!!marketplaceOrderToValidate}
          onClose={() => setMarketplaceOrderToValidate(null)}
          title={`Validation Commande Marketplace — ${marketplaceOrderToValidate.orderNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-5 pt-2">
            {/* Header info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Client</span>
                <strong className="text-slate-900 dark:text-white text-sm">
                  {marketplaceOrderToValidate.personName}
                </strong>
                {marketplaceOrderToValidate.personPhone && (
                  <span className="text-slate-500 block">📞 {marketplaceOrderToValidate.personPhone}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Destination</span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  📍 {marketplaceOrderToValidate.clientCity || 'Conakry'}
                </strong>
                {marketplaceOrderToValidate.deliveryAddress && (
                  <span className="text-slate-500 block text-[11px]">{marketplaceOrderToValidate.deliveryAddress}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-semibold block">Date de commande</span>
                <strong className="text-slate-700 dark:text-slate-300">
                  {formatDate(marketplaceOrderToValidate.createdAt, 'dd/MM/yyyy HH:mm')}
                </strong>
              </div>
            </div>

            {/* Note from client if any */}
            {marketplaceOrderToValidate.deliveryNotes && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                <strong>Note du client :</strong> « {marketplaceOrderToValidate.deliveryNotes} »
              </div>
            )}

            {/* Items Validation Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Contrôle du Stock Réel & Validation des Quantités
                </h4>
                <span className="text-[11px] text-slate-500">
                  La déduction de stock est appliquée immédiatement après confirmation.
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {marketplaceOrderToValidate.items.map((item) => {
                  const prod = (state.products || []).find(p => p.id === item.productId);
                  const realStock = prod?.currentStock || 0;
                  const requestedQty = item.requestedQuantity !== undefined ? item.requestedQuantity : item.quantity;
                  const currentValidated = validationQuantities[item.id] !== undefined ? validationQuantities[item.id] : requestedQty;
                  const isExceedingStock = currentValidated > realStock && !prod?.allowNegativeStock;
                  const isPartial = currentValidated < requestedQty;

                  return (
                    <div key={item.id} className="p-4 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.productImageUrl ? (
                            <img src={item.productImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                            {item.productName}
                          </strong>
                          <span className="text-[11px] text-slate-500 block">
                            Prix unitaire : {formatCurrency(item.unitPrice)} / {item.publicUnit || item.unit}
                          </span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                              Demandé : <strong>{requestedQty}</strong> {item.publicUnit || item.unit}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                              realStock >= requestedQty
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : realStock > 0
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            }`}>
                              Stock réel magasin : <strong>{realStock}</strong> {prod?.baseUnit || item.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Input & Actions */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                            Quantité validée
                          </label>
                          <div className="flex items-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => {
                                setValidationQuantities(prev => ({
                                  ...prev,
                                  [item.id]: Math.max(0, (prev[item.id] !== undefined ? prev[item.id] : requestedQty) - 1)
                                }));
                              }}
                              className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={currentValidated}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setValidationQuantities(prev => ({
                                  ...prev,
                                  [item.id]: isNaN(val) || val < 0 ? 0 : val
                                }));
                              }}
                              className={`w-14 py-1 text-xs font-black text-center focus:outline-none bg-transparent ${
                                isExceedingStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setValidationQuantities(prev => ({
                                  ...prev,
                                  [item.id]: (prev[item.id] !== undefined ? prev[item.id] : requestedQty) + 1
                                }));
                              }}
                              className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="text-right min-w-24">
                          <span className="text-[10px] text-slate-400 block font-semibold">Sous-total net</span>
                          <span className="text-xs font-black text-brand-600 dark:text-brand-400 block">
                            {formatCurrency(item.unitPrice * currentValidated)}
                          </span>
                          {isPartial && currentValidated > 0 && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block">
                              Validation partielle
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary & Note Input */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Nouveau Total Commande Validé :</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(
                    marketplaceOrderToValidate.items.reduce((sum, it) => {
                      const q = validationQuantities[it.id] !== undefined ? validationQuantities[it.id] : (it.requestedQuantity || it.quantity);
                      return sum + it.unitPrice * q;
                    }, 0)
                  )}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Note ou instruction de validation (visible par le client) :
                </label>
                <input
                  type="text"
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="Ex: Commande validée selon le stock disponible en magasin."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setMarketplaceOrderToValidate(null);
                  handleUpdateOrderStatus(marketplaceOrderToValidate.id, 'CANCELLED', 'Refusée par le vendeur pour rupture');
                }}
                className="text-rose-600 hover:bg-rose-50 font-bold text-xs"
              >
                Refuser la commande
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setMarketplaceOrderToValidate(null)}>
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  icon={CheckCircle2}
                  onClick={handleConfirmMarketplaceValidation}
                  className="bg-emerald-600 hover:bg-emerald-700 font-black shadow-md text-xs"
                >
                  Confirmer la Validation & Déduire le Stock
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
