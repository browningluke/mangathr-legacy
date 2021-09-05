import SQLite from "@databases/sqlite";
import { Database, MangaUpdate } from "database";
import { MangaAlreadyRegisteredError } from "@core/exceptions";
import fs from "fs";
import { SQLITE_STORAGE } from "@core/constants";
import MockResult = jest.MockResult;

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

    async function getMUCallsAndResultsFromFn(fn: jest.Mock) {
        await expect(db.forEach(fn)).resolves.not.toThrowError();
        expect(fn.mock.calls.length).toBe(testMangaUpdateList.length);

        const calls = fn.mock.calls.map(([mu]: MangaUpdate[]) => {
            return { chapters: mu.chapters, id: mu.id, plugin: mu.plugin, title: mu.title }
        });

        let results: MangaUpdate[] = [];
        for await (const v of fn.mock.results.map((res: MockResult<MangaUpdate>) => res.value)) {
            results.push({ chapters: v.chapters, id: v.id, plugin: v.plugin, title: v.title });
        }

        return { calls, results };
    }

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
            const fn = jest.fn(async (mangaUpdate: MangaUpdate) => { return mangaUpdate });
            const { calls, results } = await getMUCallsAndResultsFromFn(fn);

            for (const val of testMangaUpdateList) {
                expect(calls).toContainEqual(val);
                expect(results).toContainEqual(val);
            }
        });

        it('should update MangaUpdate items correctly.', async function () {
            const fn = jest.fn(async (mu: MangaUpdate) => {
                return { plugin: mu.plugin, title: mu.title, id: mu.id, chapters: mu.chapters.map(n => n + 1) }
            })
            const { calls, results } = await getMUCallsAndResultsFromFn(fn);

            for (const val of testMangaUpdateList) { expect(calls).toContainEqual(val); }
            for (const val of testMangaUpdateListUpdated) { expect(results).toContainEqual(val); }

            const all = await db.findAll();
            const allMangaUpdate: MangaUpdate[] = all.map((item: any): MangaUpdate => {
                return { chapters: item.chapters, id: item.id, plugin: item.plugin, title: item.title };
            })
            for (const value of testMangaUpdateListUpdated) { expect(allMangaUpdate).toContainEqual(value); }
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