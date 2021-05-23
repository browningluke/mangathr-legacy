import { Response } from "node-fetch";

const fetch = require('node-fetch');
const $:cheerio.CheerioAPI = require('cheerio');

interface GetObject {
	body: string,
	headers: any,
	status_code: Number
}

class Scraper {

	static async get(url: string, params?: any): Promise<GetObject> {
		const res: Response = await fetch(url, params);
		const data = await res.text();

		return {
			"body": data,
			"headers": res.headers.raw(),
			"status_code": res.status
		};
	}

	static async post(url: string, body?: any, params?: any): Promise<GetObject> {
		const searchParams = new URLSearchParams();

		for (const [key, value] of Object.entries(body)) {
			const knownVal = value as string | number | boolean;
			searchParams.append(key, knownVal.toString());
		}

		const res: Response = await fetch(url, params ?? {
			method: "POST",
			body: searchParams
		});
		const data = await res.text();

		return {
			"body": data,
			"headers": res.headers.raw(),
			"status_code": res.status
		};
	}

	static css(html: any, selector: string) {
		return $(selector, html);
	}

	static text(element: cheerio.Cheerio): string {
		return element.text();
	}

}

export { Scraper };