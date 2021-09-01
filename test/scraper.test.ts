import { Scraper } from "@core/scraper";

describe('Scraper Requests', function () {

    const URL = "https://httpbin.org/anything";

    it("should send correct GET requests (no data)", async () => {
        let resp = await Scraper.get(URL);
        expect(resp.status_code).toEqual(200);

        let json = JSON.parse(resp.body);
        expect(json.args).toEqual({});
        expect(json.method).toEqual("GET");
        expect(json.data).toEqual("");
    });

    it("should send correct GET requests (data, escape)", async () => {
        let resp = await Scraper.get(URL, {
            test: "abc def'"
        }, true);
        expect(resp.status_code).toEqual(200);

        let json = JSON.parse(resp.body);
        expect(json.args).toEqual({ test: "abc def'" });
        expect(json.method).toEqual("GET");
        expect(json.form).toEqual({});
        expect(json.url).toEqual(`${URL}?test=abc+def'`);
    });

    it("should send correct GET requests (data, no escape)", async () => {
        let resp = await Scraper.get(URL, {
            test: "abc def'"
        }, false);
        expect(resp.status_code).toEqual(200);

        let json = JSON.parse(resp.body);
        expect(json.args).toEqual({ test: "abc def'" });
        expect(json.method).toEqual("GET");
        expect(json.form).toEqual({});
        expect(json.url).toEqual(`${URL}?test=abc def'&`);
    });

    it("should send correct POST requests (no data)", async () => {
        let resp = await Scraper.post(URL);
        expect(resp.status_code).toEqual(200);

        let json = JSON.parse(resp.body);
        expect(json.args).toEqual({});
        expect(json.method).toEqual("POST");
        expect(json.form).toEqual({});
        expect(json.url).toEqual(URL);
    });

    it("should send correct POST requests (data)", async () => {
        let resp = await Scraper.post(URL, {
            test: "abc def'"
        });
        expect(resp.status_code).toEqual(200);

        let json = JSON.parse(resp.body);
        expect(json.args).toEqual({});
        expect(json.method).toEqual("POST");
        expect(json.form).toEqual({ test: "abc def'" });
        expect(json.url).toEqual(URL);
    });

});

describe('Scraper CSS selector', function () {

    const URL = "https://httpbin.org/";
    let testHTML: string;

    beforeEach(async () => {
        let resp = await Scraper.get(URL);
        testHTML = resp.body;
    })

   it("should grab correct text with CSS selectors", () => {
       expect(Scraper.css(testHTML, ".base-url").text())
           .toEqual("[ Base URL: httpbin.org/ ]");

       // This makes me want to die
       expect(Scraper.css(testHTML, "div.swagger-ui > div.wrapper > section > div > ul > li").text())
           .toEqual("\n                        HTML form that posts to /post /forms/post");
   })
});