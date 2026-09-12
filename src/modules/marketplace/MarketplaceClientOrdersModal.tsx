import React, { useState, useMemo } from 'react';
import { 
  X, ShoppingBag, Store, MapPin, Package, Clock, 
  CheckCircle2, AlertCircle, Phone, Search, ChevronRight, 
  MessageSquare, Truck, DollarSign, Calendar, ShieldCheck,
  ArrowLeft, Check, Sparkles, Navigation, Info
} from 'lucide-react';
import { Order, OrderStatus, OrderTrackingEvent } from '../../types';
import { dbStore } from '../../server/db/mockStore';
import { formatCurrency, formatDate } from '../../lib/utils';

interface MarketplaceClientOrdersModalProps {
  onClose: () => void;
  onOpenStoreChat?: (storeId: string, order?: Order) => void;
}

export const MarketplaceClientOrdersModal: React.FC<MarketplaceClientOrdersModalProps> = ({
  onClose,
  onOpenStoreChat
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'TRACKING' | 'ITEMS'>('TRACKING');

  const state = dbStore.getState();
  const allTenants = state.tenants || [];

  const tenantMap = useMemo(() => {
    return new Map(allTenants.map(t => [t.id, t]));
  }, [allTenants]);

  // All marketplace orders
  const marketplaceOrders = useMemo(() => {
    const orders = (state.orders || []).filter(o => o.orderSource === 'MARKETPLACE');
    if (!searchTerm.trim()) {
      return orders;
    }
    const q = searchTerm.trim().toLowerCase();
    return orders.filter(o => 
      o.orderNumber.toLowerCase().includes(q) ||
      o.personName.toLowerCase().includes(q) ||
      (o.personPhone && o.personPhone.includes(q)) ||
      (o.clientCity && o.clientCity.toLowerCase().includes(q))
    );
  }, [state.orders, searchTerm]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> En attente de confirmation
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Confirmée par la boutique
          </span>
        );
      case 'IN_PRODUCTION':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            <Package className="w-3 h-3" /> En cours de préparation
          </span>
        );
      case 'READY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <Truck className="w-3 h-3" /> Prête / Expédition
          </span>
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Livrée avec succès
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Annulée / Refusée
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  // Build standard 6-step lifecycle timeline
  const computeTimelineSteps = (order: Order) => {
    const isPaid = order.paymentStatus === 'PAID';
    const isPartiallyPaid = order.paymentStatus === 'PARTIALLY_PAID';
    const isCancelled = order.status === 'CANCELLED';

    // Step rank helper
    const statusRankMap: Record<OrderStatus, number> = {
      DRAFT: 0,
      PENDING: 1,
      CONFIRMED: 2,
      IN_PRODUCTION: 3,
      PARTIALLY_DONE: 3,
      READY: 4,
      PARTIALLY_DELIVERED: 4,
      DELIVERED: 5,
      COMPLETED: 5,
      CANCELLED: -1
    };

    const currentRank = statusRankMap[order.status] || 1;

    const steps = [
      {
        id: 'STEP_PLACED',
        title: 'Commande émise',
        subtitle: 'Commande transmise avec succès au commerçant',
        isCompleted: true,
        isActive: order.status === 'PENDING',
        date: order.createdAt,
        actor: `${order.personName} (Client)`
      },
      {
        id: 'STEP_CONFIRMED',
        title: 'Commande confirmée',
        subtitle: 'La boutique a accepté la commande et réservé les articles',
        isCompleted: currentRank >= 2,
        isActive: order.status === 'CONFIRMED',
        date: order.status === 'CONFIRMED' || currentRank >= 2 ? order.updatedAt : undefined,
        actor: 'Commerçant / Gérant'
      },
      {
        id: 'STEP_PAYMENT',
        title: 'Paiement validé',
        subtitle: isPaid 
          ? 'Règlement intégral vérifié par la caisse / banque' 
          : isPartiallyPaid 
          ? `Acompte versé (${formatCurrency(order.paidAmount)} / ${formatCurrency(order.totalAmount)})` 
          : 'En attente du règlement ou validation caisse',
        isCompleted: isPaid,
        isActive: !isPaid && (currentRank >= 2),
        date: isPaid ? order.updatedAt : undefined,
        actor: isPaid ? 'Caissier / Admin' : 'Paiement requis avant livraison'
      },
      {
        id: 'STEP_PREPARATION',
        title: 'Commande en préparation',
        subtitle: 'Emballage, conditionnement et vérification des articles',
        isCompleted: currentRank >= 4,
        isActive: order.status === 'IN_PRODUCTION',
        date: order.status === 'IN_PRODUCTION' || currentRank >= 4 ? order.updatedAt : undefined,
        actor: 'Équipe Magasin / Atelier'
      },
      {
        id: 'STEP_READY',
        title: 'Prête & Remise expédition',
        subtitle: 'Colis prêt au point relais ou remis au livreur partenaire',
        isCompleted: currentRank >= 4 && order.status !== 'IN_PRODUCTION',
        isActive: order.status === 'READY',
        date: order.status === 'READY' || currentRank >= 5 ? order.updatedAt : undefined,
        actor: 'Service Logistique'
      },
      {
        id: 'STEP_DELIVERED',
        title: 'Commande livrée & Reçue',
        subtitle: 'Remise au client effectuée et validée',
        isCompleted: order.status === 'DELIVERED' || order.status === 'COMPLETED',
        isActive: false,
        date: order.deliveredAt || (order.status === 'DELIVERED' ? order.updatedAt : undefined),
        actor: order.deliveredByUserName || 'Livreur / Client'
      }
    ];

    return { steps, isCancelled };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto p-5 sm:p-8">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/10">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                Mes Commandes Marketplace
                <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-400/20 text-yellow-400 font-bold">
                  {marketplaceOrders.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Suivi chronologique et traçabilité en temps réel de vos commandes.
              </p>
            </div>
          </div>

          {!selectedOrder && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par N° commande, nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 text-white text-xs rounded-xl border border-slate-700 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Order Details & Chronological Tracking View */}
        {selectedOrder ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Retour à la liste de mes commandes
              </button>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedOrder.status)}
              </div>
            </div>

            {/* Order Card Header */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Référence de Commande</span>
                  <span className="text-lg font-black text-yellow-400 font-mono">{selectedOrder.orderNumber}</span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Émise le {formatDate(selectedOrder.createdAt, 'dd MMMM yyyy à HH:mm')}
                  </span>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Montant Total</span>
                  <span className="text-xl font-black text-emerald-400">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedOrder.dueAmount === 0 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : selectedOrder.paidAmount > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {selectedOrder.dueAmount === 0 
                        ? '✓ Soldé (Payé)' 
                        : selectedOrder.paidAmount > 0 
                        ? `Acompte : ${formatCurrency(selectedOrder.paidAmount)}` 
                        : 'Paiement en attente'}
                    </span>
                    {selectedOrder.dueAmount > 0 && selectedOrder.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = dbStore.recordOrderPayment({
                            orderId: selectedOrder.id,
                            amount: selectedOrder.dueAmount,
                            cashierName: `${selectedOrder.personName || 'Client'} (Paiement Mobile Money)`
                          });
                          if (res.success && res.order) {
                            setSelectedOrder(res.order);
                          }
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                      >
                        <DollarSign className="w-3 h-3" />
                        Payer maintenant ({formatCurrency(selectedOrder.dueAmount)})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Boutique & Delivery Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-300 font-bold mb-1">
                    <Store className="w-4 h-4 text-yellow-400" />
                    Boutique Vendeuse
                  </div>
                  <strong className="text-white block text-sm">
                    {tenantMap.get(selectedOrder.tenantId)?.name || 'Boutique Partenaire'}
                  </strong>
                  <span className="text-slate-400 block">
                    📍 Ville Boutique : <strong className="text-slate-200">{tenantMap.get(selectedOrder.tenantId)?.city || 'Guinée'}</strong>
                  </span>
                  {onOpenStoreChat && (
                    <button
                      type="button"
                      onClick={() => onOpenStoreChat(selectedOrder.tenantId, selectedOrder)}
                      className="mt-2 text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1.5 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/20 transition-colors w-fit"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Contacter la boutique pour cette commande
                    </button>
                  )}
                </div>

                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-300 font-bold mb-1">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Destinataire & Adresse de Livraison
                  </div>
                  <strong className="text-white block">
                    {selectedOrder.personName} {selectedOrder.personPhone ? `(Tél: ${selectedOrder.personPhone})` : ''}
                  </strong>
                  <span className="text-slate-300 block">
                    Ville de destination : <strong className="text-emerald-400">{selectedOrder.clientCity || 'Conakry'}</strong>
                  </span>
                  {selectedOrder.deliveryAddress && (
                    <span className="text-slate-400 block">
                      Adresse précise : {selectedOrder.deliveryAddress}
                    </span>
                  )}
                  {selectedOrder.deliveryNotes && (
                    <span className="text-amber-300/90 italic block text-[11px] mt-1 bg-amber-950/30 p-2 rounded-lg border border-amber-800/30">
                      « Note client : {selectedOrder.deliveryNotes} »
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Tabs between Tracking & Items */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('TRACKING')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'TRACKING'
                    ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Navigation className="w-4 h-4" />
                Suivi du Parcours Chronologique
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ITEMS')}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'ITEMS'
                    ? 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                Articles commandés ({selectedOrder.items.length})
              </button>
            </div>

            {/* TAB 1: Chronological Timeline View */}
            {activeTab === 'TRACKING' && (
              <div className="space-y-6">
                {/* ANOMALIE 4: Real Chronological Visual Timeline */}
                <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Étapes d'avancement de votre commande
                  </h4>

                  {(() => {
                    const { steps, isCancelled } = computeTimelineSteps(selectedOrder);

                    if (isCancelled) {
                      return (
                        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-xs space-y-2">
                          <div className="flex items-center gap-2 font-bold text-rose-300">
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                            Commande annulée ou refusée
                          </div>
                          <p className="text-rose-200/80">
                            Cette commande a été annulée. Si vous avez des questions, vous pouvez contacter directement le commerçant via le bouton de messagerie.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                        {steps.map((step, idx) => {
                          return (
                            <div key={step.id || idx} className="relative group">
                              {/* Step Icon Bullet */}
                              <div className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step.isCompleted
                                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                                  : step.isActive
                                  ? 'bg-yellow-400 text-slate-950 ring-4 ring-yellow-400/20 animate-pulse'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700'
                              }`}>
                                {step.isCompleted ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <span className="text-[10px]">{idx + 1}</span>
                                )}
                              </div>

                              {/* Step Content */}
                              <div className="space-y-1">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <h5 className={`text-xs sm:text-sm font-bold ${
                                    step.isCompleted
                                      ? 'text-white'
                                      : step.isActive
                                      ? 'text-yellow-400 font-extrabold'
                                      : 'text-slate-500'
                                  }`}>
                                    {step.title}
                                  </h5>

                                  {step.date && (
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {formatDate(step.date, 'dd/MM/yyyy HH:mm')}
                                    </span>
                                  )}
                                </div>

                                <p className={`text-xs ${step.isCompleted || step.isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {step.subtitle}
                                </p>

                                {step.actor && (step.isCompleted || step.isActive) && (
                                  <span className="text-[10px] text-slate-500 block">
                                    Intervenant : <strong className="text-slate-400">{step.actor}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Audit & Event Log History */}
                {selectedOrder.trackingEvents && selectedOrder.trackingEvents.length > 0 && (
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Journal des Événements Horodatés
                    </h4>
                    <div className="divide-y divide-slate-900 max-h-48 overflow-y-auto">
                      {selectedOrder.trackingEvents.map((evt: OrderTrackingEvent) => (
                        <div key={evt.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <strong className="text-white block">{evt.title}</strong>
                            <p className="text-slate-400 text-[11px]">{evt.description}</p>
                            {evt.actorName && (
                              <span className="text-[10px] text-slate-500">
                                Par {evt.actorName} {evt.actorRole ? `(${evt.actorRole})` : ''}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {formatDate(evt.timestamp, 'dd/MM HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Items List */}
            {activeTab === 'ITEMS' && (
              <div className="space-y-3">
                <div className="divide-y divide-slate-800 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={item.id || idx} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.productImageUrl ? (
                            <img 
                              src={item.productImageUrl} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <Package className="w-6 h-6 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white line-clamp-1">{item.productName || item.serviceName}</h5>
                          <span className="text-[11px] text-yellow-400 font-semibold">
                            {formatCurrency(item.unitPrice)} <span className="text-slate-400 font-normal">/ {item.publicUnit || item.unit}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {item.requestedQuantity !== undefined && item.validatedQuantity !== undefined && item.requestedQuantity !== item.validatedQuantity ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-500 line-through block">
                              Demandé : {item.requestedQuantity} {item.publicUnit || item.unit}
                            </span>
                            <span className="text-xs text-amber-400 font-extrabold block">
                              Validé : {item.validatedQuantity} {item.publicUnit || item.unit}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 block">
                            Qté : <strong className="text-white">{item.quantity} {item.publicUnit || item.unit}</strong>
                          </span>
                        )}
                        <span className="text-xs font-black text-emerald-400">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-3">
            {marketplaceOrders.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white">Aucune commande Marketplace trouvée</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Vous n'avez pas encore passé de commande ou aucune commande ne correspond à votre recherche.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {marketplaceOrders.map((ord) => {
                  const store = tenantMap.get(ord.tenantId);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setActiveTab('TRACKING');
                      }}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-yellow-400/50 hover:bg-slate-950 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-yellow-400">
                              {ord.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              • {formatDate(ord.createdAt, 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                            <Store className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            <span className="font-semibold text-white">{store?.name || 'Boutique'}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-[11px] text-slate-400">
                              {ord.items.length} article{ord.items.length > 1 ? 's' : ''} ({ord.items.map(i => i.productName).slice(0, 2).join(', ')}{ord.items.length > 2 ? '...' : ''})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                        {getStatusBadge(ord.status)}
                        <div className="text-right">
                          <span className="font-black text-xs text-emerald-400 block">
                            {formatCurrency(ord.totalAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {ord.dueAmount === 0 ? '✓ Soldé' : `Reste: ${formatCurrency(ord.dueAmount)}`}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-yellow-400 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

