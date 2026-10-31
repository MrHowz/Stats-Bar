# Pixel Statbar 1.2.1

Extension สำหรับ Owlbear Rodeo: แถบ HP พิกเซลกรอบหิน หัวใจแดง และรอยแตกตามระดับพลัง พร้อม HP / Max HP / Temp HP / AC

สร้างเป็นโปรเจกต์ใหม่แยกจาก Token Waypoint Mover ที่มีอยู่ในเครื่อง ภาพทั้งหมดวาดด้วย SVG จากโค้ดใหม่ตามแนวภาพอ้างอิง ไม่ต้องใช้ไฟล์ภาพอ้างอิงตอนติดตั้ง

## ทดลองทันที

ใช้ Node.js 22.18 ขึ้นไป (ทดสอบด้วย Node 24):

```sh
npm ci
npm run dev
```

เปิด http://127.0.0.1:5174/ เพื่อทดลองกับโทเคนจำลอง มีปุ่มสลับ GM / Player และเริ่มทดลองใหม่ ข้อมูลทดลองเก็บใน localStorage ของเครื่องนี้เท่านั้น ไม่กระทบห้อง Owlbear Rodeo

- `/?panel=1` แสดงหน้าต่าง Extension อย่างเดียว
- `/?context=1` แสดงหน้าต่างแก้ค่าสำหรับเมนูคลิกขวา

## ติดตั้งใช้งานจริง

1. ใช้ไฟล์ `pixel-statbar-deploy.zip` ที่จัดไว้ หรือรัน `npm run build` เพื่อสร้างโฟลเดอร์ `dist` ใหม่
2. นำ **ไฟล์ข้างใน dist** ไปอัปโหลดที่ root ของเว็บไซต์ HTTPS สำหรับ Extension นี้ เช่น Cloudflare Pages หรือ Netlify ไม่ใช่อัปโหลดทั้ง node_modules และไม่วางไว้ใต้ subpath
3. ตรวจว่า `https://ชื่อเว็บของคุณ/manifest.json` เปิดได้และแสดงชื่อ **Pixel Statbar**
4. เพิ่ม URL นี้เป็น Custom Extension ใน Owlbear Rodeo แล้วเปิดใช้งาน Pixel Statbar ในห้องที่ต้องการ
5. เปิด Scene เลือกโทเคน คลิกขวาและเลือก Pixel Statbar หรือกดไอคอนหัวใจในรายการ Extension ของห้อง
6. กำหนด Max HP มากกว่า 0 แล้วกำหนด HP ปัจจุบัน แถบจะปรากฏเอง

ไฟล์ที่โฮสต์ต้องมี `index.html`, `background.html`, `manifest.json`, `icon.svg` และโฟลเดอร์ `assets` ส่วน `_headers` เป็นการตั้งค่าโฮสต์ที่รองรับ เช่น Cloudflare Pages / Netlify ต้องอนุญาต iframe จาก Owlbear Rodeo จึงไม่ควรเพิ่ม `X-Frame-Options: DENY` หรือ `SAMEORIGIN`

หากเปิด Stat Bubbles เดิมและ Pixel Statbar พร้อมกัน ทั้งสองตัวอาจแสดงแถบทับกัน ควรปิดตัวเดิมในห้องเมื่อต้องการใช้แถบใหม่ ข้อมูลจาก Stat Bubbles เดิมไม่ได้ถูกนำเข้าหรือแก้ไขอัตโนมัติ

### พัฒนาด้วย HTTPS ในเครื่อง

`npm run dev:https` เปิดเซิร์ฟเวอร์ที่ https://localhost:5174/ โดยใช้ใบรับรองสำหรับการพัฒนา เบราว์เซอร์อาจให้ผู้ใช้จัดการใบรับรองด้วยตนเอง URL localhost ใช้ได้เฉพาะเครื่องที่รันเซิร์ฟเวอร์ ผู้เล่นเครื่องอื่นต้องใช้ URL HTTPS ที่โฮสต์ออนไลน์

## การเปลี่ยนแปลงใน 1.1.0

