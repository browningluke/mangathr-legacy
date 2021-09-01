import { SQLite } from "@databases/sqlite";
import { Database, MangaUpdate } from "database";
import { MangaAlreadyRegisteredError } from "@core/exceptions";

describe('SQLite', function () {

    const testMangaUpdateList: MangaUpdate[] = [
        { chapters: [1,2,60], id: "test-id", plugin: "MangaDex", title: "Test Title" },
        { chapters: [1,4,10], id: "test-id2", plugin: "Cubari", title: "Test Title 2" },
        { chapters: [15,400,156], id: "test-id3", plugin: "GuyaReader", title: "Test Title 3" }
    ];

    let db: Database;

    describe('Setup', function () {
        it('should open without error', async function () {
            db = new SQLite();
            await expect(db.setup()).resolves.not.toThrowError();
            await expect(db.findAll()).resolves.toEqual([]);
        });
    });

    describe('IO', function () {
        it('should save MangaUpdate object correctly.', async function () {
            for (const value of testMangaUpdateList) {
                await expect(db.registerManga(value)).resolves.not.toThrowError();
            }
        });

        it('should throw error on duplicate MangaUpdate.', async function () {
            for (const value of testMangaUpdateList) {
                await expect(db.registerManga(value)).rejects.toThrowError(MangaAlreadyRegisteredError);
            }
        });

        it('should find all MangaUpdate.', async function () {
            const all = await db.findAll();
            const allMangaUpdate: MangaUpdate[] = all.map((item: any): MangaUpdate => { // todo change this later
                return {
                    chapters: item.chapters,
                    id: item.id,
                    plugin: item.plugin,
                    title: item.title
                };
            })
            for (const value of testMangaUpdateList) {
                expect(allMangaUpdate).toContainEqual(value);
            }
        });

        it('should find specific MangaUpdate', async function () {
            for (const value of testMangaUpdateList) {
                let search = await db.find({id: value.id});
                expect(search.length).toBeGreaterThan(0);
                let item = search[0];
                let foundMangaUpdate: MangaUpdate = {
                    chapters: item.chapters, id: item.id, plugin: item.plugin, title: item.title
                }
                expect(foundMangaUpdate).toEqual(value);
            }
        });

        it('should run function on all MangaUpdate.', async function () {
            let titleList = testMangaUpdateList.map(value => value.title);
            let generatedList: string[] = [];

            const testFunc = async (mangaUpdate: MangaUpdate) => {
                generatedList.push(mangaUpdate.title);
                return mangaUpdate;
            }
            await expect(db.forEach(testFunc)).resolves.not.toThrowError();

            for (const val of titleList) { expect(generatedList).toContainEqual(val); }
        });

        it('should delete MangaUpdate correctly.', async function () {
            for (const value of testMangaUpdateList) {
                let search = await db.find({id: value.id});
                expect(search.length).toBeGreaterThan(0);
                await expect(search[0].destroy()).resolves.not.toThrowError();
                await expect(search[0].destroy()).resolves.not.toThrowError();

                await expect(db.find({id: value.id})).resolves.not.toThrowError();
            }
        });
    });

    describe('Close', function () {
        it('should close without error.', async function () {
            await expect(db.close()).resolves.not.toThrowError();
        });
    });

});