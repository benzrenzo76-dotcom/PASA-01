ALTER TABLE "BusinessMembership" ADD CONSTRAINT "membership_asset_same_business"
 FOREIGN KEY ("businessId", "assetId") REFERENCES "Asset" ("businessId", id) ON DELETE RESTRICT;
ALTER TABLE "Business" ADD CONSTRAINT "business_cancellation_valid" CHECK ("cancellationHours" BETWEEN 0 AND 168);
