-- Enhanced Notifications System
-- Adds notification preferences, additional notification types, and related fields

-- Add new notification types to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'schedule_changed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_assignment';

-- Add missing columns to notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS related_job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_business ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ===========================================================
-- TABLE: notification_preferences
-- User preferences for notification types
-- ===========================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- RLS Policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ===========================================================
-- FUNCTION: Get notification preference
-- ===========================================================
CREATE OR REPLACE FUNCTION get_notification_preference(
    p_user_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT enabled INTO v_enabled
    FROM notification_preferences
    WHERE user_id = p_user_id AND notification_type = p_notification_type;

    -- If no preference exists, default to enabled
    RETURN COALESCE(v_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================
-- FUNCTION: Enhanced create_notification with business_id
-- ===========================================================
CREATE OR REPLACE FUNCTION create_notification_enhanced(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_business_id UUID DEFAULT NULL,
    p_related_job_id UUID DEFAULT NULL,
    p_related_invoice_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_preference_enabled BOOLEAN;
BEGIN
    -- Check if user has this notification type enabled
    v_preference_enabled := get_notification_preference(p_user_id, p_type::TEXT);

    -- Only create notification if enabled in preferences
    IF v_preference_enabled THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            link,
            business_id,
            related_job_id,
            related_invoice_id
        ) VALUES (
            p_user_id,
            p_type,
            p_title,
            p_message,
            p_link,
            p_business_id,
            p_related_job_id,
            p_related_invoice_id
        )
        RETURNING id INTO v_notification_id;
    END IF;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================
-- FUNCTION: Mark notification as read
-- ===========================================================
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET read = true
    WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================
-- FUNCTION: Mark all notifications as read
-- ===========================================================
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET read = true
    WHERE user_id = auth.uid() AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================
-- FUNCTION: Delete old read notifications (cleanup)
-- ===========================================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS VOID AS $$
BEGIN
    DELETE FROM notifications
    WHERE read = true
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
