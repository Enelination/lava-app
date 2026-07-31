export interface User {
  id: string
  name: string
  email: string
  password: string
  licence_number: string | null
  organisation: string | null
  role: 'public' | 'surveyor' | 'officer' | 'admin'
  created_at: string
}

export interface Submission {
  id: string
  property_type: string
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
  content: string
  type: 'builtin' | 'uploaded'
  word_count: number
  created_at: string
}

export interface Setting {
  key: string
  value: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface JwtPayload {
  userId: string
  role: string
}
