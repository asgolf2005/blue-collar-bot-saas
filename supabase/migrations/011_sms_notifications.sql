-- Create SMS notifications table
CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  to_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  template_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'undelivered')),
  twilio_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_sms_notifications_business_id ON sms_notifications(business_id);
CREATE INDEX idx_sms_notifications_job_id ON sms_notifications(job_id);
CREATE INDEX idx_sms_notifications_customer_id ON sms_notifications(customer_id);
CREATE INDEX idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX idx_sms_notifications_created_at ON sms_notifications(created_at DESC);

-- Add RLS policies
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view all SMS notifications for their business
CREATE POLICY "Admins can view SMS notifications"
  ON sms_notifications
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses
      WHERE id IN (
        SELECT business_id FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- System can insert SMS notifications
CREATE POLICY "System can insert SMS notifications"
  ON sms_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  );

-- System can update SMS notification status
CREATE POLICY "System can update SMS notification status"
  ON sms_notifications
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Add SMS settings to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_notifications JSONB DEFAULT '{
  "jobScheduled": true,
  "technicianAssigned": true,
  "onTheWay": true,
  "arrived": true,
  "inProgress": false,
  "completed": true,
  "invoiceSent": true,
  "paymentReceived": true,
  "rescheduled": true,
  "cancelled": true,
  "reminderOneDayBefore": true,
  "reminderOneHourBefore": true
}'::jsonb;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS sms_notifications_updated_at ON sms_notifications;
CREATE TRIGGER sms_notifications_updated_at
  BEFORE UPDATE ON sms_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_notifications_updated_at();
