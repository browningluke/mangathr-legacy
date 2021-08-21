import { Image, Reader } from "./types/plugin";
import { retryFetch } from "./helpers/retry-fetch";
import { delay } from "./helpers/async";

import archiver from 'archiver';
import fs from 'fs';
import ProgressBar from 'progress';

import { DOWNLOAD_DIR } from "./constants";

function generatePath(reader: Reader, mangaTitle: string): { filepath: string, dirname: string } {
	const title = (reader.num ? `${reader.num!} - ` : "") + `${reader.chapterTitle}`;

	const dirname = `${DOWNLOAD_DIR}/${mangaTitle}`;
	const filepath = `${dirname}/${title}.cbz`;

	return { filepath: filepath, dirname: dirname };
}

function isDownloaded(mangaTitle: string, chapterTitle: string, num: number): boolean {
	const { filepath } = generatePath({ chapterTitle: chapterTitle, urls: [], num: num },
		mangaTitle);

	return fs.existsSync(filepath);
}

async function downloadChapter(reader: Reader, mangaTitle: string, refererUrl?: string,
								silent = false, delayTime = 100): Promise<void> {
	const { filepath, dirname } = generatePath(reader, mangaTitle);

	await fs.promises.mkdir(dirname, { recursive: true });

	if (fs.existsSync(filepath)) {
		if (!silent) console.log(`Skipping ${reader.chapterTitle}, already downloaded.`);
		throw "Already exists";
	} // Short circuit rather than overwriting.

	const output = fs.createWriteStream(filepath);

	const archive = archiver('zip', {
		zlib: { level: 9 } // Sets the compression level.
	});
	archive.pipe(output);

	// Initialize output
	if (!silent) {
		console.log("Starting download of: " + reader.chapterTitle); //+ reader.urls.length);
		var bar = new ProgressBar('  downloading [:bar] :percent :etas',
			{
				total: reader.urls.length,
				complete: "=",
				incomplete: " ",
				width: 40
			});
	}

	const downloadImage = async (image: Image, ms: number) => {
		let refererHeader = !refererUrl ? {} :
			{
				headers: {
					'referer': refererUrl
				}
			};

		let res;
		try {
			res = await retryFetch(image.url, refererHeader, 10, 1000)
		} catch (e) {
			throw "Failed downloading an image. Giving up on this chapter.";
		}
		const buffer = await res.buffer()
		//console.log(`Status: ${res.status} Filename: ${image.filename}`);
		archive.append(buffer, { name: image.filename });

		await delay(ms);
		if(!silent) bar.tick();
	}

	const getData = async (list: Image[], ms: number) => {
		for (const item of list) {
			await downloadImage(item, ms);
		}
	}

	await getData(reader.urls, delayTime);

	if (reader.num != null) {
		let xmlString = generateXMLString(reader.num, reader.chapterTitle);
		archive.append(Buffer.from(xmlString), { name: "ComicInfo.xml" });
		if (!silent) console.log("Added ComicInfo!");
	}

	archive.finalize();
	if (!silent) console.log("Finished downloading!");
}

function generateXMLString(num: number, title: string): string {
	return `<?xml version=\"1.0\"?>\n` +
		`<ComicInfo xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n` +
		`xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\">\n` +
		`<Number>${num}</Number>\n` +
		`<Title>${title}</Title>\n` +
		`</ComicInfo>`
}

export { downloadChapter, isDownloaded };