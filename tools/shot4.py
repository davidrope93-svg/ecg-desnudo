import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 1000})
        await pg.goto('file:///home/claude/ecg/index.html'); await pg.wait_for_selector('.mode')
        await pg.click('text=Atlas'); await pg.click(f'text={sys.argv[1]}'); await pg.wait_for_timeout(400)
        for _ in range(int(sys.argv[2])): await pg.click('.casebar .tool >> nth=2'); await pg.wait_for_timeout(200)
        await pg.locator('.paperwrap').screenshot(path='/home/claude/ecg/shot_x.png')
        await b.close()
asyncio.run(main())
