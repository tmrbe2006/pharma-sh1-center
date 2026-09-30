// High-fidelity database fallback module supporting both LocalStorage simulation and Firebase integration
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConnected } from '../firebase';

export interface Medicine {
  id: string;
  commercialName: string; // الاسم التجاري العام (للتوافق)
  commercialNameAr?: string; // الاسم التجاري باللغة العربية
  commercialNameEn?: string; // الاسم التجاري باللغة الإنجليزية
  scientificName: string; // الاسم العلمي
  quantity: number; // الكمية المتوفرة
  entryDate?: string; // تاريخ إدخال الدواء
  expiryDate: string; // تاريخ انتهاء الصلاحية
  price: number; // السعر
  unit: 'علبة' | 'شريط' | 'حبة' | string; // الوحدة
  category: string; // الفئة العلاجية
  createdAt: string;
  updatedAt: string;
  manufacturer?: string; // الشركة المصنعة
  alternatives?: string; // البدائل المتاحة
}

export interface DispenseRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  residentName: string; // اسم المقيم المعاق المستفيد
  quantityDispensed: number; // الكمية المطلوبة
  unit: string;
  totalPrice: number;
  actualQuantityDispensed: number; // الكمية المصروفة فعلياً للمراجعة
  dispensedBy: string; // اسم الصيدلي الصارف
  dispensedById: string;
  dispensedAt: string; // تاريخ الصرف
}

export interface UserSession {
  id: string;
  userId: string;
  name: string;
  email: string;
  ipAddress: string;
  deviceToken: string;
  loginTime: string;
}

export interface StockAuditLog {
  id: string;
  medicineId: string;
  medicineName: string;
  actionType: 'إضافة دواء جديد' | 'تحديث كمية' | 'تعديل يدوي' | 'حذف دواء' | 'صرف دواء لمقيم';
  quantityChanged: number;
  previousQuantity: number;
  newQuantity: number;
  performedByName: string;
  performedByEmail: string;
  performedById: string;
  notes: string;
  timestamp: string;
}

// Initial realistic Arabic medicine inventory for a disability care center
const INITIAL_MEDICINES: Medicine[] = [
  {
    id: "med-1",
    commercialName: "بنادول اكسترا",
    commercialNameAr: "بنادول اكسترا",
    commercialNameEn: "Panadol Extra",
    scientificName: "Paracetamol + Caffeine",
    quantity: 120,
    entryDate: "2026-09-20",
    expiryDate: "2026-10-15", // Expiring soon in ~20 days from current date (2026-09-23)
    price: 15.5,
    unit: "علبة",
    category: "مسكنات وآلام",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة الخليج للصناعات الدوائية (جلفار)",
    alternatives: "فيفادول بلس، أدول، باراسيتامول"
  },
  {
    id: "med-2",
    commercialName: "أوجمنتين 1 جم",
    commercialNameAr: "أوجمنتين 1 جم",
    commercialNameEn: "Augmentin 1g",
    scientificName: "Amoxicillin + Clavulanic Acid",
    quantity: 45,
    entryDate: "2026-09-18",
    expiryDate: "2026-10-05", // Expiring very soon! ~12 days
    price: 85.0,
    unit: "علبة",
    category: "مضادات حيوية",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة نوفارتس العالمية (Novartis)",
    alternatives: "كلافوكس، أموكسيلان، جلمنتين"
  },
  {
    id: "med-3",
    commercialName: "بروفين 400 ملجم",
    commercialNameAr: "بروفين 400 ملجم",
    commercialNameEn: "Brufen 400mg",
    scientificName: "Ibuprofen",
    quantity: 80,
    entryDate: "2026-09-15",
    expiryDate: "2027-05-20",
    price: 18.0,
    unit: "شريط",
    category: "مضادات الالتهاب",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "الشركة السعودية للصناعات الدوائية (سبيماكو الدوائية)",
    alternatives: "سابوفين، روفيناك، إيبوبروفين"
  },
  {
    id: "med-4",
    commercialName: "فنتولين بخاخ",
    commercialNameAr: "فنتولين بخاخ",
    commercialNameEn: "Ventolin Inhaler",
    scientificName: "Salbutamol Inhaler",
    quantity: 15,
    entryDate: "2026-09-10",
    expiryDate: "2026-11-30", // Near expiry ~2 months
    price: 24.5,
    unit: "علبة",
    category: "الجهاز التنفسي والأزمات",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة الخليج للصناعات الدوائية (جلفار)",
    alternatives: "بيوتالين بخاخ، سالبوتامول"
  },
  {
    id: "med-5",
    commercialName: "ديباكين كرونو 500 ملجم",
    commercialNameAr: "ديباكين كرونو 500 ملجم",
    commercialNameEn: "Depakine Chrono 500mg",
    scientificName: "Sodium Valproate",
    quantity: 60,
    entryDate: "2026-09-12",
    expiryDate: "2027-08-12",
    price: 110.0,
    unit: "علبة",
    category: "مضادات الصرع والتشنج",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "الشركة السعودية للصناعات الدوائية (سبيماكو الدوائية)",
    alternatives: "فالبروات الصوديوم، كونفولكس"
  },
  {
    id: "med-6",
    commercialName: "لوراتادين 10 ملجم",
    commercialNameAr: "لوراتادين 10 ملجم",
    commercialNameEn: "Loratadine 10mg",
    scientificName: "Loratadine",
    quantity: 200,
    entryDate: "2026-09-22",
    expiryDate: "2026-10-22", // Expiring soon! ~30 days
    price: 12.0,
    unit: "حبة",
    category: "الحساسية ومضادات الهستامين",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة الخليج للصناعات الدوائية (جلفار)",
    alternatives: "كلاريتين، إيريوس، لورا"
  },
  {
    id: "med-7",
    commercialName: "ريسبيردال 2 ملجم",
    commercialNameAr: "ريسبيردال 2 ملجم",
    commercialNameEn: "Risperdal 2mg",
    scientificName: "Risperidone",
    quantity: 35,
    entryDate: "2026-09-14",
    expiryDate: "2027-12-01",
    price: 150.0,
    unit: "علبة",
    category: "الرعاية النفسية والسلوكية",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة نوفارتس العالمية (Novartis)",
    alternatives: "ريسبيدال، ريسبون، ريسبردون"
  }
];

