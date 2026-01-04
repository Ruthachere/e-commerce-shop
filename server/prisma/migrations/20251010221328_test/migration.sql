-- DropForeignKey
ALTER TABLE "public"."Inventory" DROP CONSTRAINT "Inventory_variantId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
