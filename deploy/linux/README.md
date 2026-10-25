# ChemIP 클라우드 이전 키트 (Linux VM)

지금 ChemIP는 사장님 PC(pm2 `T3-ChemIP-Backend` 127.0.0.1:7011, `T3-ChemIP-Frontend` :7000)에서 돌고, Cloudflare Tunnel `chemip`을 거쳐 `chemip.yule.pics`로 공개되어 있습니다. 이 폴더는 같은 구성을 Ubuntu VM 한 대로 옮기는 데 필요한 파일입니다.

- 1순위 VM: Oracle Cloud Always Free, Ampere A1(ARM64), Ubuntu 24.04, 서울(ap-seoul-1)
- 2순위 VM: Contabo VPS(x86_64), Ubuntu 24.04

PC 서비스는 전환하는 동안 멈추지 않습니다. 이전은 DNS 레코드 하나(`chemip.yule.pics`)를 새 터널로 돌리는 것으로 끝나고, 되돌릴 때도 그 레코드만 다시 돌리면 됩니다.

## 파일

| 파일 | 맡은 일 |
|---|---|
| `README.md` | 이 문서. 이전 순서, 용량, 클라우드에서 되는 기능과 꺼지는 기능 |
| `manifest.txt` | 서버에 올릴 파일 목록. 업로드 대상은 이 파일 한 곳에서만 정합니다 |
| `layout.env` | 서버 경로·계정·포트. 셸 스크립트가 함께 읽습니다 |
| `bootstrap.sh` | OS 준비: 패키지, Node 22, cloudflared, `chemip` 계정, `/srv/chemip`, 방화벽, 스왑 |
| `sync_to_server.ps1` | Windows 쪽 업로드: code.tar 묶기, SQLite 스냅숏, scp, 서버 설치 실행 |
| `install_app.sh` | 서버 쪽 설치·갱신: 코드 반영, 자료 배치, venv, npm ci·빌드, systemd 재시작, 검증 |
| `requirements-server.txt` | 저장소 requirements.txt에 빠진 런타임 패키지(pandas·openpyxl·xlrd) |
| `env.server.example` | `/etc/chemip/chemip.env` 틀. 비밀값의 이름만 있고 값은 없습니다 |
| `chemip-backend.service` | systemd 백엔드 유닛(127.0.0.1:7011). 비밀 아닌 설정이 모두 여기 있습니다 |
| `chemip-frontend.service` | systemd 프론트엔드 유닛(127.0.0.1:7000) |
| `cloudflared-config.yml.template` | 서버 전용 터널 설정 틀(자격 파일 경로만 적고 비밀은 넣지 않습니다) |
| `verify.sh` | 동작 확인(백엔드 직통 → 프론트 → 공개 주소). 실패가 있으면 종료 코드 1 |
| `.gitignore` | `_staging/`(업로드 전 스냅숏을 두는 곳)을 커밋에서 뺍니다 |

## 서버 크기와 용량

| 항목 | 값 |
|---|---|
| 올리는 양(첫 이전) | 약 **2.58 GB**. terminology.db 2.40 GB, incidents.db 94 MB, 코드 48 MB, 가이드 29 MB, 나머지 20 MB |
| 서버 디스크 사용 | 약 5 GB(자료 2.6 GB, venv 0.4 GB, node_modules·.next 0.6 GB, 로그). **20 GB 이상 여유** 권장 |
| 메모리 | 실행 중 약 1 GB(백엔드와 Next). `next build` 순간 최대 약 2 GB |
| 권장 사양 | Oracle A1: 2 OCPU / 12 GB(무료 한도는 4 OCPU / 24 GB), 부트 볼륨 50 GB · Contabo: 4 vCPU / 8 GB |
| 스왑 | RAM이 8 GB보다 적으면 bootstrap이 `/swapfile` 4 GB를 만듭니다 |
| 열리는 포트 | 들어오는 연결은 ssh(22)뿐입니다. 앱은 127.0.0.1에서만 듣고, cloudflared는 밖으로 나가는 연결만 씁니다 |

## 클라우드에서 되는 기능과 꺼지는 기능

