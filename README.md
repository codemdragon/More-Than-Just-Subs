# More Than Just Subs 🥪

Official website & in-browser CMS for **More Than Just Subs** — South Kensington, London.

- **Stack:** Vanilla HTML5, CSS3, JavaScript (no build step, pure static + lightweight Node server for CMS saving).
- **Hosting:** Ready for 1-click deployment on **Vercel**, **GitHub Pages**, or **Netlify**.

---

## 📂 Project Structure

- `index.html` — Homepage
- `menu.html` — Complete Sub & Beverage Menu
- `our-bread.html` — Artisan Bread & Bagel Story
- `about.html` — Brand History & London Heritage
- `locations.html` — South Kensington Store, Map & Weekly Timetables
- `contact.html` — Contact & Press Enquiries
- `content.json` — Single-source-of-truth content database
- `cms/` — Interactive Visual Admin CMS Dashboard (`admin.html`)
- `images/` — Full photo assets, gallery, and brand images
- `css/style.css` — High-performance responsive stylesheet
- `js/main.js` — Client-side dynamic rendering & routing engine

---

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local server:
   ```bash
   npm start
   ```

3. Open in your browser:
   - **Website:** [http://localhost:8080/](http://localhost:8080/)
   - **CMS Dashboard:** [http://localhost:8080/cms/admin.html](http://localhost:8080/cms/admin.html)

---

## ☁️ Deploying to Vercel

1. Push this folder to a new GitHub repository.
2. In [Vercel](https://vercel.com/), click **Add New > Project** and import the repository.
3. Framework Preset: **Other** (Static Site).
4. Click **Deploy**!
