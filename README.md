# 🦉 StudyDuo — Collaborative Gamified Study Planner

<p align="center">
  <img src="./brand_kit_extracted/StudyDuo_Brand_Kit/logo/studyduo-owl-duo-master.png" alt="StudyDuo Mascot Logo" width="160" />
</p>

<p align="center">
  <strong>Study together, stay consistent, level up together.</strong><br/>
  An AI-powered, gamified study planner designed for dual learning partners, study buddies, and self-directed students.<br/><br/>
  <a href="https://study-duo-taupe.vercel.app/" target="_blank">
    <strong>🌐 Live Production Web App: https://study-duo-taupe.vercel.app/</strong>
  </a>
</p>

---

## ✨ Features & Capabilities

### 1. 🗺️ Shared & Solo Study Roadmaps
- Multi-phase structured curriculum breakdowns.
- Daily quest and task tracking with completion timestamps.
- Milestone checkpoints, rest-day scheduling, and customizable pacing.

### 2. 🤝 Duo Flame & Accountability
- Duo Flame streak multiplier for keeping consistency with your study partner.
- Interactive Duo Nudges to remind friends to complete tasks before midnight.
- Live progress comparison, XP leaderboards, and co-op achievement badges.

### 3. 🎨 12-Slot Custom Avatar Studio
- Full cosmetic customization engine: Skin tone, face expression, hairstyles, outfits, accessories, hats, glasses, and dynamic backgrounds.
- Real-time SVG avatar rendering across leaderboards, study cards, and live chat.

### 4. 🧠 Bujji AI 2.0 Study Coach
- Powered by Google Gemini 2.5 Flash / Flash-Lite models.
- Generates tailored daily quizzes with instant grading and XP rewards.
- Provides intelligent roadmaps, study summaries, and personalized revision plans.

### 5. 📱 Progressive Web App & APK Support
- Fully responsive across desktop, tablet, and mobile devices.
- Direct **Android APK download** ready to install (`/StudyDuo-v1.0.0-release.apk`).
- Offline-resilient local caching for continuous learning anywhere.

---

## 🎨 Brand Design System

StudyDuo incorporates an uplifting pastel and clean corporate aesthetic inspired by modern study tools:

| Element | Color / Token | Usage |
|---|---|---|
| **Primary Purple** | `#7651E8` | Primary actions, key badges, brand identity |
| **Soft Lavender** | `#A78BFA` / `#E9DFFF` | Card backgrounds, active state rings |
| **Golden Accent** | `#FFC857` | XP scores, level medals, streak badges |
| **Canvas Background** | `#F8F5FF` | Soft ambient page canvas |
| **Card Surface** | `#FFFFFF` | Clean elevated content containers |
| **Typography** | **Plus Jakarta Sans** | Modern geometric typography with high legibility |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` package manager

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm install --legacy-peer-deps
```

### 2. Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 📦 Android APK Release

StudyDuo includes a release package ready for download:
- **Download Link:** In the app sidebar, click **"Download APK"** or navigate directly to `http://localhost:3000/StudyDuo-v1.0.0-release.apk`.
- **Package:** `StudyDuo-v1.0.0-release.apk`
- **Installation:** Enable *"Install from Unknown Sources"* on your Android device and tap the downloaded APK to install.

---

## 🛠️ Tech Stack
- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4 with Plus Jakarta Sans typography
- **Backend & Auth:** Firebase Auth, Cloud Firestore, Express
- **AI Engine:** Google Gemini API (`@google/genai`)
- **Icons:** Lucide Icons & Official StudyDuo Brand Kit