- หน้าหลักเป็นตารางแก้ HP / Max / Temp / AC ได้ทันที มีภาพโทเคน ช่องสิทธิ์ และการเลือกหลายโทเคน
- เมนูสามจุดของโทเคนเป็นแบบย่อ สูง 300px ไม่มีแถบเลื่อนภายในตามขนาดปกติของเมนู
- ระยะห่างตั้งได้ตั้งแต่ -100 ถึง 100: 0 ชิดขอบ และค่าติดลบให้แถบซ้อนเข้าใกล้โทเคน ค่าเริ่มต้นใหม่คือ 2 (ค่าที่ตั้งไว้ในห้องเดิมยังใช้ต่อ)
- Temp HP เป็นหัวใจเขียวและ AC เป็นโล่พิกเซล อยู่คู่กันใต้ด้านขวาของแถบ HP ค่า 0 ซ่อนรูปนั้นและจัดตำแหน่งรูปที่เหลือชิดขวา
- ภาพใช้เส้นทาง /bars-v3/ และสร้างอัตโนมัติตอน npm run build ต้องอัปโหลดโฟลเดอร์ scripts ด้วย

## การใช้งาน

| สิ่งที่ต้องการ     | วิธีใช้                                                              |
| ------------------ | -------------------------------------------------------------------- |
| เปลี่ยนค่าสถานะ    | พิมพ์ตัวเลขแล้วกด Enter หรือ Tab / คลิกออกจากช่อง                    |
| บวกหรือลบ          | พิมพ์ `+6`, `-6`, `20-5`, `(4+6)*2` รองรับทั้งสี่ช่อง                |
| ยกเลิกสิ่งที่พิมพ์ | กด Escape                                                            |
| รับความเสียหาย     | กรอกจำนวนใน Quick Actions แล้วกด Damage จะหัก Temp HP ก่อน HP        |
| รักษา              | กด Heal เพิ่ม HP แต่ไม่เกิน Max HP                                   |
| ได้ Temp HP        | กด Temp ใช้ค่าที่สูงกว่าระหว่างค่าเดิมกับค่าใหม่ ไม่บวกทบกัน         |
| ผลแบบ AoE          | เลือกหลายโทเคนบนแผนที่หรือเช็กในรายการ แล้วใช้ Quick Actions         |
| แก้ชื่อ            | คลิกขวา → Pixel Statbar แล้วแก้ช่องชื่อด้านบน                        |
| ตั้งค่ารูปลักษณ์   | GM กดฟันเฟือง เลือกตำแหน่ง ความกว้าง ระยะห่าง ตัวเลข ชื่อ และกรอบแตก |

การพิมพ์ `-6` ในช่อง HP คือการแก้ HP โดยตรง ไม่หัก Temp HP ถ้าต้องการความเสียหายตามกติกาให้ใช้ปุ่ม Damage

รองรับโทเคนภาพบนชั้น Character, Mount และ Prop ค่า 0 ใน Max HP จะไม่วาดแถบ HP และค่า 0 ใน Temp HP / AC จะซ่อนช่องนั้นบนแผนที่

### สิทธิ์และการมองเห็น

GM กำหนดต่อโทเคนได้สี่แบบ:

- **ตัวเลขทั้งหมด:** แสดง HP / Temp HP / AC
- **เฉพาะแถบแบ่งช่วง:** ผู้เล่นที่ไม่ใช่เจ้าของเห็นเฉพาะ 4 / 5 / 10 ช่วง ไม่เห็นตัวเลขหรือ AC / Temp HP
- **เฉพาะเจ้าของและ GM:** เจ้าของอ้างอิงผู้สร้างโทเคนใน Owlbear Rodeo
- **เฉพาะ GM:** ซ่อนทั้งแถบและรายการจากผู้เล่น

สิทธิ์แก้ไขยังขึ้นกับสิทธิ์ UPDATE ของแต่ละชั้นและ CHARACTER_OWNER_ONLY ของห้อง โทเคนที่ซ่อนจะไม่ปรากฏใน UI ของผู้เล่น

การซ่อนเป็นการควบคุมการแสดงผลใน Extension ไม่ใช่การเข้ารหัสข้อมูล ค่าสถานะบันทึกใน metadata ของโทเคนตามระบบ SDK ควรใช้เพื่อการเล่นเกม ไม่ใช้เก็บข้อมูลลับจริง

