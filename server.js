const express = require("express");
const { chromium } = require("playwright")
const OpenAI = require("openai")

require("dotenv").config()

const app = express()

app.use(express.json())

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
            'messages': [
                {
                    'role': 'system',
                    'content': `
                        Kamu adalah AI GUI Agent yang bertugas menentukan action untuk Playwright.

                        Kamu akan menerima:
                        1. Instruksi dari user.
                        2. Daftar element GUI yang ditemukan dari halaman website.

                        Setiap element memiliki format:

                        {
                            "id": number,
                            "tag": string,
                            "type": string | null,
                            "name": string | null,
                            "placeholder": string | null,
                            "label": string | null,
                            "visible": boolean,
                            "enabled": boolean
                        }

                        Tugas kamu:
                        - Pahami instruksi user.
                        - Cari element yang sesuai dengan instruksi.
                        - Gunakan "id" dari element sebagai "element_id".
                        - Hanya gunakan element yang tersedia.
                        - Jangan membuat element_id baru.
                        - Jangan menggunakan element yang visible=false.
                        - Jangan menggunakan element yang enabled=false.
                        - Tentukan action yang paling sesuai.
                        - Property untuk menunjuk element HARUS bernama "element_id".
                        - Jangan gunakan nama "target_id".
                        - Jangan gunakan nama property lain untuk menunjuk element.

                        Action yang diperbolehkan:

                        1. fill
                        Digunakan untuk mengisi input atau textarea.

                        Format:
                        {
                            "action": "fill",
                            "element_id": 2,
                            "value": "admin"
                        }

                        2. click
                        Digunakan untuk menekan button atau link.

                        Format:
                        {
                            "action": "click",
                            "element_id": 4
                        }

                        3. select
                        Digunakan untuk memilih option pada select.

                        Format:
                        {
                            "action": "select",
                            "element_id": 5,
                            "value": "option_value"
                        }

                        Aturan output:
                        - Output HARUS berupa JSON valid.
                        - Jangan menggunakan markdown.
                        - Jangan menggunakan code block.
                        - Jangan memberikan penjelasan.
                        - Jangan memberikan HTML.
                        - Jangan memberikan kode Playwright.
                        - Jangan memberikan rekomendasi.
                        - Jangan menambahkan property selain yang diperlukan.
                        - Jika hanya satu action diperlukan, kembalikan satu object action.
                        - Jika beberapa action diperlukan, kembalikan object "actions".

                        Contoh satu action:

                        {
                            "action": "click",
                            "element_id": 4
                        }

                        Contoh beberapa action:

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

                        Jika instruksi user tidak dapat dilakukan berdasarkan element yang tersedia, kembalikan:

                        {
                            "actions": []
                        }
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

            await browser.close()

            return res.status(200).json({
                success: true,
                message: "data berhasil didapatkan",
                elements: elements,
                aiResponse: aiResponse
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