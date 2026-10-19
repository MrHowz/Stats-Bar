# ลง GitHub → Cloudflare Pages → Owlbear Rodeo

ใช้ชุด `pixel-statbar-github.zip` สำหรับขั้นตอนนี้ ชุดนี้มีซอร์สโค้ดที่ Cloudflare ใช้ build และไม่มี node_modules

## 1. แตกไฟล์

คลิกขวา `pixel-statbar-github.zip` → **Extract All / แยกทั้งหมด** → เปิดโฟลเดอร์ที่แตกออกมา

ต้องเห็น `package.json` อยู่ระดับเดียวกับ `src`, `public`, `tests`, `index.html`, `background.html`, `vite.config.ts`, `tsconfig.json`, `package-lock.json`, `.gitignore`, `.node-version` และไฟล์คู่มือ

ให้อัปโหลด **ไฟล์และโฟลเดอร์ข้างในนี้ทั้งหมด** ลงหน้าแรกของ repository อย่าอัปโหลด ZIP เป็นไฟล์เดียว และอย่าลากโฟลเดอร์ครอบอีกชั้น

## 2. สร้าง GitHub repository

1. เปิด https://github.com/new และลงชื่อเข้าใช้
2. Repository name: `pixel-statbar`
3. เลือก Public ถ้าต้องการเปิดซอร์สให้คนอื่นเห็น หรือ Private ถ้าต้องการเก็บซอร์สส่วนตัว ทั้งสองแบบใช้กับ Cloudflare Pages ได้
4. ไม่ต้องให้ GitHub สร้าง README, .gitignore หรือ License เพราะมีไฟล์ของโปรเจกต์แล้ว
5. กด **Create repository**
6. ในหน้า repository ว่าง กด **uploading an existing file** ถ้ามีไฟล์อยู่แล้ว ใช้ **Add file → Upload files**
7. เปิดโฟลเดอร์ที่แตก ZIP เลือกไฟล์ทั้งหมดแล้วลากลงพื้นที่อัปโหลด รอให้เสร็จ
8. ใส่ข้อความ `Add Pixel Statbar` แล้วกด **Commit changes**
9. กลับหน้า Code: ต้องเห็น `package.json`, `src` และ `public` โดยตรง พร้อม branch `main`

