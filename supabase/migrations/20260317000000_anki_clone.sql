-- Anki Clone: decks, cards, card_reviews

CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  front_media_url TEXT,
  back_media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
  interval INTEGER NOT NULL DEFAULT 0,       -- days until next review
  ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

-- Indexes
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_card_reviews_user_id ON card_reviews(user_id);
CREATE INDEX idx_card_reviews_due_date ON card_reviews(due_date);
CREATE INDEX idx_card_reviews_card_id ON card_reviews(card_id);

-- RLS
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own decks" ON decks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own cards" ON cards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own reviews" ON card_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Supabase Storage bucket for card media
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-media', 'card-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own card media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'card-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Card media is publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'card-media');

CREATE POLICY "Users delete own card media" ON storage.objects
  FOR DELETE USING (bucket_id = 'card-media' AND auth.uid()::text = (storage.foldername(name))[1]);
