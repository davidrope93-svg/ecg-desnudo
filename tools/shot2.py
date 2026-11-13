import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1280, 'height': 1000})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/ecg/index.html')
        await pg.wait_for_selector('.mode')
        await pg.click('text=Atlas')
        await pg.click('text=SCACEST inferior')
        await pg.click('.seg >> text=Hostil')
        await pg.wait_for_timeout(500)
        await pg.click('text=Compás')
        box = await pg.locator('canvas.ov').bounding_box()
        # medir un RR en la tira larga
        s = box['width'] / 264
        y = box['y'] + (7 + 81 + 27*0.56 - 2) * s
        await pg.mouse.move(box['x'] + 30*s, y); await pg.mouse.down(); await pg.mouse.move(box['x'] + 95*s, y - 8*s, steps=5); await pg.mouse.up()
        await pg.wait_for_timeout(300)
        await pg.locator('.paperwrap').screenshot(path='/home/claude/ecg/shot_atlas_inf.png')
        await pg.select_option('select >> nth=0', 'mon')
        await pg.wait_for_timeout(300)
        await pg.locator('.paperwrap').screenshot(path='/home/claude/ecg/shot_atlas_inf_mon.png')
        print('errores', errs)
        await b.close()
asyncio.run(main())
