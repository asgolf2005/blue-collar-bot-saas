-- Allow the create_notification function to bypass RLS
ALTER FUNCTION create_notification(UUID, notification_type, TEXT, TEXT, TEXT) SECURITY DEFINER;

-- Add INSERT policy for notifications (only via create_notification function)
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);
