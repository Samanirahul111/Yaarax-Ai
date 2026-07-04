# 🚀 Yaarax AI Deployment Guide

Don't worry if you haven't deployed an app before! I have prepared the code for you, so all you have to do is follow these simple steps to get your app live on the internet.

## 🟢 Phase 1: Understand Your Database (SQLite)
Your app is already using **SQL**! It uses `SQLite`, which is incredibly fast and stores everything in a file named `studymind.db`. 

Because it's a file on the hard drive, you have two options for deployment:
- **Option A (Paid, Easiest):** Host the backend on Render and add a "Persistent Disk" (costs ~$7/month) so your database file is never deleted.
- **Option B (Free, but Temporary):** Host the backend on Render for free. The app will work perfectly, but every time Render goes to "sleep", your database file will reset and all users/chats will be wiped. This is okay for testing!

## 🔵 Phase 2: Deploy the Backend (Render)
Render will host your Node.js server.
1. Push all your code to a GitHub repository.
2. Go to [Render.com](https://render.com/) and create a free account.
3. Click **New** -> **Web Service** -> **Build and deploy from a Git repository**.
4. Connect your GitHub account and select your repository.
5. Fill in the deployment details:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
6. Click **Advanced** and add these Environment Variables (from your local `.env` file):
   - `PORT`: `3001`
   - `JWT_SECRET`: (Paste your JWT secret here)
   - Add any AI API Keys you need (like `GEMINI_API_KEY`, etc.)
7. *(Optional for Option A)*: Under **Advanced**, click **Add Disk**. Name it `data`, mount path `/var/data`, size 1GB. Then in your code, point your SQLite db path to `/var/data/studymind.db`.
8. Click **Create Web Service**. Wait for it to build and deploy. Once it says "Live", copy the Render URL (e.g., `https://yaarax-server.onrender.com`).

## 🟣 Phase 3: Deploy the Frontend (Vercel)
Vercel will host your sleek React UI.
1. Go to [Vercel.com](https://vercel.com/) and create a free account with your GitHub.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Fill in the deployment details:
   - **Root Directory**: Click "Edit" and select `client`.
   - The Build Command (`npm run build`) and Output Directory (`dist`) should fill automatically.
5. Expand **Environment Variables** and add:
   - Name: `VITE_API_URL`
   - Value: `https://yaarax-server.onrender.com` *(Replace this with the actual URL you got from Render in Phase 2)*
6. Click **Deploy**.

## 🎉 Final Step: Connect the Backend to the Frontend
Once Vercel gives you your live frontend URL (e.g., `https://yaarax-ai.vercel.app`):
1. Go back to your Render Dashboard.
2. Open your Web Service settings.
3. Add one final Environment Variable:
   - Name: `FRONTEND_URL`
   - Value: `https://yaarax-ai.vercel.app` *(Your Vercel URL)*
4. Save the variables (Render will automatically restart).

**You're done!** Your app is now live on the internet! 🥳
