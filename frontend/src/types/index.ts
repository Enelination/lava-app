export interface User {
  id: string
  name: string
  email: string
  licence_number: string | null
  organisation: string | null
  role: 'public' | 'surveyor' | 'officer' | 'admin'
}

export interface Submission {
  id: string
  property_type: 'Land' | 'Developed'
  region: string
  district: string
  community: string
  gps_coordinates: string
  land_size: number | null
  unit: string
  land_use: string
  tenure_type: string
  description: string
  bedrooms: string | null
  bathrooms: string | null
  storeys: string | null
  floor_area: number | null
  building_age: number | null
  condition: string | null
  transaction_type: string
  price: number
  transaction_date: string | null
  source: string
  surveyor_name: string
  licence_number: string
  organisation: string
  email: string
  status: 'Pending' | 'Verified' | 'Flagged' | 'Rejected'
  trust_score: 'High' | 'Medium' | 'Low'
  submitted_at: string
  verified_at: string | null
  user_id: string
}

export interface KnowledgeDoc {
  id: string
  name: string
  type: 'builtin' | 'uploaded'
  word_count: number
  created_at: string
  content?: string
}

export interface DashboardStats {
  total: number
  verified: number
  pending: number
  flagged: number
  rejected: number
  regions: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export interface ContentBlock {
  type: 'text' | 'image' | 'document'
  text?: string
  title?: string
  source?: {
    type: string
    media_type: string
    data: string
  }
}

export interface PendingAttachment {
  type: 'image' | 'document'
  name: string
  data: string
  mediaType?: string
  preview?: string
  text?: string
  kind?: string
}

export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string | null
  message: string
  target_id: string | null
  read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_name: string | null
  action: string
  target_type: string
  target_id: string | null
  details: { oldStatus?: string; newStatus?: string; oldTrust?: string; newTrust?: string } | null
  created_at: string
}