ค่าตั้งต้นของห้องและค่าของ Scene แยกกัน: Scene overrides มีผลเหนือ room settings กด “ใช้ค่าจากห้อง” เพื่อล้างค่า override ของ Scene

## โครงสร้าง

- `src/model.ts`: การคำนวณและสิทธิ์
- `src/art.ts`: งานพิกเซล SVG และการแปลงเป็น PNG สำหรับ Scene
- `src/store.ts`: บันทึก/อ่าน metadata และโหมดทดลอง
- `src/renderer.ts`: สร้างและอัปเดต local overlay ผูกกับโทเคน
- `src/background.ts`: ตัวทำงานเบื้องหลังและ context menu (แถบยังทำงานแม้ปิดหน้าต่าง Extension)
- `src/App.tsx`: รายการโทเคน ตัวแก้ไข และการตั้งค่า

Metadata: `com.pixel-statbar/stats` บนโทเคน, `com.pixel-statbar/settings` บนห้องหรือ Scene, `com.pixel-statbar/overlay` บน local overlays

เวอร์ชัน 1.1.0 ใช้ PNG ที่โฮสต์บนเว็บแทน data URL ภาพทั้งหมดสร้างอัตโนมัติด้วย scripts/build-art.mjs ตอน build ส่วนชื่อและตัวเลขใช้ข้อความของ Owlbear และไม่ส่งค่าไปสร้างภาพบนเซิร์ฟเวอร์ หนึ่งโทเคนใช้ภาพประกอบไม่เกิน 5 ชิ้น แถบติดตามตำแหน่งโดย attachment ไม่หมุนไปตามโทเคนและจะถูกอัปเดตเมื่อย้าย/หมุน/ปรับขนาด โดยแต่ละผู้เล่นวาดตามสิทธิ์ของตนเอง ไม่เพิ่มภาพถาวรลง Scene

## การตรวจสอบ

```sh
npm test
npm run lint
npm run build
```

การทดสอบครอบคลุมการคำนวณ, Temp HP, clamp, visibility/permissions, แถบแบ่งช่วง, การใช้ overlay เดิม, การย้ายและลบโทเคน และการปิด Scene ระหว่างวาด โดยการทดสอบ renderer ใช้ SDK จำลอง รวมถึงการนำชิ้นภาพเดิมกลับมาใช้และการล้างชิ้นภาพที่ไม่ใช้แล้ว เปิด /tests/rasterize.browser.html ระหว่าง npm run dev เพื่อทดสอบการโหลด PNG จากเว็บในเบราว์เซอร์

ทดสอบหน้า Preview ผ่านเบราว์เซอร์แล้ว แต่ยังไม่ได้ติดตั้ง build นี้ลงห้อง Owlbear Rodeo จริงหรือทดสอบผู้เล่นสองเครื่อง ข้อมูลสองคนแก้โทเคนเดียวกันพร้อมกันใช้ last-write-wins ตาม metadata ของ SDK

ขอบเขตเวอร์ชัน 1.0: เน้นแถบและการแก้ค่าสถานะ มี batch damage/heal/temp แต่ไม่มี dice command / roll log, เครื่องมือวาดพื้นที่ AoE, การนำเข้าข้อมูลจาก Stat Bubbles หรือการซิงก์ชื่อกับ initiative extensions

## อ้างอิงพฤติกรรมและ API

