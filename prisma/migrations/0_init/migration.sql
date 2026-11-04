
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Post_authorId_fkey"
        FOREIGN KEY ("authorId")
        REFERENCES "User"("id")
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "User_email_key"
    ON "User"("email");

CREATE INDEX "Post_authorId_idx_e47547ed"
    ON "Post"("authorId");
