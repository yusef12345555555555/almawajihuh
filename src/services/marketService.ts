// ============================================================
// المواجهة | خدمة السوق: شراء/تجهيز/إزالة عناصر السوق (من لوحة الإدارة)
// ============================================================

import { UserProfile, MarketCategory, EquippedCosmetics } from '../types';
import { getMarketItem, EQUIP_KEY } from './marketCatalog';
import { StorageService } from './storageService';
import { SocialService } from './socialService';

type Res = { success: boolean; message: string; updatedUser?: UserProfile };

const save = (u: UserProfile) => {
  StorageService.saveUserProfile(u);
  // مزامنة العناصر المجهزة مع السيرفر ليشوفها الخصوم
  void SocialService.publishOwnProfile(u);
  return u;
};

export class MarketService {
  public static purchaseItem(user: UserProfile, itemId: string): Res {
    const item = getMarketItem(itemId);
    if (!item) return { success: false, message: 'العنصر ده مش موجود في السوق.' };
    const inventory = user.inventory || [];
    if (inventory.includes(itemId)) return { success: false, message: 'العنصر ده عندك بالفعل.' };
    if (user.coins < item.price) {
      return { success: false, message: `رصيدك مش مكفي — محتاج ${item.price.toLocaleString('ar-EG')} كوين.` };
    }
    const updatedUser = save({ ...user, coins: user.coins - item.price, inventory: [...inventory, itemId] });
    return { success: true, message: `اشتريت «${item.nameAr}» بنجاح!`, updatedUser };
  }

  public static equipItem(user: UserProfile, itemId: string): Res {
    const item = getMarketItem(itemId);
    if (!item) return { success: false, message: 'العنصر ده مش موجود.' };
    if (!(user.inventory || []).includes(itemId)) return { success: false, message: 'اشتري العنصر الأول عشان تلبسه.' };
    const equipped: EquippedCosmetics = { ...(user.equippedCosmetics || {}), [EQUIP_KEY[item.category]]: itemId };
    const updatedUser = save({ ...user, equippedCosmetics: equipped });
    return { success: true, message: `لبست «${item.nameAr}».`, updatedUser };
  }

  public static unequipCategory(user: UserProfile, category: MarketCategory): Res {
    const equipped: EquippedCosmetics = { ...(user.equippedCosmetics || {}) };
    delete equipped[EQUIP_KEY[category]];
    const updatedUser = save({ ...user, equippedCosmetics: equipped });
    return { success: true, message: 'اتشال العنصر.', updatedUser };
  }
}
