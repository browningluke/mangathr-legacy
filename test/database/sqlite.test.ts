import SQLite from "@databases/sqlite";
import { Database, MangaUpdate } from "database";
import { MangaAlreadyRegisteredError } from "@core/exceptions";
import fs from "fs";
import { SQLITE_STORAGE } from "@core/constants";

describe('SQLite', function () {

    const testMangaUpdateList: MangaUpdate[] = [
        { chapters: [1,2,60], id: "test-id", plugin: "MangaDex", title: "Test Title" },
        { chapters: [1,4,10], id: "test-id2", plugin: "Cubari", title: "Test Title 2" },
        { chapters: [15,400,156], id: "test-id3", plugin: "GuyaReader", title: "Test Title 3" }
    ];

    const testMangaUpdateListUpdated: MangaUpdate[] = [
        { chapters: [2,3,61], id: "test-id", plugin: "MangaDex", title: "Test Title" },
        { chapters: [2,5,11], id: "test-id2", plugin: "Cubari", title: "Test Title 2" },
        { chapters: [16,401,157], id: "test-id3", plugin: "GuyaReader", title: "Test Title 3" }
    ];

    let db: Database;

    describe('Setup', function () {
        it('should open without error', async function () {
            await fs.promises.rm(SQLITE_STORAGE, { force: true });
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

        it('should update MangaUpdate items correctly.', async function () {
            const testFunc = async (mangaUpdate: MangaUpdate) => {
                return {
                    plugin: mangaUpdate.plugin, title: mangaUpdate.title, id: mangaUpdate.id,
                    chapters: mangaUpdate.chapters.map(num => num + 1)
                };
            }
            await expect(db.forEach(testFunc)).resolves.not.toThrowError();

            const all = await db.findAll();
            const allMangaUpdate: MangaUpdate[] = all.map((item: any): MangaUpdate => {
                return { chapters: item.chapters, id: item.id, plugin: item.plugin, title: item.title };
            })
            for (const value of testMangaUpdateListUpdated) {
                expect(allMangaUpdate).toContainEqual(value);
            }
        });

        it('should delete MangaUpdate correctly.', async function () {
            for (const value of testMangaUpdateList) {
                let search = await db.find({id: value.id});
                expect(search.length).toBeGreaterThan(0);
                await expect(search[0].destroy()).resolves.not.toThrowError();
                await expect(search[0].destroy()).resolves.not.toThrowError();

                let res;
                try {
                    res = await db.find({id: value.id})
                } catch (e) {
                    fail(e);
                }
                expect(res).toEqual([]);
            }
        });
    });

    describe('Close', function () {
        it('should close without error.', async function () {
            await expect(db.close()).resolves.not.toThrowError();
        });
    });

});