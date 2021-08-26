import { Chapter } from "../types/plugin";
import { Database, MangaUpdate } from "../types/database";
import { getPluginFromMap } from "../plugins";
// import { delay } from "../helpers/async";
import { download } from "../helpers/commands";
import { UPDATE_CHAPTER_DELAY_TIME } from "../constants";

function findNewChapters(availableChapters: Chapter[],
                         currentChapters: number[]) {
    let newChapters: Chapter[] = [];
    availableChapters.forEach((chapter) => {
        if (!currentChapters.includes(chapter.num)){
            newChapters.push(chapter);
        }
    });

    return newChapters;
}

const checkForNewChapters = async (manga: MangaUpdate) => {
    console.log(`--- Checking manga: ${manga.title} [with ${manga.plugin}] ---`);

    const plugin = getPluginFromMap(manga.plugin)!;

    const availableChapters = await plugin.getChaptersById(manga.id);
    let allChapters: number[] = [...manga.chapters];

    let newChapters = findNewChapters(availableChapters, manga.chapters);
    if (newChapters.length != 0) {
        // Download all new chapters;

        for (const chapter of newChapters) {
            try {
                //await downloadTest(chapter, false);
                await download(chapter, manga.title, plugin, false);
            } catch (err) {
                console.log(`Failed to download ${chapter.title}`);
                continue;
            }

            console.log(`Successfully downloaded ${chapter.title}`);
            allChapters.push(chapter.num!);
            //await delay(UPDATE_CHAPTER_DELAY_TIME);
        }

        return {
            plugin: manga.plugin,
            title: manga.title,
            id: manga.id,
            chapters: allChapters.sort().reverse()
        };
    }

    console.log(`Found no new chapters for manga: ${manga.title} :(`);
    return manga;
}

async function handleUpdateDialog(db: Database) {
    console.log("Checking for new chapters.");

    try {
        await db.forEach(checkForNewChapters, UPDATE_CHAPTER_DELAY_TIME);
    } catch (err) {
        console.error(err);
    }
}

export { handleUpdateDialog };