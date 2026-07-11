-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DesignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionHistory" ADD CONSTRAINT "VersionHistory_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DesignFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
