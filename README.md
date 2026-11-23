# Krasno-Kamenka Oblast (v14.2 ONLINE — GitHub Pages + PeerJS Edition)

100% static frontend build with **PeerJS WebRTC online multiplayer** and browser `localStorage` accounts—no Python backend required!

## Deploy Free to GitHub Pages (4 Commands)
1. Create a **Public** GitHub repository named `krasno-kamenka` at https://github.com/new.
2. Extract `krasno_kamenka_oblast_v14_2_ONLINE.zip`, `cd krasno_kamenka_oblast`, and run:
   ```bash
   git init
   git add index.html css/ js/ README.md
   git commit -m "Deploy Krasno-Kamenka Oblast v14.2 ONLINE"
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/krasno-kamenka.git
   git push -u origin main
   ```
3. In your repo, go to **Settings → Pages → Build and deployment**, set Branch to **`main`** (`/root`), and click **Save**.
4. Open `https://<YOUR_GITHUB_USERNAME>.github.io/krasno-kamenka/`!

## How to Play Online With Friends
* **Host:** Click **HOST** (on the Start Menu or top-right HUD) to spin up a live `KK-XXXX` room. Click the green **`HOSTING: KK-XXXX (COPY)`** pill to copy a one-click invite link (`?room=KK-XXXX`) and send it to friends!
* **Join:** Click your friend's invite link (auto-joins!) or type their `KK-XXXX` room code and click **JOIN**.
* **Accounts & Dev Access:** Profiles save locally in each player's browser (`kk_accounts_v14`). Dev verification for `"Silver"` uses a salted SHA-256 hash so your secret key is never exposed in the public repository.
