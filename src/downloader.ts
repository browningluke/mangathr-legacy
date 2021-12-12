import { Image, ImageDownloadFn, DownloadItem } from "plugin";
import { retryFetch } from "@helpers/retry-fetch";
import { delay } from "@helpers/async";
import Config from "@core/config";
import { pad } from "@helpers/plugins"

import archiver from 'archiver';
import fs from 'fs';
import ProgressBar from 'progress';

import { SIMULTANEOUS_IMAGES, IMAGE_DELAY_TIME, PAD_WIDTH } from "./constants";
import { Buffer } from "buffer";

/*
	Path Management
 */
function cleanTitle(title: string): string {
	// Forbidden characters in path: [/<>:"\\|?*]
	return title.replace(/[/\\|]/g, ", ")
				.replace(/[:<>"?*]/g, "");
			//  .replace(//, "");
}

function generatePath(di: DownloadItem): { filepath: string, dirname: string } {
	const titleNum = pad(Math.floor(di.num), PAD_WIDTH) + (di.num - Math.floor(di.num)).toString().slice(1);	
	const title = `${titleNum} - ` + `${cleanTitle(di.chapterTitle)}`;

	const dirname = `${Config.CONFIG.DOWNLOAD_DIR}/${di.mangaTitle}`;
	const filepath = `${dirname}/${title}.cbz`;

	return { filepath: filepath, dirname: dirname };
}

export function isDownloaded(di: DownloadItem): boolean {
	const { filepath } = generatePath(di);
	return fs.existsSync(filepath);
}

/*
	Image download
 */

const defaultImageDownload: ImageDownloadFn = async (image: Image, filepath: string, refererUrl?: string) => {
	let refererHeader = !refererUrl ? {} : { headers: { 'referer': refererUrl } };

	let res;
	try {
		res = await retryFetch(image.url, refererHeader, 10, 1000)
	} catch (e) {
		fs.rmSync(filepath);
		throw new Error("Failed downloading an image. Giving up on this chapter.");
	}
	return (await res.buffer());
}

export async function downloadChapter(di: DownloadItem,
									  silent = false, delayTime = IMAGE_DELAY_TIME): Promise<void> {
	const { filepath, dirname } = generatePath(di);

	// Handle full path not existing
	await fs.promises.mkdir(dirname, { recursive: true });

	if (fs.existsSync(filepath)) {
		if (!silent) console.log(`Skipping ${di.chapterTitle}, already downloaded.`);
		//throw "Already exists";
		return;
	} // Short circuit rather than overwriting.

	const output = fs.createWriteStream(filepath);

	const archive = archiver('zip', {
		zlib: { level: 9 } // Sets the compression level.
	});
	archive.pipe(output);

	// Initialize output
	if (!silent) {
		console.log("Starting download of: " + di.chapterTitle); //+ reader.urls.length);
		var bar = new ProgressBar('  downloading [:bar] :percent :etas',
			{
				total: di.urls.length,
				complete: "=",
				incomplete: " ",
				width: 40
			});
	}

	const downloadImage = async (image: Image) => {
		const buffer =
			await (di.imageDownload ? di.imageDownload : defaultImageDownload)(image, filepath, di.refererUrl);
		archive.append(buffer, { name: image.filename });
		if(!silent) bar.tick();
	}

	const getData = async (list: Image[], ms: number) => {
		const sliceList = (length: number) => {
			let usedList = list;
			let stringList = [];

			while (usedList.length > 0) {
				stringList.push(usedList.slice(0, length));
				usedList = usedList.slice(length)
			}

			return stringList;
		}

		for (const item of sliceList(SIMULTANEOUS_IMAGES)) {
			let promiseList = item.map((i) => downloadImage(i));
			await Promise.all(promiseList);
			await delay(ms);
		}
	}

	await getData(di.urls, delayTime);

	if (di.num != null) {
		let xmlString = generateXMLString(di.num, di.chapterTitle);
		archive.append(Buffer.from(xmlString), { name: "ComicInfo.xml" });
		if (!silent) console.log("Added ComicInfo!");
	}

	await archive.finalize();
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
