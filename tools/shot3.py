import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/ecg/index.html')
        await pg.wait_for_selector('.mode')
        await pg.click('text=Examen · 10 ECG')
        for i in range(10):
            await pg.wait_for_timeout(150)
            await pg.click('.opt >> nth=%d' % (i % 5))
        await pg.wait_for_selector('.res')
        await pg.screenshot(path='/home/claude/ecg/shot_res.png')
        await pg.click('.res >> nth=0'); await pg.wait_for_timeout(400)
        await pg.click('text=Siguiente ›'); await pg.wait_for_timeout(300)
        await pg.click('text=‹ Resultado'); await pg.click('text=Inicio')
        await pg.click('text=Lista completa'); await pg.click('.mode.primary'); await pg.wait_for_timeout(300)
        await pg.click('.glist .opt >> nth=3'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='/home/claude/ecg/shot_list_fb.png', full_page=False)
        await pg.click('text=Siguiente ECG ›'); await pg.wait_for_timeout(300)
        await pg.click('#btn-stats'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='/home/claude/ecg/shot_stats.png')
        print('errores', errs)
        await b.close()
asyncio.run(main())