const INITIAL_DISPENSES: DispenseRecord[] = [
  {
    id: "disp-1",
    medicineId: "med-1",
    medicineName: "بنادول اكسترا",
    residentName: "أحمد عبد الله المري",
    quantityDispensed: 2,
    unit: "علبة",
    totalPrice: 31.0,
    actualQuantityDispensed: 2,
    dispensedBy: "د. تامر مدبولي عبدالمجيد",
    dispensedById: "user-z37l0cclb",
    dispensedAt: "2026-09-22T10:30:00.000Z"
  },
  {
    id: "disp-2",
    medicineId: "med-5",
    medicineName: "ديباكين كرونو 500 ملجم",
    residentName: "سارة محمد العتيبي",
    quantityDispensed: 1,
    unit: "علبة",
    totalPrice: 110.0,
    actualQuantityDispensed: 1,
    dispensedBy: "د. تامر مدبولي عبدالمجيد",
    dispensedById: "user-z37l0cclb",
    dispensedAt: "2026-09-23T08:15:00.000Z"
  }
];

export const getLocalMedicines = (): Medicine[] => {
  const data = localStorage.getItem('care_pharmacy_medicines');
  if (!data) {
    localStorage.setItem('care_pharmacy_medicines', JSON.stringify(INITIAL_MEDICINES));
    return INITIAL_MEDICINES;
  }
  try {
    const list: Medicine[] = JSON.parse(data);
    let changed = false;
    const migrated = list.map(m => {
      // Find matching default if available for english name
      const foundInitial = INITIAL_MEDICINES.find(init => init.id === m.id || init.commercialName === m.commercialName);
      const commercialAr = m.commercialNameAr || (foundInitial ? foundInitial.commercialNameAr : m.commercialName);
      const commercialEn = m.commercialNameEn || (foundInitial ? foundInitial.commercialNameEn : '');
      const entryDate = m.entryDate || (foundInitial ? foundInitial.entryDate : (m.createdAt ? m.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]));
      if (!m.commercialNameAr || !m.commercialNameEn || !m.entryDate) {
        changed = true;
      }
      return {
        ...m,
        commercialName: commercialAr || m.commercialName,
        commercialNameAr: commercialAr || m.commercialName,
        commercialNameEn: commercialEn || m.commercialNameEn || '',
        entryDate
      };
    });
    if (changed) {
      localStorage.setItem('care_pharmacy_medicines', JSON.stringify(migrated));
    }
    return migrated;
  } catch (e) {
    return INITIAL_MEDICINES;
  }
};

