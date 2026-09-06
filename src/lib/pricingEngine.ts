import { Service, ServicePricingRule, RoleCode, DiscountRoleLimit } from '../types';

export interface CalculationItemInput {
  service: Service;
  quantity: number;
  customerType?: 'ALL' | 'STUDENT' | 'COMPANY' | 'VIP';
  customDiscountPercent?: number;
  customUnitPrice?: number;
  discountReason?: string;
}

export interface DetailedCalculationResult {
  standardUnitPrice: number;
  tierUnitPrice: number;
  appliedUnitPrice: number;
  grossTotal: number;
  discountAmount: number;
  discountPercent: number;
  discountType: 'TIER' | 'EXCEPTIONAL' | 'CUSTOMER_PROFILE' | 'NONE';
  netTotal: number;
  appliedRule?: ServicePricingRule;
}

export interface CalculationResult {
  unitPrice: number;
  appliedRule?: ServicePricingRule;
  grossTotal: number;
  discountAmount: number;
  netTotal: number;
}

/**
 * Detailed Pricing & Discount Engine
 * Evaluates standard rates, quantity tiers (brackets), exceptional negotiated rates,
 * and computes exact financial breakdown with absolute mathematical precision.
 */
export function calculateItemPriceDetailed(input: CalculationItemInput): DetailedCalculationResult {
  const {
    service,
    quantity,
    customerType = 'ALL',
    customDiscountPercent = 0,
    customUnitPrice,
  } = input;

  if (!service || quantity <= 0) {
    return {
      standardUnitPrice: 0,
      tierUnitPrice: 0,
      appliedUnitPrice: 0,
      grossTotal: 0,
      discountAmount: 0,
      discountPercent: 0,
      discountType: 'NONE',
      netTotal: 0,
    };
  }

  const standardUnitPrice = service.basePrice;
  const grossTotal = standardUnitPrice * quantity;

  // 1. Check for matched tiered quantity rule
  let matchedRule: ServicePricingRule | undefined = undefined;

  if (service.pricingRules && service.pricingRules.length > 0) {
    // Look for customer-specific rule first
    matchedRule = service.pricingRules.find(rule => {
      const matchType = rule.customerType === customerType || rule.customerType === 'ALL';
      const matchMin = quantity >= rule.minQuantity;
      const matchMax = rule.maxQuantity === undefined || rule.maxQuantity === null || quantity <= rule.maxQuantity;
      return matchType && matchMin && matchMax;
    });

    // Fallback to ALL type rule
    if (!matchedRule && customerType !== 'ALL') {
      matchedRule = service.pricingRules.find(rule => {
        const matchType = rule.customerType === 'ALL';
        const matchMin = quantity >= rule.minQuantity;
        const matchMax = rule.maxQuantity === undefined || rule.maxQuantity === null || quantity <= rule.maxQuantity;
        return matchType && matchMin && matchMax;
      });
    }
  }

  const tierUnitPrice = matchedRule ? matchedRule.unitPrice : standardUnitPrice;

  // 2. Determine applied unit price and discount type
  let appliedUnitPrice = tierUnitPrice;
  let discountType: 'TIER' | 'EXCEPTIONAL' | 'CUSTOMER_PROFILE' | 'NONE' = 'NONE';

  if (customUnitPrice !== undefined && customUnitPrice >= 0) {
    appliedUnitPrice = customUnitPrice;
    discountType = customUnitPrice < standardUnitPrice ? 'EXCEPTIONAL' : 'NONE';
  } else if (customDiscountPercent > 0) {
    const discountedPrice = Math.round(standardUnitPrice * (1 - customDiscountPercent / 100));
    appliedUnitPrice = Math.min(tierUnitPrice, discountedPrice);
    discountType = 'EXCEPTIONAL';
  } else if (matchedRule && matchedRule.unitPrice < standardUnitPrice) {
    appliedUnitPrice = matchedRule.unitPrice;
    discountType = matchedRule.customerType !== 'ALL' ? 'CUSTOMER_PROFILE' : 'TIER';
  }

  const netTotal = Math.round(appliedUnitPrice * quantity);
  const discountAmount = Math.max(0, grossTotal - netTotal);
  const discountPercent = grossTotal > 0 ? Number(((discountAmount / grossTotal) * 100).toFixed(2)) : 0;

  return {
    standardUnitPrice,
    tierUnitPrice,
    appliedUnitPrice,
    grossTotal,
    discountAmount,
    discountPercent,
    discountType,
    netTotal,
    appliedRule: matchedRule,
  };
}

/**
 * Backward-compatible helper
 */
export function calculateItemPrice(input: CalculationItemInput): CalculationResult {
  const res = calculateItemPriceDetailed(input);
  return {
    unitPrice: res.appliedUnitPrice,
    appliedRule: res.appliedRule,
    grossTotal: res.grossTotal,
    discountAmount: res.discountAmount,
    netTotal: res.netTotal,
  };
}

/**
 * Verifies role-based discount threshold limits.
 */
