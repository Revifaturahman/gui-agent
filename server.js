const express = require("express");
const { chromium } = require("playwright")
const OpenAI = require("openai")

require("dotenv").config()

const app = express()

app.use(express.json())

function getLocator(page, element) {

    if (element.name) {
        return page.locator(
            `${element.tag}[name="${element.name}"]`
        );
    }

    if (element.tag === "button" && element.type) {
        return page.locator(
            `button[type="${element.type}"]`
        );
    }

    return page.locator(element.tag).nth(
        element.id - 1
    );
}

async function executeActions(page, elements, aiResponse) {

    const actions = aiResponse.actions || [aiResponse];

    for (const action of actions) {

        const element = elements.find(
            item => item.id === action.element_id
        );

        if (!element) {
            throw new Error(
                `Element dengan id ${action.element_id} tidak ditemukan`
            );
        }

        if (!element.visible) {
            throw new Error(
                `Element ${action.element_id} tidak terlihat`
            );
        }

        if (!element.enabled) {
            throw new Error(
                `Element ${action.element_id} tidak aktif`
            );
        }

        const locator = getLocator(page, element);

        console.log("Menjalankan:", action);

        const actionMap = {
            fill: "fill",
            set_value: "fill",
            click: "click",
            select: "select"
        };

        const normalizedAction = actionMap[action.action];

        switch (normalizedAction) {

            case "fill":

                await locator.fill(action.value);

                break;

            case "click":

                await locator.click();

                break;

            case "select":

                await locator.selectOption(action.value);

                break;

            default:

                throw new Error(
                    `Action tidak didukung: ${action.action}`
                );
        }
    }
}

async function Nara(elements, instruction) {

    console.log("elements: ", elements)
    console.log("instruction: ", instruction)

    const baseUrl = "https://router.bynara.id/v1/chat/completions";

    const response = await fetch(baseUrl, {
        method: 'POST', 
        headers: {
            'Authorization': `Bearer ${process.env.NARAROUTER_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'model': 'nemotron-3-ultra-free',
            'response_format': {
                'type': 'json_object'
            },
            'messages': [
                {
                    'role': 'system',
                    'content': `
                        Kamu adalah AI GUI Agent untuk Playwright.

                        Tugas:
                        - Terima instruksi user.
                        - Analisis daftar element GUI.
                        - Tentukan action yang harus dijalankan.
                        - Gunakan hanya element yang tersedia.
                        - Gunakan nilai "id" element sebagai "element_id".
                        - Jangan membuat element_id baru.
                        - Jangan gunakan element dengan visible=false.
                        - Jangan gunakan element dengan enabled=false.

                        ACTION YANG BOLEH:

                        1. fill
                        {
                            "action": "fill",
                            "element_id": 2,
                            "value": "admin"
                        }

                        2. click
                        {
                            "action": "click",
                            "element_id": 4
                        }

                        3. select
                        {
                            "action": "select",
                            "element_id": 5,
                            "value": "option_value"
                        }


                        IDENTITAS ELEMENT:

                        Untuk menentukan element yang akan digunakan,
                        WAJIB menggunakan property "element_id".

                        "element_id" HARUS berupa angka.

                        Nilai "element_id" HARUS sama dengan nilai "id"
                        dari element yang diberikan.

                        JANGAN membuat object untuk target.

                        BENAR:
                        {
                            "action": "fill",
                            "element_id": 2,
                            "value": "admin"
                        }

                        SALAH:
                        {
                            "action": "fill",
                            "target": {
                                "id": 2,
                                "name": "username",
                                "type": "text"
                            },
                            "value": "admin"
                        }

                        SALAH:
                        {
                            "action": "fill",
                            "target_id": 2,
                            "value": "admin"
                        }

                        SALAH:
                        {
                            "action": "fill",
                            "element": 2,
                            "value": "admin"
                        }


                        ATURAN JSON — WAJIB:

                        Output akan langsung diproses menggunakan JSON.parse().

                        Output HARUS berupa JSON valid.

                        Output HARUS dimulai langsung dengan "{"
                        dan diakhiri langsung dengan "}".

                        DILARANG:
                        - memberikan penjelasan
                        - memberikan analisis
                        - memberikan alasan
                        - memberikan kalimat tambahan
                        - menggunakan Markdown
                        - menggunakan code block
                        - menggunakan property "target_id"
                        - menggunakan property "target"
                        - menggunakan property "element"
                        - menggunakan property "elementId"
                        - menggunakan property selain yang ditentukan
                        - membuat object target
                        - memasukkan informasi element seperti name, type,
                        placeholder, atau label ke dalam action

                        JANGAN PERNAH menghasilkan:
                        Berdasarkan data...
                        Action:
                        Berikut hasilnya...
                        \`\`\`json
                        ...
                        \`\`\`

                        FORMAT OUTPUT:

                        Output WAJIB selalu memiliki property "actions".

                        "actions" WAJIB berupa array.

                        Setiap action WAJIB memiliki property "action" dan "element_id".

                        Contoh satu action:

                        {
                            "actions": [
                                {
                                    "action": "fill",
                                    "element_id": 2,
                                    "value": "admin"
                                }
                            ]
                        }

                        Contoh dua action:

                        {
                            "actions": [
                                {
                                    "action": "fill",
                                    "element_id": 2,
                                    "value": "admin"
                                },
                                {
                                    "action": "fill",
                                    "element_id": 3,
                                    "value": "123456"
                                }
                            ]
                        }

                        Contoh tiga action:

                        {
                            "actions": [
                                {
                                    "action": "fill",
                                    "element_id": 2,
                                    "value": "admin"
                                },
                                {
                                    "action": "fill",
                                    "element_id": 3,
                                    "value": "123456"
                                },
                                {
                                    "action": "click",
                                    "element_id": 4
                                }
                            ]
                        }

                        Jika instruksi tidak dapat dilakukan:

                        {
                            "actions": []
                        }

                        JIKA TIDAK BISA MELAKUKAN INSTRUKSI:

                        {"actions":[]}

                        INGAT:

                        Output HANYA JSON.
                        Tidak boleh ada teks apapun sebelum atau sesudah JSON.
                        Jangan memberikan penjelasan.
                        Jangan memberikan pseudocode.
                        Jangan memberikan kode Playwright.
                        Jangan memberikan Markdown.
                    `,

                    'role': 'user',
                    'content': JSON.stringify({
                        'elements': elements,
                        'instruction': instruction 
                    })
                }
            ]
        })
    })

    const result = await response.json()
    console.log("RESPONSE NARA:");
    console.dir(result, { depth: null });

    if (!response.ok) {
        throw new Error(result.error?.message || "NaraRouter request gagal");
    }

    return result.choices[0].message.content
}