export const saveLocalMedicines = (medicines: Medicine[]) => {
  localStorage.setItem('care_pharmacy_medicines', JSON.stringify(medicines));
};

export const getLocalDispenses = (): DispenseRecord[] => {
  const data = localStorage.getItem('care_pharmacy_dispenses');
  if (!data) {
    localStorage.setItem('care_pharmacy_dispenses', JSON.stringify(INITIAL_DISPENSES));
    return INITIAL_DISPENSES;
  }
  return JSON.parse(data);
};

export const saveLocalDispenses = (dispenses: DispenseRecord[]) => {
  localStorage.setItem('care_pharmacy_dispenses', JSON.stringify(dispenses));
};

export const getLocalSessions = (): UserSession[] => {
  const data = localStorage.getItem('care_pharmacy_sessions');
  return data ? JSON.parse(data) : [];
};

export const saveLocalSessions = (sessions: UserSession[]) => {
  localStorage.setItem('care_pharmacy_sessions', JSON.stringify(sessions));
};

const INITIAL_STOCK_LOGS: StockAuditLog[] = [
  {
    id: "log-1",
    medicineId: "med-1",
    medicineName: "بنادول اكسترا (Paracetamol + Caffeine)",
    actionType: "إضافة دواء جديد",
    quantityChanged: 122,
    previousQuantity: 0,
    newQuantity: 122,
    performedByName: "د. تامر مدبولي عبدالمجيد",
    performedByEmail: "tmrbe2006@gmail.com",
    performedById: "user-z37l0cclb",
    notes: "رصيد افتتاح لتهيئة مخزن الصيدلية",
    timestamp: "2026-09-20T08:00:00.000Z"
  },
  {
    id: "log-2",
    medicineId: "med-1",
    medicineName: "بنادول اكسترا (Paracetamol + Caffeine)",
    actionType: "صرف دواء لمقيم",
    quantityChanged: -2,
    previousQuantity: 122,
    newQuantity: 120,
    performedByName: "د. تامر مدبولي عبدالمجيد",
    performedByEmail: "tmrbe2006@gmail.com",
    performedById: "user-z37l0cclb",
    notes: "صرف علاج مجدول للمقيم: أحمد عبد الله المري",
    timestamp: "2026-09-22T10:30:00.000Z"
  },
  {
    id: "log-3",
    medicineId: "med-5",
    medicineName: "ديباكين كرونو 500 ملجم (Sodium Valproate)",
    actionType: "إضافة دواء جديد",
    quantityChanged: 61,
    previousQuantity: 0,
    newQuantity: 61,
    performedByName: "د. تامر مدبولي عبدالمجيد",
    performedByEmail: "tmrbe2006@gmail.com",
    performedById: "user-z37l0cclb",
    notes: "تغذية أصلية لمخزن أدوية الصرع والتشنجات",
    timestamp: "2026-09-20T08:15:00.000Z"
  },
  {
    id: "log-4",
    medicineId: "med-5",
    medicineName: "ديباكين كرونو 500 ملجم (Sodium Valproate)",
    actionType: "صرف دواء لمقيم",
    quantityChanged: -1,
    previousQuantity: 61,
    newQuantity: 60,
    performedByName: "د. تامر مدبولي عبدالمجيد",
    performedByEmail: "tmrbe2006@gmail.com",
    performedById: "user-z37l0cclb",
    notes: "صرف علاج مجدول للمقيم: سارة محمد العتيبي",
    timestamp: "2026-09-23T08:15:00.000Z"
  }
];

export const getLocalStockLogs = (): StockAuditLog[] => {
  const data = localStorage.getItem('care_pharmacy_stock_logs');
  if (!data) {
    localStorage.setItem('care_pharmacy_stock_logs', JSON.stringify(INITIAL_STOCK_LOGS));
    return INITIAL_STOCK_LOGS;
  }
  return JSON.parse(data);
};

