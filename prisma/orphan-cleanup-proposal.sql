-- ==============================================================================
-- ORPHAN CLEANUP PROPOSAL
-- ==============================================================================
-- This is a manual cleanup proposal to resolve data integrity issues.
-- DO NOT EXECUTE this file directly.
-- Take a FULL DATABASE BACKUP before running any DELETE statements below.
-- ==============================================================================

-- 1. Identify and preview orphan Comments
-- These comments reference a fileId that no longer exists in the DesignFile table.
SELECT * FROM "Comment" 
WHERE "fileId" NOT IN (SELECT "id" FROM "DesignFile");

-- PROPOSED DELETION: Comments
-- Uncomment the following line ONLY after verifying the rows returned above and backing up data.
-- DELETE FROM "Comment" WHERE "fileId" NOT IN (SELECT "id" FROM "DesignFile");


-- 2. Identify and preview orphan VersionHistory records
-- These versions reference a fileId that no longer exists in the DesignFile table.
SELECT * FROM "VersionHistory" 
WHERE "fileId" NOT IN (SELECT "id" FROM "DesignFile");

-- PROPOSED DELETION: VersionHistory
-- Uncomment the following line ONLY after verifying the rows returned above and backing up data.
-- DELETE FROM "VersionHistory" WHERE "fileId" NOT IN (SELECT "id" FROM "DesignFile");
