export type PropertyStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'rented'
  | 'sold';

export interface PropertyImage {
  id: number;
  url: string;
}

export interface Property {
  id: number;
  code?: string | null;
  title: string;
  description?: string | null;
  type: string;
  purpose?: string | null;
  status: PropertyStatus;
  price: number;
  address?: string | null;
  quadra?: string | null;
  lote?: string | null;
  numero?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  tipo_lote?: string | null;
  city?: string | null;
  state?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_construida?: number | null;
  area_terreno?: number | null;
  garage_spots?: number | null;
  has_wifi?: boolean;
  tem_piscina?: boolean;
  tem_energia_solar?: boolean;
  tem_automacao?: boolean;
  tem_ar_condicionado?: boolean;
  eh_mobiliada?: boolean;
  valor_condominio?: number | null;
  valor_iptu?: number | null;
  video_url?: string | null;
  sale_value?: number | null;
  commission_value?: number | null;
  commission_rate?: number | null;
  broker_id?: number | null;
  broker_name?: string | null;
  broker_phone?: string | null;
  created_at?: string;
  updated_at?: string;
  images?: PropertyImage[];
}

export interface Agency {
  id?: number | null;
  name?: string | null;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface BrokerDocuments {
  creci_front_url?: string | null;
  creci_back_url?: string | null;
  selfie_url?: string | null;
}

export interface Broker {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  creci: string;
  status: 'pending_verification' | 'approved' | 'rejected';
  created_at: string;
  property_count?: number;
  agency?: Agency | null;
  documents?: BrokerDocuments;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface Notification {
  id: number;
  message: string;
  related_entity_type: 'property' | 'broker' | 'other';
  related_entity_id: number | null;
  recipient_id?: number | null;
  is_read: boolean | 0 | 1;
  created_at: string;
}

export type View =
  | 'dashboard'
  | 'properties'
  | 'property_requests'
  | 'brokers'
  | 'broker_requests'
  | 'clients'
  | 'verification'
  | 'notifications';

export type DataItem = Property | Broker | User;

export interface ViewConfig {
  title: string;
  endpoint?: string;
  headers?: string[];
  filterOptions?: { value: string; label: string }[];
  sortColumn?: string;
}
