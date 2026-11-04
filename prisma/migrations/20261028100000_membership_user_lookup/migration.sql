CREATE POLICY "membership_user_discovery"
ON "Membership"
FOR SELECT
USING (
  "userId" = current_setting('app.user_id', true)
);