| 기능 | 클라우드 | 근거 |
|---|---|---|
| 물질 검색·상세(MSDS) | 됨 | terminology.db와 KOSHA API(`KOSHA_SERVICE_KEY_*`) |
| 수출입 규제(카탈로그, CAS별) | 됨 | `backend/data/trade_controls`(code.tar에 포함) |
| KOSHA 가이드 | 됨 | `guides.json`과 `normalized/guide_documents_text.json`만 올립니다(PDF 539 MB는 쓰지 않습니다) |
| 취급 회사(PRTR) | 됨 | `data/prtr/*`와 PRTR API 키 |
| 사고 사례(Chem_Eng) | 됨 | incidents.db 사본(읽기 전용) |
| EPA 집행(ECHO), 한국 인허가 | 됨 | `echo_cas_index.db`, `kr_permit_context.db` |
| 특허 탭 | **KIPRIS API만** | `KIPRIS_API_KEY` 필요. 키가 없거나 등록되지 않은 키면 `/api/patents`가 502(`KIPRIS API error`)를 돌려줍니다. 백엔드는 죽지 않습니다 |
| 글로벌 특허 색인(135 GB), USPTO 색인(5.9 GB) | **꺼짐** | 파일이 없으면 `PatentIndexBase._connect()`가 경고만 남기고 빈 목록을 돌려줍니다. 500 없이 `results: []`가 나오고 빈 DB 파일도 만들지 않습니다. 테스트: `tests/test_patent_index_missing.py` |
| EPC 조문 검색(127.0.0.1:15412) | **꺼짐** | 서비스가 없어 연결이 거부되고 화면은 "연결하지 못했습니다"로 물러납니다(200 응답) |
| AI 보고서의 로컬 LLM(Ollama) | **꺼짐** | `LLM_ENABLED=false`. 규칙 기반 요약 보고서로 물러납니다 |
| 요청 게시판, 이용 집계 | 됨 | `feedback.db`, `usage.db`는 `-IncludeState`를 줄 때만 옮깁니다 |

특허 색인을 나중에 켜려면 블록 볼륨(Oracle 무료 블록 스토리지는 부트 볼륨 포함 200 GB)에 DB를 올리고, `chemip-backend.service`의 `GLOBAL_PATENT_INDEX_DB_PATH`와 `USPTO_INDEX_DB_PATH` 경로만 바꾸면 됩니다.

## 이전 순서

명령은 PowerShell(PC) 또는 ssh 세션(서버)에서 실행합니다. `<IP>`는 VM 공인 IP입니다. ssh 계정은 Oracle이면 `ubuntu`, Contabo면 `root`입니다.

### 0. ssh 키 만들기(PC, 1분)

```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\chemip_cloud -C chemip-cloud
Get-Content $HOME\.ssh\chemip_cloud.pub   # VM을 만들 때 이 공개키를 붙여 넣습니다
```

### 1. VM 만들기(사장님이 직접, 5~10분)

- Oracle: Compute → Instance → Image `Canonical Ubuntu 24.04`(aarch64), Shape `VM.Standard.A1.Flex` 2 OCPU / 12 GB, 공인 IPv4 할당, 위에서 만든 공개키 붙여 넣기, 부트 볼륨 50 GB. 보안 목록은 기본값(22번만 열림) 그대로 둡니다. 서울 리전에서 "Out of capacity"가 나오면 OCPU를 1로 줄이거나 시간을 두고 다시 시도합니다.
- Contabo: Ubuntu 24.04를 고르고 SSH 키를 등록합니다.

### 2. 접속과 OS 준비(5분)

```powershell
ssh -i $HOME\.ssh\chemip_cloud ubuntu@<IP> "echo ok"
scp -i $HOME\.ssh\chemip_cloud -r G:\MSDS\deploy\linux ubuntu@<IP>:chemip-kit
ssh -t -i $HOME\.ssh\chemip_cloud ubuntu@<IP> "sudo bash chemip-kit/bootstrap.sh"
```

미리 보기만 하려면 `DRY_RUN=1 bash chemip-kit/bootstrap.sh`를 실행합니다. 루트 권한 없이 할 일만 출력합니다.

### 3. 비밀값 넣기(사장님이 직접, 3분)

