import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { dbStore } from '../../server/db/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { MarketplaceConversation, MarketplaceMessage } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
  MessageSquare, Send, User, Store, Package, 
  Search, CheckCheck, Check, Clock, RefreshCw, AlertCircle,
  Tag, MapPin, Phone, ArrowLeft, Inbox, ShoppingBag,
  ShieldCheck, Sparkles, Filter, CheckCircle2
} from 'lucide-react';

export const BoutiqueMessagingView: React.FC = () => {
  const { currentTenant, currentUser, isSuperAdmin, allTenants, switchTenant } = useAuth();
  const { showToast } = useNotification();
  const currentBoutiqueId = currentTenant?.id || 't-001';

  const [stateVersion, setStateVersion] = useState(0);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'PRODUCTS' | 'ORDERS'>('ALL');
  const [replyContent, setReplyContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to DB state updates
  useEffect(() => {
    const unsubscribe = dbStore.subscribe(() => {
      setStateVersion(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Fetch conversations (either for current boutique or all for SuperAdmin supervision)
  const conversations = useMemo(() => {
    return dbStore.getMarketplaceConversations(
      currentBoutiqueId, 
      undefined, 
      { isSuperAdmin: isSuperAdmin && !currentBoutiqueId }
    );
  }, [currentBoutiqueId, isSuperAdmin, stateVersion]);

  // Total unread count for this boutique
  const totalUnread = useMemo(() => {
    return dbStore.getMarketplaceUnreadCount(currentBoutiqueId);
  }, [currentBoutiqueId, stateVersion]);

  // Tab counts
  const counts = useMemo(() => {
    const unread = conversations.filter(c => (c.unreadByBoutique || 0) > 0).length;
    const products = conversations.filter(c => !!c.productId).length;
    const orders = conversations.filter(c => !!c.orderId).length;
    return { all: conversations.length, unread, products, orders };
  }, [conversations]);

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (activeTab === 'UNREAD' && (!conv.unreadByBoutique || conv.unreadByBoutique <= 0)) {
        return false;
      }
      if (activeTab === 'PRODUCTS' && !conv.productId) {
        return false;
      }
      if (activeTab === 'ORDERS' && !conv.orderId) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (conv.customerName && conv.customerName.toLowerCase().includes(q)) ||
        (conv.boutiqueName && conv.boutiqueName.toLowerCase().includes(q)) ||
        (conv.productName && conv.productName.toLowerCase().includes(q)) ||
        (conv.orderCode && conv.orderCode.toLowerCase().includes(q)) ||
        (conv.lastMessageContent && conv.lastMessageContent.toLowerCase().includes(q))
      );
    });
  }, [conversations, searchQuery, activeTab]);

  // Active full conversation with messages
  const activeConversation = useMemo(() => {
    if (!selectedConvId) {
      // Auto-select first conversation on desktop if available
      return conversations[0] ? dbStore.getMarketplaceConversationById(conversations[0].id) : null;
    }
    return dbStore.getMarketplaceConversationById(selectedConvId);
  }, [selectedConvId, conversations, stateVersion]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages?.length]);

  // When active conversation changes, mark as read for BOUTIQUE
  useEffect(() => {
    if (activeConversation?.id && (activeConversation.unreadByBoutique || 0) > 0) {
      dbStore.markMarketplaceConversationAsRead(activeConversation.id, 'BOUTIQUE');
    }
  }, [activeConversation?.id, activeConversation?.unreadByBoutique]);

  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    dbStore.markMarketplaceConversationAsRead(id, 'BOUTIQUE');
  };

  // Human readable role label for staff sender
  const getStaffRoleLabel = () => {
    const roleCode = currentUser?.roles[0]?.code || (currentUser as any)?.roleCode || currentUser?.role;
    if (roleCode === 'SUPER_ADMIN') return 'Super Admin';
    if (roleCode === 'ADMIN_CENTRE') return 'Administrateur';
    if (roleCode === 'GERANT') return 'Gérant';
    if (roleCode === 'CAISSIER') return 'Caissier / Caisse';
    if (roleCode === 'RECEPTIONNISTE') return 'Accueil / Réception';
    if (roleCode === 'VENDEUR') return 'Vendeur / Commercial';
    if (roleCode === 'OPERATEUR') return 'Opérateur Atelier';
    if (roleCode === 'RESPONSABLE_FORMATION') return 'Pôle Formation';
    return currentUser?.roles[0]?.name || 'Équipe Boutique';
  };

  const handleSendMessage = (e?: React.FormEvent, predefinedText?: string) => {
    if (e) e.preventDefault();
    const content = predefinedText || replyContent;
    if (!content.trim() || !activeConversation) return;

    const roleLabel = getStaffRoleLabel();
    const staffName = currentUser?.firstName 
      ? `${currentUser.firstName} ${currentUser.lastName || ''} (${roleLabel})`.trim()
      : `${currentTenant?.name || 'Boutique'} (${roleLabel})`;

    const res = dbStore.sendMarketplaceMessage({
      conversationId: activeConversation.id,
      senderId: currentUser?.id || currentBoutiqueId,
      senderType: 'BOUTIQUE',
      senderName: staffName,
      senderRole: roleLabel,
      content: content.trim(),
      messageType: 'TEXT'
    });

    if (res.success) {
      if (!predefinedText) setReplyContent('');
      showToast('Message envoyé', 'Votre réponse a été transmise au client en direct.', 'SUCCESS');
    } else {
      showToast('Erreur', res.error || 'Impossible d\'envoyer le message.', 'DANGER');
    }
  };

  const quickReplies = [
    "Bonjour, oui cet article est disponible en stock !",
    "Votre commande est validée et en cours de préparation.",
    "Vous pouvez passer récupérer votre article en boutique aujourd'hui.",
    "Proposez-vous une livraison ou un retrait sur place ?"
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Messagerie Centrale Boutique</span>
              {totalUnread > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                  🔴 {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Tous lus
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Échangez avec les clients — Partagé entre Vendeur, Accueil et Gérant de {currentTenant?.name}
            </p>
          </div>
        </div>

        {/* Agency Switcher for SuperAdmin supervision */}
        {isSuperAdmin && allTenants && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Supervision :</span>
            <select
              value={currentTenant?.id}
              onChange={(e) => switchTenant(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {allTenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.city || 'Guinée'})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Messaging Interface */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px] h-[calc(100vh-230px)]">
        
        {/* Left Column: Filter Tabs & Conversations List */}
        <div className={`md:col-span-4 border-r border-slate-200 dark:border-slate-700 flex flex-col ${
          selectedConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher client, produit, commande..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Tous ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('UNREAD')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                  activeTab === 'UNREAD'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Non lus</span>
                {counts.unread > 0 && (
                  <span className="px-1 py-0.2 rounded-full text-[9px] bg-rose-500 text-white">
                    {counts.unread}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PRODUCTS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === 'PRODUCTS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Produits ({counts.products})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ORDERS')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === 'ORDERS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Commandes ({counts.orders})
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium">Aucune conversation trouvée.</p>
                <p className="text-[11px] text-slate-500">
                  Les messages des clients sur vos produits et commandes apparaîtront ici.
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = activeConversation?.id === conv.id;
                const hasUnread = (conv.unreadByBoutique || 0) > 0;

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full p-3.5 text-left transition-all flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                      isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    {/* Thumbnail or Context Icon */}
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0 overflow-hidden flex items-center justify-center relative">
                      {conv.productImageUrl ? (
                        <img 
                          src={conv.productImageUrl} 
                          alt={conv.productName} 
                          className="w-full h-full object-cover"
                        />
                      ) : conv.orderId ? (
                        <ShoppingBag className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                      {hasUnread && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800 animate-pulse" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs truncate ${
                          hasUnread ? 'text-slate-900 dark:text-white font-black' : 'text-slate-700 dark:text-slate-200 font-bold'
                        }`}>
                          {conv.customerName}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatDate(conv.lastMessageAt)}
                        </span>
                      </div>

                      {/* Context badge: Product or Order */}
                      {conv.orderCode ? (
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5">
                          🛍️ Commande #{conv.orderCode}
                        </p>
                      ) : conv.productName ? (
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                          📦 {conv.productName}
                        </p>
                      ) : null}

                      <p className={`text-xs truncate mt-1 ${
                        hasUnread 
                          ? 'text-slate-900 dark:text-slate-100 font-semibold' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {conv.lastMessageContent || 'Nouvelle discussion'}
                      </p>
                    </div>

                    {hasUnread && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shrink-0">
                        {conv.unreadByBoutique}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Thread */}
        <div className={`md:col-span-8 flex flex-col bg-slate-50/50 dark:bg-slate-900/20 ${
          !selectedConvId && !activeConversation ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConversation ? (
            <>
              {/* Active Conversation Top Bar */}
              <div className="p-3.5 px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConvId(null)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden"
                    title="Retour aux conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0 overflow-hidden flex items-center justify-center">
                    {activeConversation.productImageUrl ? (
                      <img 
                        src={activeConversation.productImageUrl} 
                        alt={activeConversation.productName} 
                        className="w-full h-full object-cover"
                      />
                    ) : activeConversation.orderId ? (
                      <ShoppingBag className="w-5 h-5 text-amber-500" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeConversation.customerName}</span>
                      {activeConversation.customerPhone && (
                        <span className="text-[11px] font-normal text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {activeConversation.customerPhone}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {activeConversation.orderCode ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          Commande #{activeConversation.orderCode}
                          {activeConversation.orderTotal !== undefined && ` • ${formatCurrency(activeConversation.orderTotal)}`}
                        </span>
                      ) : activeConversation.productName ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {activeConversation.productName}
                          {activeConversation.publicPrice !== undefined && (
                            <span> • {formatCurrency(activeConversation.publicPrice)} / {activeConversation.publicUnit || 'Unité'}</span>
                          )}
                        </span>
                      ) : (
                        <span>Discussion générale avec la boutique</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Boutique</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {activeConversation.boutiqueName}
                  </span>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                
                {/* Product Context Banner */}
                {activeConversation.productName && !activeConversation.orderCode && (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <span className="text-slate-600 dark:text-slate-300">
                        Discussion initiée depuis l'offre : <strong>{activeConversation.productName}</strong>
                      </span>
                    </div>
                    {activeConversation.publicPrice !== undefined && (
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg">
                        {formatCurrency(activeConversation.publicPrice)} / {activeConversation.publicUnit || 'Unité'}
                      </span>
                    )}
                  </div>
                )}

                {/* Order Context Banner */}
                {activeConversation.orderCode && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-slate-800 dark:text-slate-200">
                        Discussion liée à la <strong>Commande #{activeConversation.orderCode}</strong>
                      </span>
                    </div>
                    {activeConversation.orderTotal !== undefined && (
                      <span className="font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-lg">
                        {formatCurrency(activeConversation.orderTotal)}
                      </span>
                    )}
                  </div>
                )}

                {/* Messages List */}
                {activeConversation.messages && activeConversation.messages.length > 0 ? (
                  activeConversation.messages.map((msg: MarketplaceMessage) => {
                    const isStoreSender = msg.senderType === 'BOUTIQUE' || msg.senderType === 'STAFF' || msg.senderType === 'ADMIN';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStoreSender ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm ${
                          isStoreSender
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}>
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className={`text-[10px] font-bold ${
                              isStoreSender ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                            }`}>
                              {isStoreSender ? msg.senderName : `${msg.senderName} (Client)`}
                            </span>
                            <span className={`text-[9px] ${
                              isStoreSender ? 'text-emerald-200' : 'text-slate-400'
                            }`}>
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>

                          {/* Message status & time */}
                          <div className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${
                            isStoreSender ? 'text-emerald-200' : 'text-slate-400'
                          }`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isStoreSender && (
                              <span className="flex items-center gap-0.5" title={msg.isRead ? 'Lu par le client' : 'Envoyé au client'}>
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
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Aucun message dans cette discussion.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies Chips */}
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(undefined, reply)}
                    className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-white dark:bg-slate-800 hover:bg-emerald-50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shrink-0 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Répondre en tant que ${getStaffRoleLabel()}...`}
                  className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  icon={Send}
                  size="sm"
                  disabled={!replyContent.trim()}
                >
                  Envoyer
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Sélectionnez une conversation
              </p>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                Choisissez un message dans la colonne de gauche pour afficher l'historique et répondre au client.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

