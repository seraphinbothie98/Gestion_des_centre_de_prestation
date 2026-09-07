// ==============================================================================
// CMS MARKETPLACE - TYPESCRIPT DEFINITIONS
// Multi-Store Public Marketplace for Guinea (Conakry & Interior Cities)
// ==============================================================================

export type GuineanCity = 
  | 'Conakry'
  | 'Kindia'
  | 'Boké'
  | 'Mamou'
  | 'Labé'
  | 'Faranah'
  | 'Kankan'
  | 'N\'Zérékoré'
  | 'Siguiri'
  | 'Kissidougou'
  | 'Coyah'
  | 'Dubréka'
  | 'Autre ville';

export type ConakryCommune =
  | 'Kaloum'
  | 'Dixinn'
  | 'Matam'
  | 'Ratoma'
  | 'Matoto'
  | 'Sonfonia'
  | 'Gbessia'
  | 'Tombolia'
  | 'Kagbelen';

export interface MarketplaceCategory {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  imageUrl?: string;
  itemCount?: number;
  color?: string;
}

export interface MarketplaceStoreReview {
  id: string;
  storeId: string; // tenantId
  productId?: string;
  productName?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userCity?: string;
  rating: number; // 1 to 5
  comment: string;
  isVerifiedPurchase: boolean;
  orderNumber?: string;
  createdAt: string;
}

export interface MarketplaceChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'CUSTOMER' | 'STORE';
  content: string;
  imageUrl?: string;
  createdAt: string;
  isRead: boolean;
}

export interface MarketplaceConversation {
  id: string;
  storeId: string; // tenantId
  storeName: string;
  storeCity: string;
  storeLogoUrl?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerCity?: string;
  productId?: string;
  productName?: string;
  productImageUrl?: string;
  orderId?: string;
  orderNumber?: string;
  lastMessageText: string;
  lastMessageAt: string;
  unreadCountCustomer: number;
  unreadCountStore: number;
  messages: MarketplaceChatMessage[];
  createdAt: string;
}

export interface MarketplaceCartItem {
  productId: string;
  productName: string;
  productCode: string;
  imageUrl?: string;
  storeId: string; // tenantId
  storeName: string;
  storeCity: string;
  storeCommune?: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  maxStock: number;
}

export interface MarketplaceStoreOrderGroup {
  storeId: string;
  storeName: string;
  storeCity: string;
  storePhone?: string;
  items: MarketplaceCartItem[];
  subtotal: number;
  estimatedDeliveryFee?: number;
  deliveryNotes?: string;
}