- [Stat Bubbles for D&D](https://extensions.owlbear.rodeo/bubble-tracker)
- [Owlbear Rodeo SDK](https://docs.owlbear.rodeo/extensions/getting-started/)
- [Context Menu API](https://docs.owlbear.rodeo/extensions/apis/context-menu/)
- [Local scene items](https://docs.owlbear.rodeo/extensions/apis/scene/local/)
- [Hosting an extension](https://docs.owlbear.rodeo/extensions/tutorial-sharing-your-extension/)

Pixel Statbar เป็น Extension แยกอิสระ ไม่ใช่ผลิตภัณฑ์อย่างเป็นทางการของ Stat Bubbles หรือ Owlbear Rodeo

## 1.2.0 — UI มาตรฐานและระยะเริ่มต้น

ใช้ Material UI 6 จริงเหมือน Token Portrait: OutlinedInput, Select/MenuItem, Checkbox, Slider และ Button พร้อม palette จาก OBR.theme.getTheme()/onChange รองรับธีมสว่างและมืด พื้นหลัง iframe โปร่งใส ขอบมน 12px ตามแนวทาง Owl Trackers และ ThemeProvider ของ Initiative Tracker

ช่องผู้เล่นเห็นแสดงข้อความ ทุกคน / แบ่งช่วง / เจ้าของ / GM และเมนูมีชื่อเต็ม ฟอนต์ Roboto + Noto Sans Thai รวมใน build พร้อมใบอนุญาต ไม่ต้องโหลดจาก Google Fonts ตัวเลขใช้ tabular numerals เพื่ออ่านเทียบกันง่าย

ระยะเริ่มต้นใหม่ -12 (เดิม 2) ค่าที่ตั้งไว้ชัดเจนในห้อง/Scene ยังเก็บเดิม กดตั้งค่า → ใช้ระยะเริ่มต้น (-12) เพื่อใช้กับห้องเดิมใน scope ที่เลือก การมองเห็นและสิทธิ์แก้ค่าสถานะไม่เปลี่ยน

แนวทางอ้างอิง:

- https://github.com/owlbear-rodeo/initiative-tracker/blob/main/src/PluginThemeProvider.tsx
- https://github.com/SeamusFinlayson/owl-trackers/blob/main/src/getTheme.ts
- https://docs.owlbear.rodeo/extensions/apis/theme/


## 1.2.1 UI and numeral correction
- MUI + OBR Theme API; radius16 follows the official Initiative Tracker example. Owl Trackers and official Dice also use MUI.
- Transparent full-height panel lets Owlbear supply its own surface; actions stay at the bottom.
- Original pixel numeral font is bundled for editable stat inputs. The same 5x7 outlines are used by preview SVG and hosted PNG glyphs on the map, including Temp and AC.
- No custom font installation required on player devices. Names retain a readable normal font.
- Existing saved settings preserved; default offset stays -12.
- References: https://github.com/owlbear-rodeo/initiative-tracker/blob/main/src/PluginThemeProvider.tsx ; https://github.com/SeamusFinlayson/owl-trackers/blob/main/src/getTheme.ts ; https://github.com/owlbear-rodeo/dice/blob/main/package.json


## 1.2.2
Slimmer stone frame and larger red HP channel. Numeric glyphs render above badge backgrounds, preventing partially hidden Temp/AC values. Narrower name column leaves more width for editable stats. Distance shown as 0 now maps to the previous -20 position; saved positions remain unchanged. Use the default-distance button to apply the new base to existing rooms.


## 1.2.4
Removed the amount box and Damage/Heal/Temp buttons from both panels. Edit each stat directly with a number or relative expression. Token context menu is named Pixel statbar and contains name, four stat fields and visibility; its bar preview is removed. Main-panel stat fields use 18px numerals and 62px rows for readability.


## 1.2.5
Larger Temp HP heart and AC shield (160px artwork, previously112px). Increased HP numeral size and badge numeral size, with stronger dark outlines. Hosted artwork moved to bars-v5 to avoid stale cached glyphs. Long numbers still shrink to fit.


## 1.3.0
Health rendering now uses one fixed frame PNG and one fixed red fill PNG. HP changes update horizontal scale of the red fill without swapping health-state images. Numeric labels remain on top. At zero HP the red fill is removed. Artwork generation is reduced to19 static files. Existing settings and stat metadata remain compatible.


## 1.3.1
Remote-movement synchronization: let native attachments handle pure translation, discard rendering snapshots invalidated by newer scene events, throttle updates without starving continuous drags, and reconcile settled geometry at350ms and1000ms. Scene shutdown cancels reconciliation timers. Regression coverage includes remote translation, repairing local drift and movement while artwork is pending. Two live clients still require user verification after deployment.


## 1.3.2
Settled movement checks no longer unconditionally rewrite local bars. Aligned bars are left untouched; positional corrections require the same drift across two quiet checks and a stable token transform. Obsolete render snapshots no longer clear all committed signatures. Signatures commit after local writes, preventing unnecessary redraws during network interpolation. Regression tests check aligned no-op audits, changing interpolation offsets, confirmed drift repair and untouched shared token positions. Live two-client network playback remains to be verified after deployment.
