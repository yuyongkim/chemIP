# assets/ghs — GHS 그림문자·H/P 문구

| 파일 | 내용 | 출처 | 라이선스 |
|---|---|---|---|
| `GHS01.svg` … `GHS09.svg` | GHS 그림문자 9종(폭발성·인화성·산화성·고압가스·부식성·급성 독성·경고·건강 유해성·수생환경 유해성) | UNECE GHS 공식 그림문자(EPS, https://unece.org/transport/dangerous-goods/ghs-pictograms)를 SVG 로 옮긴 Wikimedia Commons 사본 `File:GHS-pictogram-<explos·flamme·rondflam·bottle·acid·skull·exclam·silhouette·pollu>.svg` (아래 표) | Public domain (UN 공식 기호, Commons 표기 "Public domain") |
| `phrases.json` | 라벨 만들기가 읽는 H/P 문구(코드 → 한국어·영어 문장) | `scripts/build_ghs_label_phrases.py` 가 `frontend/public/data/ghs_codes.json`(`scripts/build_ghs_code_index.py`)에서 뽑는다. 영어: PubChem GHS 코드표(UN GHS Rev.11, NCBI, 제한 없음). 한국어: KOSHA MSDS 2항 문안(고용노동부 고시 문안의 최빈 표현, 공공데이터). `ko_unofficial` 의 코드는 국내 고시 문안이 아직 없어 ChemIP 가 옮긴 비공식 문장 | PubChem·UN 문안 공개, KOSHA 공공데이터 |

UNECE 사이트는 자동 내려받기를 막아(403) Commons 사본을 받았다(2026-10-31). Commons 설명: "EPS file … from UNECE web site
converted with ImageMagick convert". 파일은 받은 그대로이고 sha1 은 Commons API 값과 같다.

| 코드 | Commons 파일 | sha1 |
|---|---|---|
| GHS01 | GHS-pictogram-explos.svg | 49deeaed978e3dea8a4f74b4309a5c4a7671cad8 |
| GHS02 | GHS-pictogram-flamme.svg | 47a26281017faf09f2c0c05ac03d9711ec32ffc6 |
| GHS03 | GHS-pictogram-rondflam.svg | a09ecfa77ba52b79ca037f99e316963ed46c4eeb |
| GHS04 | GHS-pictogram-bottle.svg | 5bb4e2ce36a676db86ab4e9552b9fe0b35de14bd |
| GHS05 | GHS-pictogram-acid.svg | 8bcb729fdedca2dceb74631cd7cd059315bf91cf |
| GHS06 | GHS-pictogram-skull.svg | c1eac17decdf00e8b7515b57fe5006cb9be6b8d7 |
| GHS07 | GHS-pictogram-exclam.svg | a6e245132c742b95295e7194e79a5299b7de91b2 |
| GHS08 | GHS-pictogram-silhouette.svg | 12a0d5263a9dec1ee9f256fbabd7fba46725ad49 |
| GHS09 | GHS-pictogram-pollu.svg | f38551d20f5c72ac5a8e9eb708f92b647c60905a |

쓰는 곳: 경로는 `ghs_helpers.jsx` 의 `ghsPictogramSrc(code)` 한 곳에서 만든다(`assets/ghs/<code>.svg`). 다른 화면(혼합물 GHS 도우미 등)도
이 함수나 같은 경로를 쓴다. 이 폴더는 배포 때 `deploy/cloudflare/site_rules.mjs` 의 `assets` 복사 규칙으로 Pages 에 함께 올라간다.
PC 의 Next 서버는 새 파일을 재시작 뒤에야 정적 파일로 낸다.
