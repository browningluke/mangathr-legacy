import { ALL_PLUGIN_NAMES, getPluginFromMap } from "@core/plugins";
import {Chapter, Manga, Reader, RSSManga} from "plugin";

const ALL_PLUGINS = ALL_PLUGIN_NAMES.map((name) => getPluginFromMap(name)!);

const definedAndNotNull = (obj: string | number) => {
    expect(obj).toBeDefined();
    expect(obj).not.toBeNull();

    if (typeof obj == "string") expect(obj.length).toBeGreaterThan(0);
}

const correctlyFormattedChapters = (chapters: Chapter[]) => {
    for (const chapter of chapters) {
        const { id, title, num, url } = chapter;

        if (id) expect(id.length).toBeGreaterThan(0);
        if (url) expect(url.length).toBeGreaterThan(0);

        definedAndNotNull(title);
        definedAndNotNull(num);
    }
}

const compareChapterArrays = (actual: Chapter[], expected: Chapter[]) => {
    for (const x of expected) {
        expect(actual).toContainEqual(x);
    }
}

describe('Plugins', function () {

    for (const plugin of ALL_PLUGINS) {
        if (plugin.TEST_QUERY == "") continue; // Skip plugins with no test URL (todo implement webtoons later)

        describe(`${plugin.NAME}`, function () {
            let resManga: Manga;
            let resRSSManga: RSSManga;

            // This is a requirement for all other tests, while also a test itself.
            beforeAll(async function () {
                try {
                    resManga = await plugin.getManga(plugin.TEST_QUERY);
                } catch (e) {
                    fail(e);
                }
            })

            describe('Manga object', function () {
                it('should contain correctly formatted chapters.',
                    () => correctlyFormattedChapters(resManga.chapters));

                it('should contain > 0 chapters',
                    () => expect(resManga.chapters.length).toBeGreaterThan(0));

                it('should contain a defined & not null title.',
                    () => definedAndNotNull(resManga.title));
            });

            describe('Reader object', function () {
                let resReader: Reader;

                // This is a requirement for all reader tests, while also a test itself.
                beforeAll(async function () {
                    const randomElement = resManga.chapters[Math.floor(Math.random() * resManga.chapters.length)];

                    try {
                        resReader = await plugin.selectChapter(randomElement);
                    } catch (e) {
                        fail(e);
                    }
                })

                it('should contain a defined & non null chapter title.',
                    () => definedAndNotNull(resReader.chapterTitle));

                it('should contain a defined & non null number.',
                    () => definedAndNotNull(resReader.num));

                it('should contain > 0 Images',
                    () => expect(resReader.urls.length).toBeGreaterThan(0));

                it('should contain properly formatted Images.', function () {
                    for (const image of resReader.urls) {
                        definedAndNotNull(image.url);
                        definedAndNotNull(image.filename)
                    }
                });
            });

            describe('RSSManga object', function () {

                // This is a requirement for all RSSManga tests, while also a test itself.
                beforeAll(async function () {
                    try {
                        resRSSManga = await plugin.getUpdateUrl(plugin.TEST_QUERY);
                    } catch (e) {
                        fail(e);
                    }
                })

                it('should contain > 0 chapters',
                    () => expect(resRSSManga.chapters.length).toBeGreaterThan(0));

                it('should contain correctly formatted chapters.',
                    () => correctlyFormattedChapters(resRSSManga.chapters));

                it('should contain a defined & not null title.',
                    () => definedAndNotNull(resRSSManga.title));

                it('should contain a defined & not null id.',
                    () => definedAndNotNull(resRSSManga.id));

                it('should contain the same title as Manga.',
                    () => expect(resRSSManga.title).toEqual(resManga.title));

                it('should contain same chapters as Manga.', () => {
                    compareChapterArrays(resRSSManga.chapters, resManga.chapters);
                });
            });

            describe('Fetching chapters by ID', function () {
                let chapters: Chapter[];

                // This is a requirement for all following tests, while also a test itself.
                beforeAll(async function () {
                    try {
                        chapters = await plugin.getChaptersById(resRSSManga.id);
                    } catch (e) {
                        fail(e);
                    }
                })

                it('should contain > 0 chapters',
                    () => expect(chapters.length).toBeGreaterThan(0));

                it('should contain correctly formatted chapters.',
                    () => correctlyFormattedChapters(chapters));

                it('should contain same chapters as Manga.', () => {
                    compareChapterArrays(chapters, resManga.chapters);
                });

                it('should contain same chapters as RSSManga.', () => {
                    compareChapterArrays(chapters, resRSSManga.chapters);
                });
            });
        });
    }
});
