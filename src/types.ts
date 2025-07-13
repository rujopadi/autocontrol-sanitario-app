// --- INTERFACES ---
export interface EstablishmentInfo {
    name: string; address: string; city: string; postalCode: string; sanitaryRegistry: string;
}
export interface User {
  id: string; // Mongo usa strings para los IDs
  name: string; email: string; password?: string; 
  isAdmin?: boolean;
}
export interface Supplier {
  id: string; name: string;
}
export interface ProductType {
  id: string; name: string; optimalTemp: number;
}
export interface DeliveryRecord {
  id: string; // Mongo usa strings para los IDs
  supplierId: string; productTypeId: string; temperature: string; receptionDate: string; docsOk: boolean; userId: string; albaranImage?: string;
}
export interface StorageUnit { id: string; name: string; type: 'Cámara Frigorífica' | 'Cámara Expositora' | 'Cámara de secado'; minTemp?: number; maxTemp?: number; }
export interface StorageRecord { id: string; unitId: string; dateTime: string; temperature: string; humidity?: string; rotationCheck: boolean; mincingCheck: boolean; userId: string; }
export interface DailySurface { id: string; name: string; }
export interface DailyCleaningRecord { id: string; surfaceId: string; dateTime: string; userId: string; }
export interface FrequentArea { id: string; name: string; frequencyDays: number; lastCleaned: string | null; }
export interface CostingPart { id: string; name: string; weight: number; saleType: 'weight' | 'unit'; quantity?: number; }
export interface Costing { id: string; productName: string; totalWeight: number; purchasePrice: number; parts: CostingPart[]; salePrices: { [partId: string]: string }; }
export interface OutgoingRecord { id: string; productName: string; quantity: string; lotIdentifier: string; destinationType: 'sucursal' | 'consumidor'; destination: string; date: string; userId: string; }
export interface ElaboratedRecord { id: string; productName: string; elaborationDate: string; productLot: string; ingredients: { name: string; supplier: string; lot: string; quantity: string; }[]; destination: string; quantitySent: string; userId: string; }
export interface TechnicalSheet { id: string; productName: string; ingredients: Omit<Ingredient, 'id'>[]; elaboration: string; presentation: string; shelfLife: string; labeling: string; }
export interface Ingredient { id: string; name: string; lot: string; isAllergen: boolean; }
