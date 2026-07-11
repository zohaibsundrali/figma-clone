-- Preview orphan Comment records
SELECT c.*
FROM "Comment" AS c
WHERE NOT EXISTS (
    SELECT 1
    FROM "DesignFile" AS d
    WHERE d."id" = c."fileId"
);

-- Count orphan Comment records
SELECT COUNT(*) AS orphan_comments_count
FROM "Comment" AS c
WHERE NOT EXISTS (
    SELECT 1
    FROM "DesignFile" AS d
    WHERE d."id" = c."fileId"
);

-- Preview orphan VersionHistory records
SELECT v.*
FROM "VersionHistory" AS v
WHERE NOT EXISTS (
    SELECT 1
    FROM "DesignFile" AS d
    WHERE d."id" = v."fileId"
);

-- Count orphan VersionHistory records
SELECT COUNT(*) AS orphan_versions_count
FROM "VersionHistory" AS v
WHERE NOT EXISTS (
    SELECT 1
    FROM "DesignFile" AS d
    WHERE d."id" = v."fileId"
);