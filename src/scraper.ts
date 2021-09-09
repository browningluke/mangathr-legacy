import fetch, { RequestInit, Response } from "node-fetch";
import $ from 'cheerio';

export type GenericObject = {
	[key in string | number]: any;
};

interface RespObject {
	data: string | Buffer | GenericObject
	headers: any,
	status_code: Number
}

export enum RespBodyType {
	TEXT,
	BUFFER,
	JSON
}

interface GetOptions {
	params?: { [k: string]: any },
	escape?: boolean,
	opts?: RequestInit,
}

interface PostOptions {
	body?: { [k: string]: any },
	opts?: RequestInit
}

class Scraper {

	private static async generateRespObject(res: Response, type: RespBodyType) {
		let data: string | Buffer | object;
		switch (type) {
			case RespBodyType.TEXT:
				data = await res.text();
				break;
			case RespBodyType.JSON:
				data = await res.json();
				break;
			case RespBodyType.BUFFER:
				data = await res.buffer();
				break;
		}

		return {
			"data": data,
			"headers": res.headers.raw(),
			"status_code": res.status
		};
	}

	static async get(url: string, type: RespBodyType, getOptions: GetOptions = { escape: true }): Promise<RespObject> {
		const { params, escape = true, opts } = getOptions;

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
		const res: Response = await fetch(url + urlParams, opts);
		return Scraper.generateRespObject(res, type);
	}

	static async post(url: string, type: RespBodyType, postOptions: PostOptions = {}): Promise<RespObject> {
		const { body, opts } = postOptions;

		const searchParams = new URLSearchParams();

		if (body) {
			for (const [key, value] of Object.entries(body)) {
				const knownVal = value as string | number | boolean;
				searchParams.append(key, knownVal.toString());
			}
		}

		const res: Response = await fetch(url, opts ?? {
			method: "POST",
			body: searchParams
		});
		return Scraper.generateRespObject(res, type);
	}

	static css(html: any, selector: string) {
		return $(selector, html);
	}

	static text(element: cheerio.Cheerio): string {
		return element.text();
	}

}

export { Scraper };