export const saveLocalStockLogs = (logs: StockAuditLog[]) => {
  localStorage.setItem('care_pharmacy_stock_logs', JSON.stringify(logs));
};

export const DEFAULT_USERS = [
  {
    uid: "user-z37l0cclb",
    name: "د.تامر مدبولي عبدالمجيد",
    email: "tmrbe2006@gmail.com",
    username: "admin",
    role: "admin",
    phone: "201111256095",
    password: "123"
  },
  {
    uid: "user-1z7ijomon",
    name: "د.خالد العتيبي",
    email: "rooq113@gmail.com",
    username: "khaled",
    role: "admin",
    phone: "+966504471644",
    password: "123"
  },
  {
    uid: "user-364cpb7p6",
    name: "محمد ضويحي",
    email: "hloe4444@hotmail.com",
    username: "pharm",
    role: "pharmacist",
    phone: "966554010112",
    password: "123"
  },
  {
    uid: "user-mizuacmz8",
    name: "محمد مكرم رئيس التمريض",
    email: "abo.anas151533@gmail.com",
    username: "makram",
    role: "admin",
    phone: "966533630646",
    password: "123"
  },
  {
    uid: "user-qu1htu6y7",
    name: "د.عبد الرحيم محمد محجوب",
    email: "abdelrahim.mahjob@gmail.com",
    username: "mahjob",
    role: "admin",
    phone: "966502792157",
    password: "123"
  },
  {
    uid: "user-r4rpejuw9",
    name: "د.ابراهيم غانم",
    email: "Optic1980@gmail.com",
    username: "ghanem",
    role: "admin",
    phone: "966535866237",
    password: "123"
  }
];