```bash
sudo nano /etc/chemip/chemip.env
```

`G:\MSDS\.env`에서 같은 이름의 값을 옮겨 적습니다. 따옴표로 감싼 값도 그대로 붙여 넣어도 됩니다. systemd가 따옴표를 벗겨 냅니다. 다만 두 가지는 이름을 바꿔 적어야 합니다.

- PC의 `PRTR_API =`(이름 뒤에 공백) → `PRTR_ACCESS_KEY=`
- PC의 `유해화학시설_API =` → `HAZMAT_FACILITY_API_KEY=`

`.env` 파일 자체는 어떤 스크립트도 올리지 않습니다.

### 4. 코드와 자료 올리기(PC, 10~15분)

```powershell
cd G:\MSDS
powershell -ExecutionPolicy Bypass -File deploy\linux\sync_to_server.ps1 -PlanOnly -IncludeState     # 목록과 용량만 확인
powershell -ExecutionPolicy Bypass -File deploy\linux\sync_to_server.ps1 -Server ubuntu@<IP> -IdentityFile $HOME\.ssh\chemip_cloud -IncludeState
```

스크립트가 하는 일은 다음과 같습니다.

1. code.tar를 묶습니다(`.env`, `__pycache__`, `node_modules`, `.next`, 로그는 제외).
2. SQLite를 backup API로 스냅숏합니다. PC 서비스가 돌고 있어도 일관된 사본이 나오고 `quick_check`도 거칩니다. 원본이 그대로면 다음 실행 때 스냅숏을 다시 씁니다.
3. `scp -C`로 서버의 `~/chemip-incoming`에 올립니다.
4. 서버에서 `install_app.sh`를 sudo로 실행합니다. 코드 반영 → 자료 배치 → venv·pip → npm ci → next build → systemd 시작 → `verify.sh`.

스냅숏은 기본으로 `deploy\linux\_staging`에 둡니다. G: 대신 다른 드라이브를 쓰려면 `-StagingDir E:\dev-cache\chemip-staging`을 줍니다. 이후 코드만 고쳤을 때는 `-Parts code`로 올립니다.

### 5. 서버 전용 터널 만들고 사전 확인(5분)

PC의 기존 터널 `chemip`(호스트 25개를 함께 서비스)의 자격 파일은 **서버로 복사하지 않습니다.** 복사하면 다른 도메인의 요청까지 서버로 나뉘어 들어갑니다. 서버용 터널을 새로 만듭니다. PC에는 이미 `cert.pem`으로 로그인되어 있으므로 PC에서 만듭니다.

```powershell
cloudflared tunnel create chemip-cloud                 # UUID와 자격 JSON 경로(~\.cloudflared\<UUID>.json)가 출력됩니다
cloudflared tunnel route dns chemip-cloud chemip-staging.yule.pics
scp -i $HOME\.ssh\chemip_cloud $HOME\.cloudflared\<UUID>.json G:\MSDS\deploy\linux\cloudflared-config.yml.template ubuntu@<IP>:
```

서버에서 실행합니다.

```bash
sudo install -d -m 0755 /etc/cloudflared
sudo install -m 0600 ~/<UUID>.json /etc/cloudflared/<UUID>.json && rm ~/<UUID>.json
sed "s/<TUNNEL_UUID>/<UUID>/g" ~/cloudflared-config.yml.template | sudo tee /etc/cloudflared/config.yml >/dev/null
sudo cloudflared service install          # /etc/cloudflared/config.yml로 systemd 서비스를 등록합니다
PUBLIC_URL=https://chemip-staging.yule.pics bash /srv/chemip/app/deploy/linux/verify.sh
```

staging 주소에서는 Origin이 `chemip-staging`이라 요청 게시판 쓰기(POST)가 CSRF 검사에 막힙니다. 조회는 모두 됩니다.

### 6. 전환(1분)

```powershell
# 1) 운영 상태 DB(요청 게시판·이용 집계)를 마지막으로 맞춥니다
powershell -ExecutionPolicy Bypass -File deploy\linux\sync_to_server.ps1 -Server ubuntu@<IP> -IdentityFile $HOME\.ssh\chemip_cloud -Parts none -IncludeState
# 2) DNS를 새 터널로 돌립니다. Cloudflare 프록시 레코드라 몇 초 안에 반영됩니다
cloudflared tunnel route dns --overwrite-dns chemip-cloud chemip.yule.pics
```

