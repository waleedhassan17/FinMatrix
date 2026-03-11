// ═══════════════════════════════════════════════════════
// FinMatrix — Pre-seeded Warehouse Agencies + Inventory
// ═══════════════════════════════════════════════════════

export interface AgencyInventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  quantityOnHand: number;
  reorderLevel: number;
}

export interface WarehouseAgency {
  id: string;
  name: string;
  type: 'Manufacturing' | 'Supply' | 'Distribution';
  typeBadgeColor: string;
  description: string;
  productCount: number;
  city: string;
  province: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  inventory: AgencyInventoryItem[];
}

export const warehouseAgencies: WarehouseAgency[] = [
  {
    id: 'agency_dalda',
    name: 'Dalda Cooking Oil',
    type: 'Manufacturing',
    typeBadgeColor: '#2E75B6',
    description: 'Premium cooking oil manufacturing and distribution',
    productCount: 5,
    city: 'Karachi',
    province: 'Sindh',
    address: 'Plot 45, SITE Industrial Area, Karachi',
    contactPhone: '+92-21-3456-7890',
    contactEmail: 'supply@dalda.pk',
    inventory: [
      {
        id: 'dalda_001',
        sku: 'DLD-OIL-1L',
        name: 'Dalda Cooking Oil 1L',
        description: 'Premium fortified cooking oil, 1 litre bottle',
        category: 'Cooking Oil',
        unitOfMeasure: 'Bottle',
        costPrice: 380,
        sellingPrice: 450,
        quantityOnHand: 500,
        reorderLevel: 100,
      },
      {
        id: 'dalda_002',
        sku: 'DLD-OIL-5L',
        name: 'Dalda Cooking Oil 5L',
        description: 'Premium fortified cooking oil, 5 litre can',
        category: 'Cooking Oil',
        unitOfMeasure: 'Can',
        costPrice: 1750,
        sellingPrice: 2100,
        quantityOnHand: 200,
        reorderLevel: 50,
      },
      {
        id: 'dalda_003',
        sku: 'DLD-BAN-1KG',
        name: 'Dalda Banaspati Ghee 1kg',
        description: 'Vegetable ghee, 1kg pack',
        category: 'Ghee',
        unitOfMeasure: 'Pack',
        costPrice: 420,
        sellingPrice: 520,
        quantityOnHand: 350,
        reorderLevel: 80,
      },
      {
        id: 'dalda_004',
        sku: 'DLD-BAN-5KG',
        name: 'Dalda Banaspati Ghee 5kg',
        description: 'Vegetable ghee, 5kg tin',
        category: 'Ghee',
        unitOfMeasure: 'Tin',
        costPrice: 1950,
        sellingPrice: 2400,
        quantityOnHand: 150,
        reorderLevel: 40,
      },
      {
        id: 'dalda_005',
        sku: 'DLD-OLV-500M',
        name: 'Dalda Olive Oil 500ml',
        description: 'Extra virgin olive oil, 500ml bottle',
        category: 'Olive Oil',
        unitOfMeasure: 'Bottle',
        costPrice: 850,
        sellingPrice: 1100,
        quantityOnHand: 120,
        reorderLevel: 30,
      },
    ],
  },
  {
    id: 'agency_aquapure',
    name: 'AquaPure Water Supply',
    type: 'Supply',
    typeBadgeColor: '#27AE60',
    description: 'Mineral water bottles and dispensers supply chain',
    productCount: 5,
    city: 'Lahore',
    province: 'Punjab',
    address: '23-B Industrial Estate, Kot Lakhpat, Lahore',
    contactPhone: '+92-42-3567-8901',
    contactEmail: 'orders@aquapure.pk',
    inventory: [
      {
        id: 'aqua_001',
        sku: 'AQP-500ML',
        name: 'AquaPure Water 500ml',
        description: 'Mineral water bottle, 500ml',
        category: 'Bottled Water',
        unitOfMeasure: 'Bottle',
        costPrice: 25,
        sellingPrice: 40,
        quantityOnHand: 2000,
        reorderLevel: 500,
      },
      {
        id: 'aqua_002',
        sku: 'AQP-1500ML',
        name: 'AquaPure Water 1.5L',
        description: 'Mineral water bottle, 1.5 litres',
        category: 'Bottled Water',
        unitOfMeasure: 'Bottle',
        costPrice: 45,
        sellingPrice: 70,
        quantityOnHand: 1200,
        reorderLevel: 300,
      },
      {
        id: 'aqua_003',
        sku: 'AQP-19L',
        name: 'AquaPure Dispenser Bottle 19L',
        description: 'Large dispenser refill bottle, 19 litres',
        category: 'Dispenser',
        unitOfMeasure: 'Bottle',
        costPrice: 100,
        sellingPrice: 160,
        quantityOnHand: 400,
        reorderLevel: 100,
      },
      {
        id: 'aqua_004',
        sku: 'AQP-DISP-HOT',
        name: 'AquaPure Hot & Cold Dispenser',
        description: 'Floor-standing hot & cold water dispenser unit',
        category: 'Dispenser',
        unitOfMeasure: 'Unit',
        costPrice: 8500,
        sellingPrice: 12000,
        quantityOnHand: 50,
        reorderLevel: 10,
      },
      {
        id: 'aqua_005',
        sku: 'AQP-CASE-24',
        name: 'AquaPure Water Case (24x500ml)',
        description: 'Case of 24 bottles, 500ml each',
        category: 'Bottled Water',
        unitOfMeasure: 'Case',
        costPrice: 550,
        sellingPrice: 800,
        quantityOnHand: 300,
        reorderLevel: 75,
      },
    ],
  },
  {
    id: 'agency_sparkclean',
    name: 'SparkClean Detergents',
    type: 'Distribution',
    typeBadgeColor: '#8E44AD',
    description: 'Household cleaning products and detergents',
    productCount: 5,
    city: 'Faisalabad',
    province: 'Punjab',
    address: '78-C, Sargodha Road Industrial Zone, Faisalabad',
    contactPhone: '+92-41-2678-9012',
    contactEmail: 'sales@sparkclean.pk',
    inventory: [
      {
        id: 'spark_001',
        sku: 'SC-DET-1KG',
        name: 'SparkClean Detergent Powder 1kg',
        description: 'Washing powder with active enzymes, 1kg pack',
        category: 'Detergent',
        unitOfMeasure: 'Pack',
        costPrice: 180,
        sellingPrice: 250,
        quantityOnHand: 800,
        reorderLevel: 200,
      },
      {
        id: 'spark_002',
        sku: 'SC-DET-5KG',
        name: 'SparkClean Detergent Powder 5kg',
        description: 'Bulk washing powder, 5kg bag',
        category: 'Detergent',
        unitOfMeasure: 'Bag',
        costPrice: 800,
        sellingPrice: 1100,
        quantityOnHand: 300,
        reorderLevel: 80,
      },
      {
        id: 'spark_003',
        sku: 'SC-LIQ-1L',
        name: 'SparkClean Liquid Detergent 1L',
        description: 'Concentrated liquid wash, 1 litre bottle',
        category: 'Liquid Detergent',
        unitOfMeasure: 'Bottle',
        costPrice: 280,
        sellingPrice: 380,
        quantityOnHand: 600,
        reorderLevel: 150,
      },
      {
        id: 'spark_004',
        sku: 'SC-DISH-500M',
        name: 'SparkClean Dishwash Liquid 500ml',
        description: 'Lemon-fresh dishwashing liquid, 500ml',
        category: 'Dishwash',
        unitOfMeasure: 'Bottle',
        costPrice: 120,
        sellingPrice: 175,
        quantityOnHand: 900,
        reorderLevel: 250,
      },
      {
        id: 'spark_005',
        sku: 'SC-FLOOR-1L',
        name: 'SparkClean Floor Cleaner 1L',
        description: 'Pine-scented floor cleaner, 1 litre',
        category: 'Floor Cleaner',
        unitOfMeasure: 'Bottle',
        costPrice: 150,
        sellingPrice: 220,
        quantityOnHand: 450,
        reorderLevel: 120,
      },
    ],
  },
];
