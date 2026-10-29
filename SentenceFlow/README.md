# SentenceFlow (Vite + React)

기존 SentenceFlow 화면과 기능을 유지하면서 Vite + React 프로젝트로 정리한 버전입니다. 스타일은 기존 Tailwind CSS 클래스를 유지합니다.

## 포함된 기능

- 문장 등록/수정/삭제 및 즐겨찾기
- 단어 배열, 직접 영작, 혼합 학습
- 학습 기록 및 통계
- 검색/필터/정렬
- JSON 백업 및 복원
- 브라우저 `localStorage` 저장
- 모바일 하단 내비게이션
- GitHub Actions를 통한 GitHub Pages 자동 배포

## 1. 내 컴퓨터에서 실행하기

먼저 Node.js LTS를 설치합니다: https://nodejs.org/

ZIP 압축을 푼 다음, 터미널(명령 프롬프트)을 열고 `package.json`이 있는 `SentenceFlow` 폴더로 이동합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 주소(대개 `http://localhost:5173`)를 브라우저에서 엽니다.

배포용 파일을 로컬에서 미리 확인하려면:

```bash
npm run build
npm run preview
```

## 2. GitHub Pages에 배포하기 (초보자용)

1. GitHub에 로그인하고 **New repository**를 눌러 새 저장소를 만듭니다. 예: `SentenceFlow`
2. ZIP 압축을 푼 폴더 안의 파일과 `.github` 폴더까지 저장소에 업로드합니다. `src`, `index.html`, `package.json`, `vite.config.js` 등이 저장소 최상위에 있어야 합니다.
3. GitHub 저장소에서 **Settings → Pages**로 이동합니다.
4. **Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
5. **Actions** 탭에서 `Deploy SentenceFlow to GitHub Pages` 작업이 실행되는지 확인합니다. 첫 배포에는 몇 분 걸릴 수 있습니다.
6. 작업이 초록색 체크 표시로 끝나면 **Settings → Pages**에 표시되는 사이트 주소를 엽니다. 보통 `https://사용자이름.github.io/SentenceFlow/` 형태입니다.

이 프로젝트에는 `.github/workflows/deploy.yml`이 포함되어 있습니다. `main` 브랜치에 변경사항을 올릴 때마다 자동으로 빌드하고 배포합니다. 저장소의 기본 브랜치가 `main`이 아니라면 workflow의 `branches: [main]`을 실제 브랜치 이름으로 바꾸세요.

## 3. 코드 수정 후 다시 배포하기

`src/App.jsx` 또는 `src/index.css`를 수정하고 GitHub 저장소에 변경사항을 올리면 Actions가 자동으로 다시 배포합니다.

## 데이터 저장 관련 안내

문장과 학습 기록은 서버가 아니라 **현재 브라우저의 localStorage**에 저장됩니다. 따라서 다른 기기나 다른 브라우저와 자동으로 동기화되지 않습니다. 기기를 바꾸기 전에는 앱의 JSON 백업 기능을 이용하세요.

## 문제 해결

- **Actions가 실패함:** 저장소의 Actions 탭에서 실패한 단계의 오류 메시지를 확인하세요.
- **페이지가 404로 나옴:** Settings → Pages에서 GitHub Actions 배포가 완료됐는지 확인하세요.
- **화면 스타일이 사라짐:** `src/index.css`의 Tailwind 지시문과 `tailwind.config.js`의 `content` 경로가 있는지 확인하세요.
- **변경사항이 반영되지 않음:** Actions 배포 완료 후 새로고침하거나 브라우저 캐시를 비워 보세요.
