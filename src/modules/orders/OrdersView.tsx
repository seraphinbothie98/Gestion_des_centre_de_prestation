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
  Sparkles, Tag
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

  const currentAgencyId = currentTenant?.id || 't-001';

  const filteredOrders = useMemo(() => {
    return state.orders.filter(o => {
      if (currentAgencyId !== 'ALL' && currentAgencyId !== 'global' && o.tenantId !== currentAgencyId) {
        return false;
      }

      const matchSearch =
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.personName.toLowerCase().includes(search.toLowerCase()) ||
        (o.personPhone && o.personPhone.includes(search));

      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;

      let matchPayment = true;
      if (paymentFilter === 'UNPAID') matchPayment = o.paidAmount === 0;
      if (paymentFilter === 'PARTIALLY_PAID') matchPayment = o.paidAmount > 0 && o.dueAmount > 0;
      if (paymentFilter === 'PAID') matchPayment = o.dueAmount === 0;

      return matchSearch && matchStatus && matchPayment;
    });
  }, [state.orders, currentAgencyId, search, statusFilter, paymentFilter]);

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
      case 'IN_PRODUCTION': return <Badge variant="info">En production</Badge>;
      case 'PARTIALLY_DONE': return <Badge variant="purple">Partiellement Terminée</Badge>;
      case 'COMPLETED': return <Badge variant="purple">Terminée</Badge>;
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
            Dossiers Commerciaux & Commandes Multi-Prestations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dossier unique combinant prestations et fournitures boutique, production granulaire et livraisons partielles.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={onOpenQuickOrder} className="font-bold">
          Nouvelle Commande
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par N° commande, nom du client, téléphone..."
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
              { value: 'ALL', label: 'Tous les statuts de dossier' },
              { value: 'PENDING', label: 'En attente' },
              { value: 'IN_PRODUCTION', label: 'En production' },
              { value: 'PARTIALLY_DONE', label: 'Partiellement Terminée' },
              { value: 'READY', label: 'Prête pour retrait' },
              { value: 'PARTIALLY_DELIVERED', label: 'Partiellement Livrée' },
              { value: 'DELIVERED', label: 'Entièrement Livrée' },
              { value: 'CANCELLED', label: 'Annulée' },
            ]}
          />

          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="w-full text-xs"
            options={[
              { value: 'ALL', label: 'Tous les états de règlement' },
              { value: 'PAID', label: '🟢 Intégralement Payées (0 GNF dû)' },
              { value: 'PARTIALLY_PAID', label: '🟠 Partiellement Payées (Avances)' },
              { value: 'UNPAID', label: '🔴 100% Non Payées (Dettes)' },
            ]}
          />
        </div>
      </Card>

      {/* Desktop Orders Table */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro & Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Lignes & Prestations</TableHead>
              <TableHead>Statut Production</TableHead>
              <TableHead>Montant Total</TableHead>
              <TableHead>Règlement & Solde</TableHead>
              <TableHead>Statut Paiement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map(o => {
                const due = o.dueAmount !== undefined ? o.dueAmount : Math.max(0, o.totalAmount - o.paidAmount);

                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <span className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400 block">
                        {o.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(o.createdAt, 'dd/MM/yyyy HH:mm')}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-xs text-slate-900 dark:text-white block">
                          {o.personName}
                        </strong>
                        {o.customerType === 'WALK_IN' && (
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
                    </TableCell>

                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <strong className="text-slate-800 dark:text-slate-200">
                          {o.items.length} ligne{o.items.length > 1 ? 's' : ''}
                        </strong>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {o.items.map(it => it.serviceName || it.productName).join(', ')}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{getStatusBadge(o.status)}</TableCell>

                    <TableCell>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {formatCurrency(o.totalAmount)}
                      </span>
                    </TableCell>

                    <TableCell>
                      {due === 0 ? (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Soldé ({formatCurrency(o.paidAmount)})
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

                    <TableCell>{getPaymentBadge(o)}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {due > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={DollarSign}
                            onClick={() => setOrderForPayment(o)}
                            title="Encaisser un versement"
                            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs font-bold"
                          >
                            Encaisser
                          </Button>
                        )}
                        {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Truck}
                            onClick={() => setOrderForDelivery(o)}
                            title="Livrer la commande"
                            className="text-xs font-bold"
                          >
                            Livrer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Eye}
                          onClick={() => setSelectedOrder(o)}
                          className="text-xs font-bold"
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
                <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                  Aucune commande trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

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
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Client : {selectedOrder.personName}
                  </span>
                  {selectedOrder.customerType === 'WALK_IN' && (
                    <Badge variant="outline" size="sm" className="text-[10px] text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 font-bold">
                      ⚡ Client de passage
                    </Badge>
                  )}
                  {getStatusBadge(selectedOrder.status)}
                  {getPaymentBadge(selectedOrder)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Créée le {formatDate(selectedOrder.createdAt, 'dd/MM/yyyy HH:mm')} • Priorité : <strong>{selectedOrder.priority}</strong>
                </p>
                {selectedOrder.instructions && (
                  <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 bg-brand-50 dark:bg-brand-950/60 p-2 rounded-lg">
                    Instructions : {selectedOrder.instructions}
                  </p>
                )}
                {selectedOrder.deliveryNotes && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 bg-purple-50 dark:bg-purple-950/60 p-2 rounded-lg">
                    Livraison : {selectedOrder.deliveryNotes}
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
                Prestations & Articles du Dossier ({selectedOrder.items.length})
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-2.5">Ligne / Prestation</th>
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
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={item.itemType === 'PRODUCT' ? 'warning' : 'primary'}
                                size="sm"
                                className="text-[9px] font-bold"
                              >
                                {item.itemType === 'PRODUCT' ? '🛒 Boutique' : '🛠️ Prestation'}
                              </Badge>
                              <strong className="text-slate-900 dark:text-white block">
                                {item.serviceName || item.productName || item.description}
                              </strong>
                            </div>
                            {item.discountReason && (
                              <span className="block text-[10px] text-purple-600 italic mt-0.5">
                                « Motif: {item.discountReason} »
                              </span>
                            )}
                            {item.notes && <span className="block text-[10px] text-slate-400">{item.notes}</span>}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {item.quantity} {item.unit}
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
                                  ? 'purple'
                                  : item.productionStatus === 'IN_PRODUCTION'
                                  ? 'info'
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
                                  title="Annuler cette prestation"
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
                <span className="text-[10px] uppercase text-slate-400 block">Total Net Dossier :</span>
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={FileText}
                  onClick={() => handleGenerateInvoice(selectedOrder)}
                >
                  Générer Facture
                </Button>
                {selectedOrder.dueAmount > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={DollarSign}
                    onClick={() => setOrderForPayment(selectedOrder)}
                    className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    Encaisser Solde ({formatCurrency(selectedOrder.dueAmount)})
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && (
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
    </div>
  );
};
