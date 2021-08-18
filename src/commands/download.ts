import { getNumber, getUserConfirmation, getUserSelection, readLineAsync } from "../helpers/cli";
import { download, printTableAndMessage, searchQuery, selectPlugin } from "../helpers/commands";
import { MangaPlugin, Chapter, Manga } from "../types/plugin";
import { Database } from "../types/database";
import { delay } from "../helpers/async";

export async function handleDownloadDialog(db: Database) {
    let plugin = await selectPlugin();
    let download = await createDownload(plugin);
    await download.startDownloadDialog();
}

async function createDownload(plugin: MangaPlugin, query?: string): Promise<Download> {
    let manga = await searchQuery(plugin, false, query);
    return new Download(manga, manga.chapters, plugin);
}

enum SubMode {
    DownloadSingle = "Download Single",
    DownloadRange = "Download Range",
    DownloadAll = "Download All",
    Edit = "Edit result"
}

enum EditSubMode {
    BulkRenameRegex = "Rename All Chapters (regex)",
    RenameMangaTitle = "Edit title of manga",
    RenameChapterTitle = "Edit title of specific chapter",
    ChangeNumber = "Edit number of specific chapter",
    Back = "Back"
}

class Download {

    manga;
    chapters;
    plugin;

    constructor(manga: Manga, chapters: Chapter[], plugin: MangaPlugin) {
        this.manga = manga;
        this.chapters = chapters;
        this.plugin = plugin;
    }

    /*
        Helpers
    */

    private async startDownloadRange(chapterRange: Chapter[]) {
        //for (let i = 0; i < chapterRange.length; i++) {
        for (const chapter of chapterRange) {
            await download(chapter, this.manga.title, this.plugin);//, true);
            await delay(200);
        }
    }

    private async getChapterIndex(promptString?: string): Promise<number> {
        const checks = (num: number) => {
            return num <= this.manga.chapters.length && num > 0;
        }
        let number = await getNumber(promptString ?? "Enter chapter number: ", checks);

        return this.manga.chapters.length - number;
    }

    /*
        SubModes
    */

    private static async selectSubMode() {
        return getUserSelection(Object.values(SubMode));
    }

    private static async selectEditSubMode() {
        return getUserSelection(Object.values(EditSubMode));
    }

    // Download
    //  SubModes

    private async singleDownload() {
        //let table = await _generateTable(manga.chapters, manga.title);
        //console.log(`${table.toString()}\nTitle: ${manga.title}\nNumber of chapters: ${manga.chapters.length}`);

        let chapterIndex = await this.getChapterIndex();

        let chapterTitle;
        let userResp;
        //if (chapterIndex != -1) {
        chapterTitle = this.chapters[chapterIndex].title;
        userResp = await getUserConfirmation(
            `Are you sure you want to download:\n\t${chapterTitle}? (y/n): `);
        //}

        // if (chapterIndex != -1 && userResp == "n") {
        // 	return;
        // }

        if (userResp == "n") return

        try {
            await download(this.chapters[chapterIndex], this.manga.title, this.plugin);
        } catch (e) {
            console.log(e.message);
        }
    }

    public async allDownload(skipConfirmation = false) {
        if (!skipConfirmation) {
            let userResp = await getUserConfirmation(
                `Are you sure you want to download all chapters? (y/n): `);
            if (userResp == "n") return
        }
        await this.startDownloadRange(this.chapters);
    }

    private async rangeDownload() {
        const firstBoundIndex = await this.getChapterIndex("Enter first bound: ");
        const secondBoundIndex = await this.getChapterIndex("Enter second bound: ");

        const lowerBound = Math.min(firstBoundIndex, secondBoundIndex);
        const upperBound = Math.max(firstBoundIndex, secondBoundIndex);

        let promptString = `Are you sure you want to download range:\n\t` +
            `Chapter ${this.chapters[upperBound].num} - Chapter ${this.chapters[lowerBound].num}? (y/n): `
        let userResp = await getUserConfirmation(promptString);

        if (userResp == "n") return

        let chapterRange = this.chapters.slice(lowerBound, (upperBound + 1));

        await this.startDownloadRange(chapterRange);
    }

    // Edit
    //  SubModes

    private async bulkRenameRegex() {
        process.stdout.write("Enter a regex pattern string: ");
        let matchPattern = await readLineAsync();
        process.stdout.write("Enter a replacement string: ");
        let replacementString = await readLineAsync();

        let re;
        try {
            re = new RegExp(matchPattern);
        } catch (e) {
            // TODO proper error handling
            throw e;
        }

        for (let i = 0; i < this.chapters.length; i++) {
            this.chapters[i].title = this.chapters[i].title.replace(re, replacementString);
        }
    }

    private async editMangaTitle() {
        process.stdout.write("Enter a new title: ");
        this.manga.title = await readLineAsync();
    }

    private async editChapterTitle() {
        const chapterIndex = await this.getChapterIndex("Enter chapter index: ");
        process.stdout.write("Enter a new title: ");
        this.chapters[chapterIndex].title = await readLineAsync();
    }

    private async editChapterNumber() {
        const chapterIndex = await this.getChapterIndex("Enter chapter index: ");
        this.chapters[chapterIndex].num = await getNumber("Enter new number: ");
    }

    /*
        Dialog handling
     */

    private async handleDownloadSubModes(submode: SubMode) {
        switch (submode) {
            case SubMode.DownloadSingle:
                await this.singleDownload();
                break;
            case SubMode.DownloadAll:
                await this.allDownload();
                break;
            case SubMode.DownloadRange:
                await this.rangeDownload();
                break;

        }
    }

    private async handleEditSubModes(submode: EditSubMode) {
        switch (submode) {
            case EditSubMode.BulkRenameRegex:
                await this.bulkRenameRegex();
                break;
            case EditSubMode.RenameMangaTitle:
                await this.editMangaTitle();
                break;
            case EditSubMode.RenameChapterTitle:
                await this.editChapterTitle();
                break;
            case EditSubMode.ChangeNumber:
                await this.editChapterNumber();
                break;
            case EditSubMode.Back:
                break;
        }
        await this.startDownloadDialog();
    }

    async startDownloadDialog() {
        await printTableAndMessage(this.chapters, this.manga.title, this.manga.chapters.length);
        let selectedSubMode = await Download.selectSubMode();

        if (selectedSubMode == SubMode.Edit) {
            let editSubMode = await Download.selectEditSubMode();
            await this.handleEditSubModes(editSubMode);
        }

        await this.handleDownloadSubModes(selectedSubMode);
    }
}
