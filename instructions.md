# Deployment & Setup Instructions

## 1. Database Setup (Supabase)

Since this app is built to use Supabase, follow these steps to get your backend ready for free:

1.  **Create a Project**: Go to [Supabase.com](https://supabase.com/), sign up, and create a new project.
2.  **SQL Editor**:
    *   In your Supabase dashboard, go to the **SQL Editor** (icon on the left sidebar).
    *   Click "New Query".
    *   Open the file `db_schema.sql` from this project folder.
    *   Copy and paste the entire content of `db_schema.sql` into the SQL Editor.
    *   Click **Run**. This will create all your tables (`branches`, `semesters`, `subjects`, `units`) and set up security.
3.  **Get Credentials**:
    *   Go to **Project Settings** (gear icon) -> **API**.
    *   Copy the `Project URL` and `anon public` Key.
4.  **Connect App**:
    *   Open `script.js` in your code editor.
    *   Replace `YOUR_SUPABASE_URL_HERE` with your copied URL.
    *   Replace `YOUR_SUPABASE_ANON_KEY_HERE` with your copied Key.

## 2. Uploading PDFs

You need a place to host your PDF files so they have a public URL.
1.  **Supabase Storage**:
    *   Go to **Storage** in Supabase sidebar.
    *   Create a new Bucket named `pdfs`.
    *   Make sure to toggle "Public Bucket" to **ON**.
    *   Upload your PDF files here.
2.  **Get PDF Links**:
    *   After uploading, click "Get URL" for a file.
3.  **Add Data**:
    *   Go to the **Table Editor** in Supabase and insert rows for your branches, subjects, and units.
    *   Paste the PDF URL into the `pdf_url` column of the `units` table.

## 3. Testing Locally

1.  If you haven't set up Supabase yet, the app will automatically use `data.json` as a fallback.
2.  Simply open `index.html` in any web browser (Chrome, Edge, etc.).

## 4. Deployment (GitHub Pages / Vercel)

This app is static-first, meaning it's incredibly easy to host for free.

### Option A: Vercel (Recommended)
1.  Install Vercel CLI or go to [vercel.com](https://vercel.com).
2.  Drag and drop your project folder onto the Vercel dashboard.
3.  It will deploy instantly.

### Option B: GitHub Pages
1.  Push this code to a GitHub repository.
2.  Go to Repository Settings -> Pages.
3.  Select `main` branch and `/root` folder.
4.  Save. Your site will be live at `yourusername.github.io/repo-name`.
