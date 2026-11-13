import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        out = []
        for name, w, hgt in [('desk', 1280, 900), ('movil', 390, 844)]:
            pg = await b.new_page(viewport={'width': w, 'height': hgt}, device_scale_factor=2 if name == 'movil' else 1)
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append('console:' + m.text) if m.type == 'error' else None)
            await pg.goto('file:///home/claude/ecg/index.html')
            await pg.wait_for_selector('.mode', timeout=20000)
            if name == 'desk':
                await pg.screenshot(path='/home/claude/ecg/shot_home.png', full_page=True)
            await pg.click('.mode.primary')
            await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'/home/claude/ecg/shot_{name}_case.png', full_page=(name=='desk'))
            await pg.click('.opt >> nth=0')
            await pg.wait_for_timeout(700)
            await pg.screenshot(path=f'/home/claude/ecg/shot_{name}_fb.png', full_page=True)
            print(name, 'errores:', errs)
        await b.close()
asyncio.run(main())