export function checkDiscountPermission(
  roleCode: RoleCode | string,
  requestedDiscountPercent: number,
  discountRoleLimits: DiscountRoleLimit[],
  hasAdminPermission: boolean = false
): {
  allowed: boolean;
  requiresApproval: boolean;
  maxAllowedPercent: number;
  message: string;
} {
  const isAdmin = hasAdminPermission || roleCode === 'SUPER_ADMIN' || roleCode === 'ADMIN_CENTRE' || roleCode === 'GERANT';

  if (isAdmin) {
    return {
      allowed: true,
      requiresApproval: false,
      maxAllowedPercent: 100,
      message: 'Remise autorisée par la direction.',
    };
  }

  const limit = discountRoleLimits.find(l => l.roleCode === roleCode) || {
    roleCode: roleCode as RoleCode,
    roleName: roleCode,
    maxDiscountPercent: 70, // Default to 70% for operational staff with motif
    canGrantExceptional: true,
    requiresApprovalAbove: 50,
  };

  if (!limit.canGrantExceptional && requestedDiscountPercent > 0) {
    return {
      allowed: false,
      requiresApproval: true,
      maxAllowedPercent: 0,
      message: `Votre poste (${limit.roleName}) n'est pas autorisé à accorder des remises exceptionnelles manuelles.`,
    };
  }

  if (requestedDiscountPercent > limit.maxDiscountPercent) {
    return {
      allowed: false,
      requiresApproval: true,
      maxAllowedPercent: limit.maxDiscountPercent,
      message: `La remise demandée (${requestedDiscountPercent.toFixed(0)}%) dépasse votre limite autorisée (${limit.maxDiscountPercent}%). Une validation par un Administrateur est requise.`,
    };
  }

  return {
    allowed: true,
    requiresApproval: requestedDiscountPercent > limit.requiresApprovalAbove,
    maxAllowedPercent: limit.maxDiscountPercent,
    message: `Remise de ${requestedDiscountPercent.toFixed(0)}% accordée avec succès.`,
  };

  return {
    allowed: true,
    requiresApproval: false,
    maxAllowedPercent: limit.maxDiscountPercent,
    message: `Remise de ${requestedDiscountPercent}% autorisée.`,
  };
}

export function calculateOrderTotals(
  items: { unitPrice: number; quantity: number; discountPercent?: number; standardUnitPrice?: number; productionStatus?: string }[],
  globalDiscountAmount: number = 0,
  taxRate: number = 0
) {
  // Exclude cancelled items from financial totals
  const activeItems = items.filter(i => i.productionStatus !== 'CANCELLED');

  const grossSubtotal = activeItems.reduce((sum, item) => {
    const standard = item.standardUnitPrice ?? item.unitPrice;
    return sum + (standard * item.quantity);
  }, 0);

  const subtotal = activeItems.reduce((sum, item) => {
    const gross = item.unitPrice * item.quantity;
    const discount = (gross * (item.discountPercent || 0)) / 100;
    return sum + (gross - discount);
  }, 0);

  const totalDiscount = Math.max(0, grossSubtotal - subtotal) + globalDiscountAmount;
  const taxableAmount = Math.max(0, subtotal - globalDiscountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  return {
    grossSubtotal,
    subtotal,
    discountAmount: totalDiscount,
    taxAmount,
    totalAmount,
  };
}

/**
 * Computes global OrderStatus dynamically from item production statuses.
 */
export function computeDynamicOrderStatus(items: { productionStatus?: string }[]): import('../types').OrderStatus {
  if (!items || items.length === 0) return 'PENDING';

  const nonCancelled = items.filter(i => i.productionStatus !== 'CANCELLED');
  if (nonCancelled.length === 0) return 'CANCELLED';

  const statuses = nonCancelled.map(i => i.productionStatus || 'PENDING');

  const allDelivered = statuses.every(s => s === 'DELIVERED');
  if (allDelivered) return 'DELIVERED';

  const anyDelivered = statuses.some(s => s === 'DELIVERED');
  if (anyDelivered) return 'PARTIALLY_DELIVERED';

  const allReadyOrDone = statuses.every(s => s === 'READY' || s === 'DONE');
  if (allReadyOrDone) return 'READY';

  const anyDoneOrReady = statuses.some(s => s === 'READY' || s === 'DONE');
  const anyInProgress = statuses.some(s => s === 'IN_PRODUCTION');
  if (anyDoneOrReady && (anyInProgress || statuses.some(s => s === 'PENDING' || s === 'TODO'))) {
    return 'PARTIALLY_DONE';
  }

  if (anyInProgress) return 'IN_PRODUCTION';

  return 'PENDING';
}

/**
 * Computes dynamic DeliveryStatus.
 */
export function computeDynamicDeliveryStatus(items: { productionStatus?: string }[]): 'UNDELIVERED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' {
  if (!items || items.length === 0) return 'UNDELIVERED';

  const nonCancelled = items.filter(i => i.productionStatus !== 'CANCELLED');
  if (nonCancelled.length === 0) return 'UNDELIVERED';

  const statuses = nonCancelled.map(i => i.productionStatus || 'PENDING');
  const allDelivered = statuses.every(s => s === 'DELIVERED');
  if (allDelivered) return 'DELIVERED';

  const anyDelivered = statuses.some(s => s === 'DELIVERED');
  if (anyDelivered) return 'PARTIALLY_DELIVERED';

  return 'UNDELIVERED';
}
