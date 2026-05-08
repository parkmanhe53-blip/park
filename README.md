# Park 2.0 - 사과 농장 관리 매니저 🍎🌱

**Park 2.0**은 농부님들을 위한 맞춤형 영농 관리 애플리케이션입니다. 사과 농장의 일상 기록부터 AI를 활용한 병충해 진단, 실시간 날씨 기반 작업 추천 기능까지 제공하여 스마트한 농업 환경을 지원합니다.

---

## ✨ 주요 기능

*   **📓 스마트 영농일지**: 작업 내용과 사진을 기록하고 클라우드(Firebase)에 안전하게 보관합니다.
*   **🔬 AI 병충해 진단**: 잎이나 열매 사진을 찍으면 AI(Plant.id)가 질병을 분석하고 방제법을 제안합니다.
*   **⛅ 실시간 날씨 & 작업 추천**: 기상청 데이터를 바탕으로 현재 날씨에 딱 맞는 농작업(방제, 시비 등)을 추천합니다.
*   **🖼️ 농부 갤러리**: 농장의 성장 과정을 사진으로 기록하고 관리합니다.
*   **☁️ 클라우드 동기화**: 모든 데이터는 Firebase를 통해 실시간으로 동기화되어 여러 기기에서 접근 가능합니다.

---

## 🚀 시작하기 (개발자용)

### 1. 필수 요구사항
*   Node.js & npm
*   Expo Go (모바일 확인용)

### 2. 설치 및 실행
```bash
# 의존성 설치
npm install

# 앱 실행
npm start
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 아래 키들을 입력해야 합니다:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

EXPO_PUBLIC_WEATHER_API_KEY=your_weather_key
EXPO_PUBLIC_PLANTID_API_KEY=your_plantid_key
```

---

## 🛠 기술 스택
*   **Frontend**: React Native, Expo
*   **Backend/DB**: Firebase (Firestore, Storage)
*   **APIs**: Plant.id v3 (AI 진단), 기상청 단기예보 API

---

## 🎁 선물 안내
이 앱은 박만희 농부님을 위해 특별히 제작되었습니다. 소중한 영농 기록이 안전하게 보관되기를 바랍니다.

---
*Created with Antigravity AI*