서버에서 공개 주소로 확인합니다.

```bash
PUBLIC_URL=https://chemip.yule.pics bash /srv/chemip/app/deploy/linux/verify.sh
```

### 7. 되돌리기(1분)

PC의 pm2 서비스와 기존 터널 `chemip`은 전혀 건드리지 않았으므로 DNS만 돌려놓으면 됩니다.

```powershell
cloudflared tunnel route dns --overwrite-dns chemip chemip.yule.pics
```

전환한 뒤 서버에 새 요청 글이 쌓였다면 서버의 `/srv/chemip/app/data/feedback.db`를 PC로 받아 옵니다. PC 백엔드가 그 파일을 열고 있으므로 `pm2 stop T3-ChemIP-Backend` → 복사 → `pm2 start T3-ChemIP-Backend` 순서로 합니다.

### 8. 안정화 후(선택)

- 며칠 지켜본 뒤 PC의 `T3-ChemIP-*`를 멈출지는 사장님이 정합니다. PC 터널 설정의 `chemip.yule.pics` ingress 줄은 DNS가 가리키지 않으므로 남겨 두어도 영향이 없습니다.
- staging 주소는 Cloudflare 대시보드에서 DNS 레코드를 지우고, 서버 `/etc/cloudflared/config.yml`에서 해당 블록을 지운 뒤 `sudo systemctl restart cloudflared`를 실행합니다.

## 운영 명령(서버)

```bash
systemctl status chemip-backend chemip-frontend cloudflared
journalctl -u chemip-backend -n 100 --no-pager
sudo systemctl restart chemip-backend           # chemip.env를 고친 뒤
bash /srv/chemip/app/deploy/linux/verify.sh     # 언제든 다시 확인
```

## 걸리는 시간(추정)

| 단계 | 시간 |
|---|---|
| 0~1 키와 VM(사장님 작업) | 10분 |
| 2 bootstrap | 3~5분 |
| 3 비밀값 | 3분 |
| 4 스냅숏(약 1분) + 업로드 2.6 GB + 설치(pip 2분, npm ci·build 3~5분) | 업로드 50 Mbps 기준 15~20분 |
| 5~6 터널과 전환 | 5분 |
| **합계** | **약 40분. 사장님이 손대는 시간은 15분 정도입니다** |

## 로컬 시험 기록(2026-10-25, WSL Ubuntu-24.04)

PC 서비스와 C: 디스크는 건드리지 않았습니다. 시험 배치는 `E:\dev-cache\chemip-dryrun`에 두었습니다.

- 정적 검사: `bash -n` 3개 파일 통과, shellcheck 0.11.0 경고 0건, PowerShell 파서 오류 0건, `DRY_RUN=1 bootstrap.sh` 정상 출력
- `sync_to_server.ps1 -LocalDir`: code.tar 396개 파일 48 MB, terminology.db 스냅숏 61초
- `install_app.sh --no-systemd`: 코드·자료 배치와 venv·pip 정상(pandas 3.1.0, xlrd, openpyxl import 확인)
- 백엔드를 17011 포트에 띄우고 특허 DB를 숨긴 채 `verify.sh` 실행: 비밀값을 넣었을 때 11/11 통과. 비밀값이 없을 때는 KIPRIS 항목(502)만 실패하고 나머지 10개는 통과했습니다. 시험이 끝난 뒤 그 PID만 종료했습니다.
- 프론트엔드 경로: `install_app.sh`로 npm ci와 next build(Next 16.2.2)를 마친 뒤 `next start`를 17000 포트에 띄웠습니다. 백엔드·프론트·`/api` 넘김까지 23개 항목 중 21개가 통과했고, 실패한 2개는 비밀값 없이 돌린 KIPRIS 항목이었습니다. 시험이 끝난 뒤 두 PID만 종료했습니다.
- `-Parts none -IncludeState`: 운영 상태 DB 2개만 스테이징되는 것을 확인했습니다.