// const nara = new OpenAI({
//     baseUrl: "https://router.bynara.id/v1",
//     apiKey: process.env.NARAROUTER_API_KEY
// });

app.post("/tes-nara", async (req, res) => {
    try {
        const result = await Nara();

        return res.status(200).json({
            message: "berhasil masuk ke tes nara",
            result: result
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "gagal menjalankan Nara",
            error: error.message
        });
    }
});

// app.post("/test-nara", async (res,req) => {
//     const result = await Nara()

//     return res.json({
//         'message': 'berhasil connect',
//         'result': result
//     });
// });

app.post("/analyse/gui-ai", async (req,res) => {
    const { url, instruction } = req.body

    if(!url){
        return res.status(400).json({
            message: "url tidak boleh kosong"
        });
    }

    try {
        const browser = await chromium.launch({
                headless: false,
                executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
            })
        
            const page = await browser.newPage()
        
            await page.goto(url)
        
            console.log(`Website ${url} berhasil terbuka`);
        
            await page.waitForTimeout(5000);
        
            const elements = await page.evaluate(() => {
                const elements = [];
        
                document.querySelectorAll(
                    "button, input, textarea, select, a"
                ).forEach((element, index) => {
                    elements.push({
                        id: index + 1,
                        tag: element.tagName.toLowerCase(),
                        type: element.getAttribute("type"),
                        name: element.getAttribute("name"),
                        placeholder: element.getAttribute("placeholder"),
                        label: element.labels?.[0]?.innerText?.trim() || null,
                        visible: element.checkVisibility(),
                        enabled: !element.disabled
                    });
                })
                return elements
        
            });
            console.log("element berhasil didapatkan")
            console.log("INSTRUCTION:", instruction);

            const aiResponse = await Nara(elements, instruction)

            console.log("AI RAW RESPONSE:");
            console.log(aiResponse);

            const actions = JSON.parse(aiResponse);

            await executeActions(
                page,
                elements,
                actions
            );

            // await browser.close();

            return res.status(200).json({
                success: true,
                message: "GUI berhasil dianalisis dan action dijalankan",
                elements: elements,
                aiResponse: actions
            });

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Gagal mengambil element",
            error: error.message
        });
    }
});

app.listen(3000, () => {
    console.log("Server berjalan di http://localhost:3000")
})