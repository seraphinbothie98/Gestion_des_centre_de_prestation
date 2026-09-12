import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, MessageSquare, Send, Store, User, 
  MapPin, Clock, ShieldCheck, CheckCheck, Sparkles, Image as ImageIcon,
  Check, Info, Package, ArrowLeft, AlertCircle, AlertTriangle, ShoppingBag
} from 'lucide-react';
import { Product, Tenant, Order } from '../../types';
import { dbStore } from '../../server/db/mockStore';
import { formatCurrency, formatDate } from '../../lib/utils';

interface MarketplaceMessagingModalProps {
  initialProduct?: Product;
  initialStore?: Tenant;
  initialOrder?: Order;
  onClose: () => void;
}

export const MarketplaceMessagingModal: React.FC<MarketplaceMessagingModalProps> = ({
  initialProduct,
  initialStore,
  initialOrder,
  onClose
}) => {
  const [dbVersion, setDbVersion] = useState(0);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const guestCustomerId = 'user-guest-01';

  // Real-time subscription to dbStore
  useEffect(() => {
    const unsubscribe = dbStore.subscribe(() => {
      setDbVersion(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Sync / find / create active conversation when initialStore, initialProduct, or initialOrder is passed
  useEffect(() => {
    const targetStore = initialStore || (initialOrder ? dbStore.getState().tenants.find(t => t.id === initialOrder.tenantId) : undefined);

    if (targetStore) {
      const res = dbStore.findOrCreateMarketplaceConversation({
        customerId: guestCustomerId,
        customerName: 'Client Marketplace',
        boutiqueId: targetStore.id,
        boutiqueName: targetStore.name,
        productId: initialProduct?.id,
        publicationId: initialProduct?.id,
        productName: initialProduct?.name || (initialOrder ? `Commande ${initialOrder.orderNumber}` : 'Discussion Boutique'),
        productImageUrl: (initialProduct?.photos && initialProduct.photos[0]) || (initialProduct?.images && initialProduct.images[0]) || initialProduct?.imageUrl || initialProduct?.photoUrl,
        publicPrice: initialProduct?.publicPrice || initialProduct?.salePrice,
        publicUnit: initialProduct?.publicUnit || initialProduct?.defaultSaleUnit || initialProduct?.baseUnit || 'Unité',
        orderId: initialOrder?.id,
        orderCode: initialOrder?.orderNumber,
        orderTotal: initialOrder?.totalAmount
      });

      if (res.conversation) {
        setActiveConvId(res.conversation.id);
        dbStore.markMarketplaceConversationAsRead(res.conversation.id, 'CUSTOMER');
      }
    } else {
      // Pick latest conversation if available
      const customerConvs = dbStore.getMarketplaceConversations(undefined, guestCustomerId);
      if (customerConvs.length > 0 && !activeConvId) {
        setActiveConvId(customerConvs[0].id);
        dbStore.markMarketplaceConversationAsRead(customerConvs[0].id, 'CUSTOMER');
      }
    }
  }, [initialStore?.id, initialProduct?.id, initialOrder?.id]);

  // All conversations for this customer
  const allConversations = useMemo(() => {
    const list = dbStore.getMarketplaceConversations(undefined, guestCustomerId);
    const tenants = dbStore.getState().tenants || [];
    return list.map(c => {
      const store = tenants.find(t => t.id === c.boutiqueId);
      return {
        ...c,
        storeCity: store?.city || 'Conakry',
        isStoreOnline: store?.isOnline !== false,
        storeLogoUrl: store?.logoUrl
      };
    });
  }, [guestCustomerId, dbVersion]);

  // Active full conversation with real messages
  const activeConversation = useMemo(() => {
    if (!activeConvId) {
      return allConversations[0] ? dbStore.getMarketplaceConversationById(allConversations[0].id) : null;
    }
    return dbStore.getMarketplaceConversationById(activeConvId);
  }, [activeConvId, allConversations, dbVersion]);

  // Mark as read when active conversation changes or new messages arrive
  useEffect(() => {
    if (activeConversation?.id && (activeConversation.unreadByCustomer || 0) > 0) {
      dbStore.markMarketplaceConversationAsRead(activeConversation.id, 'CUSTOMER');
    }
  }, [activeConversation?.id, activeConversation?.unreadByCustomer, dbVersion]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages?.length]);

  const activeStoreTenant = useMemo(() => {
    if (!activeConversation) return null;
    return (dbStore.getState().tenants || []).find(t => t.id === activeConversation.boutiqueId) || null;
  }, [activeConversation, dbVersion]);

  const isStoreOnline = activeStoreTenant?.isOnline !== false;

  const quickQuestions = [
    "Bonjour, cet article est-il actuellement disponible ?",
    "Quel est votre meilleur prix pour plusieurs unités ?",
    "Proposez-vous la livraison à domicile ?",
    "Puis-je venir récupérer directement en boutique aujourd'hui ?"
  ];

  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    setErrorMessage(null);
    dbStore.markMarketplaceConversationAsRead(id, 'CUSTOMER');
  };

  const handleSend = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || messageInput;
    if (!textToSend.trim() || !activeConversation) return;

    try {
      setErrorMessage(null);
      const res = dbStore.sendMarketplaceMessage({
        conversationId: activeConversation.id,
        senderId: guestCustomerId,
        senderType: 'CUSTOMER',
        senderName: 'Moi (Client)',
        senderRole: 'Client',
        content: textToSend.trim(),
        messageType: activeConversation.orderId ? 'ORDER_REF' : (activeConversation.productId ? 'PRODUCT_REF' : 'TEXT')
      });

      if (!res.success) {
        console.error('Send error:', res.error);
        setErrorMessage(res.error || 'Impossible d\'envoyer le message. Réessayez.');
      } else {
        if (!customText) setMessageInput('');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setErrorMessage('Impossible d\'envoyer le message. Réessayez.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* Tricolor accent top strip */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-1 bg-emerald-600" />
        </div>

        {/* Header */}
        <div className="p-4 sm:px-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Messagerie Directe Client ↔ Boutique</span>
                <span className="text-[10px] font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 rounded-full">
                  Guinée Boutiques
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Échangez directement avec l'équipe de la boutique en temps réel (Vendeur, Accueil, Gérant)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Sidebar Conversations + Chat Area) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Conversations List */}
          <div className={`w-full md:w-80 bg-slate-950/60 border-r border-slate-800 flex-col overflow-y-auto ${
            activeConvId ? 'hidden md:flex' : 'flex'
          }`}>
            <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Vos Discussions ({allConversations.length})
              </p>
            </div>

            <div className="divide-y divide-slate-800/50">
              {allConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold text-slate-300">Aucune discussion en cours</p>
                  <p className="text-[11px] text-slate-500">
                    Cliquez sur <strong>« Contacter le vendeur »</strong> sur un produit ou une commande pour échanger.
                  </p>
                </div>
              ) : (
                allConversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  const hasUnread = (conv.unreadByCustomer || 0) > 0;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-emerald-600/15 border-l-4 border-emerald-500' 
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Thumbnail or Icon */}
                      <div className="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {conv.productImageUrl ? (
                          <img src={conv.productImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : conv.orderId ? (
                          <ShoppingBag className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Package className="w-5 h-5 text-yellow-400" />
                        )}
                        <span className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${
                          conv.isStoreOnline ? 'bg-emerald-400' : 'bg-slate-500'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs truncate ${hasUnread ? 'text-white font-black' : 'text-slate-200 font-bold'}`}>
                            {conv.boutiqueName}
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-semibold shrink-0">📍 {conv.storeCity}</span>
                        </div>

                        {conv.orderCode ? (
                          <p className="text-[11px] text-amber-400 font-semibold truncate mt-0.5">
                            🛍️ Commande #{conv.orderCode}
                          </p>
                        ) : conv.productName ? (
                          <p className="text-[11px] text-yellow-400 font-semibold truncate mt-0.5">
                            📦 {conv.productName}
                          </p>
                        ) : null}

                        <p className={`text-xs truncate mt-1 ${hasUnread ? 'text-slate-100 font-bold' : 'text-slate-400'}`}>
                          {conv.lastMessageContent || 'Discussion ouverte'}
                        </p>
                      </div>

                      {hasUnread && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shrink-0 animate-pulse">
                          {conv.unreadByCustomer}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Active Chat View */}
          <div className={`flex-1 flex flex-col bg-slate-900/60 justify-between ${
            !activeConvId ? 'hidden md:flex' : 'flex'
          }`}>
            {activeConversation ? (
              <>
                {/* Active Store Bar & Context */}
                <div className="p-3 px-4 sm:px-6 bg-slate-950/90 border-b border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveConvId('')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
                        title="Retour aux discussions"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-yellow-400 border border-slate-800 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          {activeConversation.boutiqueName}
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        </h4>
                        <p className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="text-yellow-400 font-bold">📍 {activeStoreTenant?.city || 'Conakry'}</span>
                          {activeStoreTenant?.phone && (
                            <span className="text-slate-400">• Tél : {activeStoreTenant.phone}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Online / Offline badge */}
                    {isStoreOnline ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>🟢 En ligne</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span>⚪ Hors ligne (Message différé)</span>
                      </span>
                    )}
                  </div>

                  {/* Order context card inside chat */}
                  {activeConversation.orderCode && (
                    <div className="p-2.5 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-amber-200 font-semibold truncate">
                          Discussion liée à la <strong>Commande #{activeConversation.orderCode}</strong>
                        </span>
                      </div>
                      {activeConversation.orderTotal !== undefined && (
                        <span className="font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 shrink-0">
                          {formatCurrency(activeConversation.orderTotal)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Product context card inside chat */}
                  {activeConversation.productName && !activeConversation.orderCode && (
                    <div className="p-2.5 px-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                          {activeConversation.productImageUrl ? (
                            <img src={activeConversation.productImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <span className="text-slate-300 font-semibold truncate">
                          Produit concerné : <strong className="text-white">{activeConversation.productName}</strong>
                        </span>
                      </div>
                      {activeConversation.publicPrice !== undefined && (
                        <span className="font-black text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/20 shrink-0">
                          {formatCurrency(activeConversation.publicPrice)} {activeConversation.publicUnit ? `/ ${activeConversation.publicUnit}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mx-4 mt-2 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Messages Feed */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                  
                  {/* Offline helper note */}
                  {!isStoreOnline && (
                    <div className="max-w-md mx-auto p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-bold text-slate-200">🌙 L'équipe de la boutique est actuellement hors ligne</p>
                      <p className="text-[11px]">
                        Vous pouvez écrire en toute sérénité. Votre message est bien enregistré et l'équipe le consultera dès sa reconnexion.
                      </p>
                    </div>
                  )}

                  {(!activeConversation.messages || activeConversation.messages.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Aucun message échangé pour l'instant. Posez votre première question ci-dessous !
                    </div>
                  ) : (
                    activeConversation.messages.map((msg) => {
                      const isMe = msg.senderType === 'CUSTOMER';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-end gap-2 max-w-[85%] sm:max-w-md">
                            {!isMe && (
                              <div className="w-7 h-7 rounded-lg bg-slate-800 text-yellow-400 flex items-center justify-center shrink-0 text-xs">
                                <Store className="w-3.5 h-3.5" />
                              </div>
                            )}

                            <div
                              className={`p-3.5 rounded-2xl text-xs sm:text-sm shadow-sm ${
                                isMe
                                  ? 'bg-emerald-600 text-white rounded-br-none shadow-emerald-600/20'
                                  : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                              }`}
                            >
                              {!isMe && (
                                <p className="text-[10px] font-bold text-yellow-400 mb-1">
                                  {activeConversation.boutiqueName || 'Boutique'}
                                </p>
                              )}
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              
                              {/* Message Status & Timestamp */}
                              <div className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${
                                isMe ? 'text-emerald-200' : 'text-slate-400'
                              }`}>
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && (
                                  <span className="flex items-center gap-0.5" title={msg.isRead ? 'Lu par la boutique' : 'Envoyé au serveur'}>
                                    {msg.isRead ? (
                                      <>
                                        <CheckCheck className="w-3.5 h-3.5 text-yellow-300" />
                                        <span className="text-[9px] font-bold text-yellow-300">Lu</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-200" />
                                        <span className="text-[9px]">Envoyé</span>
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(undefined, q)}
                      className="text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-800 shrink-0 transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Message Input Box */}
                <form 
                  onSubmit={(e) => handleSend(e)}
                  className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Écrivez votre message à la boutique..."
                    className="flex-1 bg-slate-900 text-white text-xs sm:text-sm px-4 py-3 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none placeholder:text-slate-500"
                  />
                  
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    <span>Envoyer</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-12 h-12 text-slate-600" />
                <p className="text-sm font-bold text-slate-300">Sélectionnez une discussion</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Choisissez une conversation dans la liste pour voir l'historique et échanger avec la boutique.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

