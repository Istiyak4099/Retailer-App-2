export interface Retailer {
  uid: string; // Firebase Auth UID
  shop_owner_name: string;
  mobile_number: string;
  email_address: string; // from Google Sign-In
  shop_name: string;
  shop_address: string;
  code_balance?: number;
  key_balance?: number; // Noticed key_balance was in dashboard/balance page
  is_riba_free_compliant?: boolean;
  isOnboarded?: boolean;
}

export interface Customer {
  id: string;
  full_name: string;
  mobile_number: string;
  email_address: string;
  android_id?: string;
  address?: string;
  uid?: string; // Retailer's UID
  status: "active" | "locked" | "completed" | "pending" | "unlocked" | "removed";
  latitude?: number;
  longitude?: number;
  last_location_update?: any; // Firestore Timestamp
}

export interface EmiDetails {
  id: string;
  customerId: string;
  product_name: string;
  price: number;
  processing_fee: number;
  down_payment: number;
  total_emi: number;
  number_of_emi: number;
  emi_monthly_amount: number;
  installment_type: "Weekly" | "Monthly";
  date_of_next_payment?: any; // Firestore Timestamp
  nid_front: string; // URL
  nid_back: string; // URL
  live_photo: string; // URL
  created_time: Date;
  android_id?: string;
}
