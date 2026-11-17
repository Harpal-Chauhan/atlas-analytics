-- CreateEnum
CREATE TYPE "InternalRole" AS ENUM ('OPS');

-- AlterTable
ALTER TABLE "AuthUser" ADD COLUMN     "internalRole" "InternalRole";
