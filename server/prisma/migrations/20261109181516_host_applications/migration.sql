-- CreateEnum
CREATE TYPE "HostApplicationStatus" AS ENUM ('NEW', 'CONTACTED', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "host_applications" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "property_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "rooms" INTEGER NOT NULL,
    "message" TEXT,
    "status" "HostApplicationStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "host_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "host_applications_status_created_at_idx" ON "host_applications"("status", "created_at");
