export interface Deck {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  // computed
  due_count?: number
  total_cards?: number
}

export interface Card {
  id: string
  deck_id: string
  user_id: string
  front: string
  back: string
  front_media_url: string | null
  back_media_url: string | null
  created_at: string
  updated_at: string
  // joined
  review?: CardReview
}

export interface CardReview {
  id: string
  card_id: string
  user_id: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  interval: number
  ease_factor: number
  due_date: string
  reps: number
  lapses: number
  last_reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface StudyCard extends Card {
  review: CardReview
}
