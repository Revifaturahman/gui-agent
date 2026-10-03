const { chromium } = require("playwright")

async function main() {
    const browser = await chromium.launch({
        headless: false,
        executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    })

    const page = await browser.newPage()

    await page.goto("http://127.0.0.1:8000/login")

    console.log("website berhasil terbuka");

    await page.waitForTimeout(5000);

    const elements = await page.evaluate(() => {
        const elements = [];

        document.querySelectorAll(
            "button, input, textarea, select, a"
        ).forEach((element) => {
            elements.push({
                type: element.getAttribute("type"),
                name: element.getAttribute("name"),
                visible: element.checkVisibility(),
                enable: !element.disabled
            });
        })
        return elements

    });
    console.log(JSON.stringify(elements, null, 2));

    await page.waitForTimeout(5000);

    await page.close();
}

main()

