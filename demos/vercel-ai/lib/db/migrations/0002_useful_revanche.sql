ALTER TABLE "Message" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "messageIndex" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_messageIndex_unique" UNIQUE("messageIndex");