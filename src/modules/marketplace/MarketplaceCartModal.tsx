import React, { useState } from 'react';
import { 
  X, ShoppingBag, Trash2, Store, MapPin, 
  ArrowRight, ShieldCheck, CheckCircle2, Truck, AlertCircle, Phone, Package
} from 'lucide-react';
import { MarketplaceCartItem, MarketplaceStoreOrderGroup, GuineanCity } from './types';
import { GUINEAN_CITIES } from './MarketplaceHeader';
import { dbStore } from '../../server/db/mockStore';
import { User } from '../../types';

interface MarketplaceCartModalProps {
  items: MarketplaceCartItem[];
  currentCity: GuineanCity;
  currentUser?: User | null;
  onRequireAuth?: (actionDesc: string, callback: (user: User) => void) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckoutSuccess: (ordersCreated: { storeId: string; storeName: string; orderNumber: string; totalAmount: number }[]) => void;
  onOpenOrders?: () => void;
  onClose: () => void;
}

export const MarketplaceCartModal: React.FC<MarketplaceCartModalProps> = ({
  items,
  currentCity,
  currentUser,
  onRequireAuth,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckoutSuccess,
  onOpenOrders,
  onClose
}) => {
  const [step, setStep] = useState<'CART' | 'CHECKOUT' | 'SUCCESS'>('CART');
  const [customerName, setCustomerName] = useState(() => {
    return currentUser ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : '';
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    return currentUser?.phone || '';
  });
  const [deliveryCity, setDeliveryCity] = useState<GuineanCity>(() => {
    return (currentUser?.city as GuineanCity) || currentCity;
  });
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    return currentUser?.address || '';
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [createdOrders, setCreatedOrders] = useState<{ storeId: string; storeName: string; orderNumber: string; totalAmount: number }[]>([]);

  // Keep state in sync if currentUser logs in
  React.useEffect(() => {
    if (currentUser) {
      if (!customerName) setCustomerName(`${currentUser.firstName} ${currentUser.lastName || ''}`.trim());
      if (!customerPhone && currentUser.phone) setCustomerPhone(currentUser.phone);
      if (currentUser.city) setDeliveryCity(currentUser.city as GuineanCity);
      if (!deliveryAddress && currentUser.address) setDeliveryAddress(currentUser.address);
    }
  }, [currentUser]);

  // Group cart items by store
  const storeGroups: MarketplaceStoreOrderGroup[] = items.reduce((acc, item) => {
    let group = acc.find(g => g.storeId === item.storeId);
    if (!group) {
      group = {
        storeId: item.storeId,
        storeName: item.storeName,
        storeCity: item.storeCity || 'Conakry',
        items: [],
        subtotal: 0
      };
      acc.push(group);
    }
    group.items.push(item);
    group.subtotal += item.unitPrice * item.quantity;
    return acc;
  }, [] as MarketplaceStoreOrderGroup[]);

  const grandTotal = storeGroups.reduce((sum, g) => sum + g.subtotal, 0);

  const handleProceedToCheckout = () => {
    if (!currentUser && onRequireAuth) {
      onRequireAuth('finaliser votre commande', (user) => {
        setCustomerName(`${user.firstName} ${user.lastName || ''}`.trim());
        setCustomerPhone(user.phone || '');
        if (user.city) setDeliveryCity(user.city as GuineanCity);
        if (user.address) setDeliveryAddress(user.address);
        setStep('CHECKOUT');
      });
      return;
    }
    setStep('CHECKOUT');
  };

  const handleConfirmCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      alert("Veuillez renseigner votre nom, téléphone et adresse de livraison.");
      return;
    }

    // Call real dbStore to create orders separated by store
    const result = dbStore.createMarketplaceOrders({
      items,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: currentUser?.email,
      customerId: currentUser?.id,
      deliveryCity: deliveryCity,
      deliveryAddress: deliveryAddress.trim(),
      orderNotes: orderNotes.trim() || undefined
    });

    if (!result.success || result.createdOrders.length === 0) {
      alert(result.error || "Erreur lors de la validation de la commande.");
      return;
    }

    const ordersInfo = result.createdOrders.map((ord) => {
      const group = storeGroups.find(g => g.storeId === ord.tenantId);
      return {
        storeId: ord.tenantId,
        storeName: group?.storeName || 'Boutique',
        orderNumber: ord.orderNumber,
        totalAmount: ord.totalAmount
      };
    });

    setCreatedOrders(ordersInfo);
    onCheckoutSuccess(ordersInfo);
    onClearCart();
    setStep('SUCCESS');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto p-6 sm:p-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: CART VIEW */}
        {step === 'CART' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Mon Panier Multi-Boutiques</h3>
                  <p className="text-xs text-slate-400">
                    {items.length} article{items.length > 1 ? 's' : ''} • {storeGroups.length} boutique{storeGroups.length > 1 ? 's' : ''} distincte{storeGroups.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {items.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vider le panier
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">Votre panier est vide</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Explorez les catégories et boutiques pour trouver les produits dont vous avez besoin.
                </p>
                <button
                  onClick={onClose}
                  className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  Commencer mes achats
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Store Groups List */}
                <div className="space-y-4">
                  {storeGroups.map((group) => (
                    <div 
                      key={group.storeId}
                      className="rounded-2xl bg-slate-950/70 border border-slate-800 overflow-hidden"
                    >
                      {/* Store Header */}
                      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-yellow-400" />
                          <span className="font-bold text-white">{group.storeName}</span>
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/20">
                            📍 {group.storeCity}
                          </span>
                        </div>
                        <span className="font-bold text-yellow-400">
                          Sous-total : {group.subtotal.toLocaleString('fr-FR')} GNF
                        </span>
                      </div>

                      {/* Items in this Store */}
                      <div className="divide-y divide-slate-800/60 p-2">
                        {group.items.map((item) => (
                          <div key={item.productId} className="p-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-slate-600" />
                                )}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-white line-clamp-1">{item.productName}</h5>
                                <span className="text-[11px] text-yellow-400 font-semibold">
                                  {item.unitPrice.toLocaleString('fr-FR')} GNF <span className="text-slate-500 font-normal">/ {item.unit}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Quantity selector */}
                              <div className="flex items-center border border-slate-700 bg-slate-900 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                                  className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold"
                                >
                                  -
                                </button>
                                <span className="px-3 py-1 text-xs font-bold text-white min-w-8 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                                  className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>

                              <span className="text-xs font-bold text-white min-w-20 text-right">
                                {(item.unitPrice * item.quantity).toLocaleString('fr-FR')} GNF
                              </span>

                              <button
                                onClick={() => onRemoveItem(item.productId)}
                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                title="Supprimer l'article"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transport clarification box */}
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-300">
                  <Truck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Expédition & Frais de transport en Guinée</strong>
                    Chaque boutique gère ses propres expéditions. Les frais de transport exacts (selon que vous soyez à Conakry, Kindia, Kankan ou autre) vous seront communiqués directement par chaque vendeur via la messagerie interne avant validation finale.
                  </div>
                </div>

                {/* Total and Checkout Button */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase">Montant total des produits</span>
                    <p className="text-xl sm:text-2xl font-black text-yellow-400">
                      {grandTotal.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-300">GNF</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-none py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                    >
                      Poursuivre mes achats
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedToCheckout}
                      className="flex-1 sm:flex-none py-3 px-7 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Passer la commande</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* STEP 2: CHECKOUT FORM */}
        {step === 'CHECKOUT' && (
          <form onSubmit={handleConfirmCheckout} className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">Finaliser ma commande multi-boutiques</h3>
              <p className="text-xs text-slate-400">
                Renseignez vos coordonnées pour que chaque commerçant puisse vous contacter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Votre Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Mamadou Alpha Diallo"
                  className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Numéro de Téléphone (Orange / MTN) *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ex: +224 620 00 00 00"
                  className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Ville de livraison *</label>
                <select
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value as GuineanCity)}
                  className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  {GUINEAN_CITIES.map(c => (
                    <option key={c} value={c}>📍 {c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Adresse / Quartier de livraison *</label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Ex: Kaloum, Rue KA 020 ou Quartier Kipé"
                  className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Instructions particulières pour le vendeur (Optionnel)</label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={2}
                placeholder="Précisez tout détail utile sur l'horaire souhaité, le point de repère, etc."
                className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Order separation reminder */}
            <div className="p-4 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-xs text-yellow-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-white">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span>Séparation automatique en {storeGroups.length} commande(s)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Vous recevrez une confirmation séparée pour chaque boutique. Chaque commerçant préparera ses articles de manière autonome.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('CART')}
                className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                ← Retour au panier
              </button>

              <button
                type="submit"
                className="py-3 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmer et Envoyer la Commande</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'SUCCESS' && (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Merci ! Votre commande a été transmise
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Vos commandes ont été réparties entre les boutiques concernées. Les vendeurs vont vous contacter directement par téléphone ou via la messagerie.
              </p>
            </div>

            {/* Created Orders List */}
            <div className="space-y-2 max-w-md mx-auto text-left">
              {createdOrders.map(ord => (
                <div 
                  key={ord.orderNumber}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-white block">{ord.storeName}</strong>
                    <span className="text-[11px] text-yellow-400 font-mono">{ord.orderNumber}</span>
                  </div>
                  <span className="font-black text-emerald-400">
                    {ord.totalAmount.toLocaleString('fr-FR')} GNF
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {onOpenOrders && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenOrders();
                  }}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Suivre ma commande en direct</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Retourner à la Marketplace
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