[คู่มืออัปโหลดไฟล์ของ GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## 3. เชื่อม Cloudflare Pages

1. เปิด https://dash.cloudflare.com/ และลงชื่อเข้าใช้
2. เข้า **Workers & Pages → Create application → Pages → Connect to Git**
3. เลือก GitHub แล้วทำขั้นตอน **Install & Authorize** ถ้ามีรายการสิทธิ์ repository ให้เลือกเฉพาะ `pixel-statbar`
4. เลือก repository `pixel-statbar` แล้วกด **Begin setup**
5. กำหนดค่าดังตาราง:

| ช่อง | ค่า |
|---|---|
| Project name | `pixel-statbar` หรือชื่ออื่นที่ยังว่าง |
| Production branch | `main` |
| Framework preset | `React (Vite)`; ถ้าไม่มี เลือก `None` แล้วกรอกสองช่องถัดไปเอง |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory / Path | เว้นว่าง เมื่อ package.json อยู่หน้าแรกของ repository |
| Environment variable | ชื่อ `NODE_VERSION` ค่า `24` |

6. กด **Save and Deploy** รอจนแสดง Success
7. คัดลอก Production URL ที่ลงท้าย `.pages.dev` จากหน้าของโปรเจกต์

โปรเจกต์มี `.node-version` ตั้งไว้เป็น 24 ด้วย หากไม่เห็นช่อง Environment variables ในหน้าสร้างก็ใช้ไฟล์นี้ได้

ถ้าหน้าจอแสดงช่อง **Deploy command** ที่ใส่ `wrangler deploy` ให้กลับไปเลือก **Pages** เพราะคู่มือนี้ตั้งค่าสำหรับ Cloudflare Pages

[ขั้นตอนเชื่อม Git ของ Cloudflare](https://developers.cloudflare.com/pages/get-started/git-integration/) · [ค่า build สำหรับ Vite](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [การกำหนด Node.js](https://developers.cloudflare.com/pages/configuration/build-image/)

## 4. ตรวจลิงก์ก่อนใส่ Owlbear Rodeo

นำ Production URL มาต่อท้ายด้วย `/manifest.json` ตัวอย่างรูปแบบ:

```text
https://ชื่อโปรเจกต์ที่ได้รับ.pages.dev/manifest.json
```

ใช้ URL จริงจาก Cloudflare แทนข้อความตัวอย่าง เปิดลิงก์แล้วต้องเห็น JSON ที่มี `"name": "Pixel Statbar"` หากเห็นหน้า Preview แทน JSON แสดงว่า path หรือ build output ยังไม่ถูกต้อง

## 5. เพิ่ม Extension ใน Owlbear Rodeo

1. เปิดหน้าจัดการ Extensions ของบัญชี Owlbear Rodeo แล้วใช้ตัวเลือกเพิ่ม Custom Extension / Add Extension
2. วาง URL `...pages.dev/manifest.json` และเพิ่ม Extension
3. กลับเข้าห้อง เปิดรายการ Extensions ของห้อง และเปิดใช้ **Pixel Statbar**
4. เปิด Scene แล้วเลือกโทเคน Character, Mount หรือ Prop
5. คลิกขวา → Pixel Statbar หรือกดไอคอนหัวใจในแถบ Extension
6. ตั้ง Max HP เช่น `50` และ HP เช่น `50` แถบจะปรากฏ
7. ลอง Quick Actions: ใส่ `10` แล้วกด Damage แถบจะลดตาม HP และใช้ Temp HP ก่อน

ถ้า Stat Bubbles ตัวเดิมยังเปิดอยู่ อาจมีแถบสองชุด ให้ปิดตัวเดิมในห้องเมื่อจะใช้ Pixel Statbar ค่าเดิมของ Stat Bubbles ไม่ได้ถูกนำเข้าอัตโนมัติ

## อัปเดตครั้งต่อไป

อัปโหลดหรือ commit ไฟล์ซอร์สที่แก้ไขไปยัง branch `main` ใน repository เดิม Cloudflare จะ build และ deploy ให้อัตโนมัติ จากนั้นรีเฟรชห้อง Owlbear Rodeo โดยใช้ URL manifest เดิม

## ถ้าติดปัญหา

| อาการ | จุดที่ตรวจ |
|---|---|
| ไม่พบ package.json | ไฟล์ถูกวางในโฟลเดอร์ซ้อน ย้ายให้มาอยู่หน้าแรก หรือกำหนด Root directory ให้ตรง |
| Node version ไม่รองรับ | ตั้ง `NODE_VERSION=24` แล้ว Retry deployment |
| หน้าเว็บว่าง / ไม่พบ assets | Build command ต้องเป็น `npm run build` และ Output ต้องเป็น `dist` |
| manifest เปิดแล้วเป็นเว็บ / 404 | ต้องใช้ `/manifest.json` ที่ root ของ Production URL และมี public/manifest.json ใน repository |
| ยังแสดงหน้าตาเก่า | ดูว่า deployment ใหม่ Success แล้ว และรีเฟรชห้อง Owlbear Rodeo |
| แถบไม่ขึ้น | เปิด Extension ในห้องแล้วหรือยัง, เปิด Scene แล้วหรือยัง, Max HP มากกว่า 0 หรือไม่ |

สถานะชุดนี้: build / lint และการทดสอบอัตโนมัติ 11 กรณีผ่านแล้ว มีการตรวจ UI ในเบราว์เซอร์ การ deploy และการทดสอบในห้อง Owlbear Rodeo จริงเป็นขั้นตอนถัดไป
