import fetch, { Response } from "node-fetch";
import $ from 'cheerio';

interface GetObject {
	body: string,
	headers: any,
	status_code: Number
}

class Scraper {

	static async get(urlString: string, params?: any, escape = true, opts?: any): Promise<GetObject> {
		let urlParams: URLSearchParams | string = "";

		if (params) {
			urlParams += "?";
			if (escape) {
				urlParams += new URLSearchParams(params);
			} else {
				for (const [key, value] of Object.entries(params)) {
					const knownVal = value as string | number | boolean;
					urlParams += `${key}=${knownVal}&`
				}
			}
		}

		const res: Response = await fetch(urlString + urlParams, opts);
		const data = await res.text();

		return {
			"body": data,
			"headers": res.headers.raw(),
			"status_code": res.status
		};
	}

	static async post(url: string, body?: any, options?: any): Promise<GetObject> {
		const searchParams = new URLSearchParams();

		if (body) {
			for (const [key, value] of Object.entries(body)) {
				const knownVal = value as string | number | boolean;
				searchParams.append(key, knownVal.toString());
			}
		}

		const res: Response = await fetch(url, options ?? {
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