// Unified CRUD Service with Firebase support and clean LocalStorage fallback
export const DbService = {
  // --- Medicines CRUD ---
  async fetchMedicines(): Promise<Medicine[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "medicines"));
        const list: Medicine[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Medicine);
        });
        
        if (list.length > 0) {
          // Sync with local storage
          saveLocalMedicines(list);
          return list;
        } else {
          // Firestore is completely empty! Let's seed it with INITIAL_MEDICINES so it has initial realistic Arabic items
          console.log("Firestore medicines collection is empty. Seeding INITIAL_MEDICINES...");
          for (const med of INITIAL_MEDICINES) {
            await setDoc(doc(db, "medicines", med.id), {
              commercialName: med.commercialName,
              commercialNameAr: med.commercialNameAr || med.commercialName,
              commercialNameEn: med.commercialNameEn || '',
              scientificName: med.scientificName,
              quantity: med.quantity,
              expiryDate: med.expiryDate,
              price: med.price,
              unit: med.unit,
              category: med.category || "عام",
              createdAt: med.createdAt,
              updatedAt: med.updatedAt,
              manufacturer: med.manufacturer || '',
              alternatives: med.alternatives || ''
            });
          }
          saveLocalMedicines(INITIAL_MEDICINES);
          return INITIAL_MEDICINES;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchMedicines failed, returning offline cache:", e);
    }
    return getLocalMedicines();
  },

  async addMedicine(med: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>, actor?: { name: string; email: string; id: string; notes?: string }): Promise<Medicine> {
    const commercialAr = (med.commercialNameAr || med.commercialName || '').trim();
    const commercialEn = (med.commercialNameEn || '').trim();
    const primaryName = commercialAr || commercialEn || med.commercialName || '';
    const entryDate = med.entryDate || new Date().toISOString().split('T')[0];

    const newMed: Medicine = {
      ...med,
      id: "med-" + Math.random().toString(36).substr(2, 9),
      commercialName: primaryName,
      commercialNameAr: commercialAr || primaryName,
      commercialNameEn: commercialEn,
      entryDate: entryDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Attempt Firebase write
    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "medicines", newMed.id), {
          commercialName: newMed.commercialName,
          commercialNameAr: newMed.commercialNameAr,
          commercialNameEn: newMed.commercialNameEn,
          scientificName: newMed.scientificName,
          quantity: newMed.quantity,
          entryDate: newMed.entryDate,
          expiryDate: newMed.expiryDate,
          price: newMed.price,
          unit: newMed.unit,
          category: newMed.category || "عام",
          createdAt: newMed.createdAt,
          updatedAt: newMed.updatedAt,
          manufacturer: newMed.manufacturer || '',
          alternatives: newMed.alternatives || ''
        });
      }
    } catch (e) {
      console.warn("Firestore addMedicine failed, falling back to LocalStorage:", e);
    }

    // Always keep LocalStorage in sync
    const list = getLocalMedicines();
    list.unshift(newMed);
    saveLocalMedicines(list);

    // Create Audit Log
    const displayMedName = newMed.commercialNameEn 
      ? `${newMed.commercialName} / ${newMed.commercialNameEn} (${newMed.scientificName})`
      : `${newMed.commercialName} (${newMed.scientificName})`;

    await this.addStockLog({
      medicineId: newMed.id,
      medicineName: displayMedName,
      actionType: 'إضافة دواء جديد',
      quantityChanged: newMed.quantity,
      previousQuantity: 0,
      newQuantity: newMed.quantity,
      performedByName: actor?.name || "د. تامر مدبولي عبدالمجيد",
      performedByEmail: actor?.email || "tmrbe2006@gmail.com",
      performedById: actor?.id || "user-z37l0cclb",
      notes: actor?.notes || "إدخال صنف دواء جديد للمخزن"
    });

    return newMed;
  },

  async updateMedicine(id: string, updatedFields: Partial<Medicine>, actor?: { name: string; email: string; id: string; notes?: string }): Promise<Medicine> {
    const list = getLocalMedicines();
    const index = list.findIndex(m => m.id === id);
    if (index === -1) throw new Error("الدواء غير موجود");

    const previousQuantity = list[index].quantity;
    const commercialAr = updatedFields.commercialNameAr !== undefined 
      ? updatedFields.commercialNameAr 
      : (updatedFields.commercialName || list[index].commercialNameAr || list[index].commercialName);
    const commercialEn = updatedFields.commercialNameEn !== undefined
      ? updatedFields.commercialNameEn
      : (list[index].commercialNameEn || '');
    const primaryName = commercialAr || updatedFields.commercialName || list[index].commercialName;

    const updatedMed: Medicine = {
      ...list[index],
      ...updatedFields,
      commercialName: primaryName,
      commercialNameAr: commercialAr,
      commercialNameEn: commercialEn,
      entryDate: updatedFields.entryDate || list[index].entryDate || (list[index].createdAt ? list[index].createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      updatedAt: new Date().toISOString()
    };

    // Attempt Firebase write
    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "medicines", id), {
          commercialName: updatedMed.commercialName,
          commercialNameAr: updatedMed.commercialNameAr || '',
          commercialNameEn: updatedMed.commercialNameEn || '',
          scientificName: updatedMed.scientificName,
          quantity: updatedMed.quantity,
          entryDate: updatedMed.entryDate || '',
          expiryDate: updatedMed.expiryDate,
          price: updatedMed.price,
          unit: updatedMed.unit,
          category: updatedMed.category || "عام",
          createdAt: updatedMed.createdAt,
          updatedAt: updatedMed.updatedAt,
          manufacturer: updatedMed.manufacturer || '',
          alternatives: updatedMed.alternatives || ''
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Firestore updateMedicine failed, falling back to LocalStorage:", e);
    }

    list[index] = updatedMed;
    saveLocalMedicines(list);

    // Log quantity change if any
    const quantityDifference = updatedMed.quantity - previousQuantity;
    if (quantityDifference !== 0) {
      await this.addStockLog({
        medicineId: updatedMed.id,
        medicineName: `${updatedMed.commercialName} (${updatedMed.scientificName})`,
        actionType: 'تعديل يدوي',
        quantityChanged: quantityDifference,
        previousQuantity,
        newQuantity: updatedMed.quantity,
        performedByName: actor?.name || "د. تامر مدبولي عبدالمجيد",
        performedByEmail: actor?.email || "tmrbe2006@gmail.com",
        performedById: actor?.id || "user-z37l0cclb",
        notes: actor?.notes || "تعديل كمية المخزون يدوياً"
      });
    } else if (actor?.notes) {
      await this.addStockLog({
        medicineId: updatedMed.id,
        medicineName: `${updatedMed.commercialName} (${updatedMed.scientificName})`,
        actionType: 'تعديل يدوي',
        quantityChanged: 0,
        previousQuantity,
        newQuantity: updatedMed.quantity,
        performedByName: actor?.name || "د. تامر مدبولي عبدالمجيد",
        performedByEmail: actor?.email || "tmrbe2006@gmail.com",
        performedById: actor?.id || "user-z37l0cclb",
        notes: actor.notes
      });
    }

    return updatedMed;
  },

  async deleteMedicine(id: string, actor?: { name: string; email: string; id: string; notes?: string }): Promise<boolean> {
    const list = getLocalMedicines();
    const targetMed = list.find(m => m.id === id);

    // Attempt Firebase delete
    try {
      if (isFirebaseConnected) {
        await deleteDoc(doc(db, "medicines", id));
      }
    } catch (e) {
      console.warn("Firestore deleteMedicine failed, falling back to LocalStorage:", e);
    }

    const filtered = list.filter(m => m.id !== id);
    saveLocalMedicines(filtered);

    if (targetMed) {
      // Create Audit Log
      await this.addStockLog({
        medicineId: targetMed.id,
        medicineName: `${targetMed.commercialName} (${targetMed.scientificName})`,
        actionType: 'حذف دواء',
        quantityChanged: -targetMed.quantity,
        previousQuantity: targetMed.quantity,
        newQuantity: 0,
        performedByName: actor?.name || "د. تامر مدبولي عبدالمجيد",
        performedByEmail: actor?.email || "tmrbe2006@gmail.com",
        performedById: actor?.id || "user-z37l0cclb",
        notes: actor?.notes || "شطب الصنف نهائياً وحذفه من السجلات"
      });
    }

    return true;
  },

  async renameCategory(oldCategory: string, newCategory: string): Promise<void> {
    const list = getLocalMedicines();
    let hasChanged = false;
    const updatedList = list.map(m => {
      if (m.category === oldCategory) {
        hasChanged = true;
        return {
          ...m,
          category: newCategory,
          updatedAt: new Date().toISOString()
        };
      }
      return m;
    });

    if (hasChanged) {
      saveLocalMedicines(updatedList);
    }

    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "medicines"));
        const updatePromises: Promise<any>[] = [];
        querySnapshot.forEach((d) => {
          const data = d.data();
          if (data.category === oldCategory) {
            updatePromises.push(
              updateDoc(doc(db, "medicines", d.id), {
                category: newCategory,
                updatedAt: new Date().toISOString()
              })
            );
          }
        });
        await Promise.all(updatePromises);
      }
    } catch (e) {
      console.warn("Firestore renameCategory error:", e);
    }
  },

  // --- Dispense Records ---
  async fetchDispenseRecords(): Promise<DispenseRecord[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "dispense_records"));
        const list: DispenseRecord[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as DispenseRecord);
        });

        if (list.length > 0) {
          saveLocalDispenses(list);
          return list;
        } else {
          // Seed with initial realistic records if empty
          console.log("Firestore dispense_records is empty. Seeding INITIAL_DISPENSES...");
          for (const rec of INITIAL_DISPENSES) {
            await setDoc(doc(db, "dispense_records", rec.id), {
              medicineId: rec.medicineId,
              medicineName: rec.medicineName,
              residentName: rec.residentName,
              quantityDispensed: rec.quantityDispensed,
              unit: rec.unit,
              totalPrice: rec.totalPrice,
              actualQuantityDispensed: rec.actualQuantityDispensed,
              dispensedBy: rec.dispensedBy,
              dispensedById: rec.dispensedById,
              dispensedAt: rec.dispensedAt
            });
          }
          saveLocalDispenses(INITIAL_DISPENSES);
          return INITIAL_DISPENSES;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchDispenseRecords failed, returning offline cache:", e);
    }
    return getLocalDispenses();
  },

  async addDispenseRecord(rec: Omit<DispenseRecord, 'id' | 'dispensedAt'>): Promise<DispenseRecord> {
    const newRec: DispenseRecord = {
      ...rec,
      id: "disp-" + Math.random().toString(36).substr(2, 9),
      dispensedAt: new Date().toISOString()
    };

    // Subtract from inventory quantity automatically (inventory integrity!)
    const medList = getLocalMedicines();
    const medIndex = medList.findIndex(m => m.id === rec.medicineId);
    let previousQuantity = 0;
    let newQty = 0;
    let targetMed: Medicine | null = null;

    if (medIndex !== -1) {
      targetMed = medList[medIndex];
      previousQuantity = targetMed.quantity;
      // Safeguard quantity subtraction
      newQty = Math.max(0, previousQuantity - rec.actualQuantityDispensed);
      medList[medIndex].quantity = newQty;
      medList[medIndex].updatedAt = new Date().toISOString();
      saveLocalMedicines(medList);

      // Attempt syncing medicine reduction to Firebase
      try {
        if (isFirebaseConnected) {
          await setDoc(doc(db, "medicines", rec.medicineId), {
            quantity: newQty,
            updatedAt: medList[medIndex].updatedAt
          }, { merge: true });
        }
      } catch (e) {
        console.warn("Firestore inventory sync failed:", e);
      }
    }

    // Write dispense record to Firebase
    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "dispense_records", newRec.id), {
          medicineId: newRec.medicineId,
          medicineName: newRec.medicineName,
          residentName: newRec.residentName,
          quantityDispensed: newRec.quantityDispensed,
          unit: newRec.unit,
          totalPrice: newRec.totalPrice,
          actualQuantityDispensed: newRec.actualQuantityDispensed,
          dispensedBy: newRec.dispensedBy,
          dispensedById: newRec.dispensedById,
          dispensedAt: newRec.dispensedAt
        });
      }
    } catch (e) {
      console.warn("Firestore addDispenseRecord failed, falling back to LocalStorage:", e);
    }

    const list = getLocalDispenses();
    list.unshift(newRec);
    saveLocalDispenses(list);

    // Automatically record an Audit Log for the dispensing
    if (targetMed) {
      await this.addStockLog({
        medicineId: targetMed.id,
        medicineName: `${targetMed.commercialName} (${targetMed.scientificName})`,
        actionType: 'صرف دواء لمقيم',
        quantityChanged: -rec.actualQuantityDispensed,
        previousQuantity,
        newQuantity: newQty,
        performedByName: rec.dispensedBy,
        performedByEmail: "pharmacist@carecenter.com",
        performedById: rec.dispensedById,
        notes: `صرف علاج للمقيم: ${rec.residentName}`
      });
    }

    return newRec;
  },

  // --- Security Sessions CRUD ---
  async fetchSessions(): Promise<UserSession[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "user_sessions"));
        if (!querySnapshot.empty) {
          const list: UserSession[] = [];
          querySnapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as UserSession);
          });
          saveLocalSessions(list);
          return list;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchSessions failed, returning local storage:", e);
    }
    return getLocalSessions();
  },

  async logSession(session: Omit<UserSession, 'id'>): Promise<UserSession> {
    const newSession: UserSession = {
      ...session,
      id: "sess-" + Math.random().toString(36).substr(2, 9)
    };

    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "user_sessions", newSession.id), {
          userId: newSession.userId,
          name: newSession.name,
          email: newSession.email,
          ipAddress: newSession.ipAddress,
          deviceToken: newSession.deviceToken,
          loginTime: newSession.loginTime
        });
      }
    } catch (e) {
      console.warn("Firestore logSession failed, saving locally:", e);
    }

    const list = getLocalSessions();
    list.unshift(newSession);
    saveLocalSessions(list);
    return newSession;
  },

  // --- Stock Audit Logs CRUD ---
  async fetchStockLogs(): Promise<StockAuditLog[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "stock_audit_logs"));
        if (!querySnapshot.empty) {
          const list: StockAuditLog[] = [];
          querySnapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as StockAuditLog);
          });
          // Sort by timestamp descending
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          saveLocalStockLogs(list);
          return list;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchStockLogs failed, returning local storage:", e);
    }
    return getLocalStockLogs();
  },

  async addStockLog(log: Omit<StockAuditLog, 'id' | 'timestamp'>): Promise<StockAuditLog> {
    const newLog: StockAuditLog = {
      ...log,
      id: "log-" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };

    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "stock_audit_logs", newLog.id), {
          medicineId: newLog.medicineId,
          medicineName: newLog.medicineName,
          actionType: newLog.actionType,
          quantityChanged: newLog.quantityChanged,
          previousQuantity: newLog.previousQuantity,
          newQuantity: newLog.newQuantity,
          performedByName: newLog.performedByName,
          performedByEmail: newLog.performedByEmail,
          performedById: newLog.performedById,
          notes: newLog.notes,
          timestamp: newLog.timestamp
        });
      }
    } catch (e) {
      console.warn("Firestore addStockLog failed, saving locally:", e);
    }

    const list = getLocalStockLogs();
    list.unshift(newLog);
    saveLocalStockLogs(list);
    return newLog;
  },

  // --- Users CRUD ---
  async fetchUsers(): Promise<any[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "users"));
        if (!querySnapshot.empty) {
          const list: any[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            list.push({ 
              uid: doc.id, 
              ...data,
              // Fallback ensure password exists
              password: data.password || (data.role === 'admin' ? 'admin' : data.role === 'pharmacist' ? 'pharm' : data.role === 'technician' ? 'tech' : '123456')
            });
          });

          // Ensure default accounts are present if missing
          DEFAULT_USERS.forEach(defU => {
            if (!list.some(u => u.email?.toLowerCase() === defU.email.toLowerCase() || u.role === defU.role)) {
              list.push(defU);
            }
          });

          localStorage.setItem('care_pharmacy_all_users', JSON.stringify(list));
          return list;
        } else {
          // Seed initial users into Firestore
          for (const u of DEFAULT_USERS) {
            await setDoc(doc(db, "users", u.uid), {
              name: u.name,
              email: u.email,
              secondaryEmail: (u as any).secondaryEmail || '',
              username: (u as any).username || '',
              role: u.role,
              phone: u.phone,
              password: u.password
            });
          }
          localStorage.setItem('care_pharmacy_all_users', JSON.stringify(DEFAULT_USERS));
          return DEFAULT_USERS;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchUsers failed, returning local storage:", e);
    }
    
    const saved = localStorage.getItem('care_pharmacy_all_users');
    let parsed: any[] = saved ? JSON.parse(saved) : DEFAULT_USERS;
    parsed = parsed.map(u => ({
      ...u,
      password: u.password || (u.role === 'admin' ? 'admin' : u.role === 'pharmacist' ? 'pharm' : 'tech')
    }));
    DEFAULT_USERS.forEach(defU => {
      if (!parsed.some(u => u.email?.toLowerCase() === defU.email.toLowerCase() || u.role === defU.role)) {
        parsed.push(defU);
      }
    });
    return parsed;
  },

  async addUser(newUser: any): Promise<any> {
    const userWithId = {
      ...newUser,
      uid: newUser.uid || "user-" + Math.random().toString(36).substr(2, 9)
    };

    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "users", userWithId.uid), {
          name: userWithId.name,
          email: userWithId.email,
          role: userWithId.role,
          phone: userWithId.phone,
          password: userWithId.password
        });
      }
    } catch (e) {
      console.warn("Firestore addUser failed, saving locally:", e);
    }

    const saved = localStorage.getItem('care_pharmacy_all_users');
    const list = saved ? JSON.parse(saved) : [];
    list.push(userWithId);
    localStorage.setItem('care_pharmacy_all_users', JSON.stringify(list));
    return userWithId;
  },

  async updateUser(updatedUser: any): Promise<any> {
    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "users", updatedUser.uid), {
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          phone: updatedUser.phone,
          password: updatedUser.password
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Firestore updateUser failed, saving locally:", e);
    }

    const saved = localStorage.getItem('care_pharmacy_all_users');
    let list = saved ? JSON.parse(saved) : [];
    list = list.map((u: any) => u.uid === updatedUser.uid ? updatedUser : u);
    localStorage.setItem('care_pharmacy_all_users', JSON.stringify(list));
    return updatedUser;
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      if (isFirebaseConnected) {
        await deleteDoc(doc(db, "users", userId));
      }
    } catch (e) {
      console.warn("Firestore deleteUser failed, saving locally:", e);
    }

    const saved = localStorage.getItem('care_pharmacy_all_users');
    let list = saved ? JSON.parse(saved) : [];
    list = list.filter((u: any) => u.uid !== userId);
    localStorage.setItem('care_pharmacy_all_users', JSON.stringify(list));
  }
};
