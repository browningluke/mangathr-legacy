import { Database, MangaUpdate } from "../types/database";

// TODO make this not shit (unbad it)
async function printListFromDatabase(db: Database) {
    try {
        const printAllManga = async (manga: MangaUpdate) => {
            console.log(`Title: ${manga.title}, Chapters: ${manga.chapters}`);
            return manga;
        }
        await db.forEach(printAllManga);
    } catch (err) {
        console.error(err);
    }
}


async function handleListDialog(db: Database) {
   return printListFromDatabase(db);
}

export { handleListDialog }