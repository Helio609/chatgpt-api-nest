/*
  Warnings:

  - You are about to drop the column `chats` on the `Session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Session" DROP COLUMN "chats",
ADD COLUMN     "messages" JSONB[];
