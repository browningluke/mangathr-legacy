import { downloadChapter } from "../src/downloader";
import { Image, Reader } from "../src/types/plugin";
import { DOWNLOAD_DIR } from "../src/constants";

import fs from 'fs';
import StreamZip from 'node-stream-zip';

const fsPromises = fs.promises;

describe('Downloader', function () {

    const testImgURLS: Image[] = [
        {
            url: "https://upload.wikimedia.org/wikipedia/commons/0/01/" +
                "Parque_estatal_Chugach%2C_Alaska%2C_Estados_Unidos%2C_2017-08-22%2C_DD_52.jpg",
            filename: "001.jpg"
        },
        {
            url: "https://upload.wikimedia.org/wikipedia/commons/4/45/" +
                "Gebarsten_bolster_van_een_paardenkastanje_%28Aesculus%29_20-09-2020_%28d.j.b.%29_01.jpg",
            filename: "002.jpg"
        }
    ]

    const testReader: Reader = {
        chapterTitle: "test 1",
        urls: testImgURLS,
        num: 1
    }

    const testMangaName = "test-manga";
    const path = `${DOWNLOAD_DIR}/${testMangaName}/${testReader.num} - ${testReader.chapterTitle}.cbz`;

    describe('Download & zip', function () {
        it('should download without error', async () => {
            if (fs.existsSync(path))
                await fsPromises.rm(path);
            await expect(downloadChapter(testReader, testMangaName, undefined, true))
                .resolves.not.toThrowError();
        });
    });

    describe('Downloaded file', function () {
        let stats: fs.Stats;
        it("should be > 0 bytes", async () => {
            stats = await fsPromises.stat(path);
            expect(stats.size).toBeGreaterThan(0);
        });

        it("should be == x bytes", async () => {
            stats = await fsPromises.stat(path);
            expect(stats.size).toBeGreaterThanOrEqual(15372667 - 100);
            expect(stats.size).toBeLessThanOrEqual(15372667 + 100);
        });

        it("should contain images & correct ComicInfo", async () => {
            const zip = new StreamZip.async({ file: path, storeEntries: true });

            for (const x of testImgURLS) {
                const data = await zip.entryData(x.filename);
                expect(data.length).toBeGreaterThan(0);
            }
            const comicInfo = (await zip.entryData('ComicInfo.xml')).toString("utf8");

            let comicInfoExpected = `<?xml version=\"1.0\"?>\n` +
                `<ComicInfo xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n` +
                `xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\">\n` +
                `<Number>${testReader.num}</Number>\n` +
                `<Title>${testReader.chapterTitle}</Title>\n` +
                `</ComicInfo>`

            expect(comicInfo).toEqual(comicInfoExpected);
        })
    });
});

