@echo off
setlocal
cd /d "%~dp0\.."

echo [%date% %time%] Starting daily NCIS fetch (limit=10500)... >> logs\ncis_daily.log
python -u scripts/fetch_ncis_substance.py --limit 10500 --delay 0.2 >> logs\ncis_daily.log 2>&1

echo [%date% %time%] Verifying API status... >> logs\ncis_daily.log
python -c "import requests,os;from dotenv import load_dotenv;load_dotenv();r=requests.get('https://apis.data.go.kr/B552584/kecoapi/ncissbstn/chemSbstnList',params={'serviceKey':os.getenv('KOSHA_SERVICE_KEY_DECODED',''),'numOfRows':'1','pageNo':'1','searchGubun':'2','searchNm':'71-43-2'},timeout=10);d=r.json();code=d.get('header',{}).get('resultCode','');msg=d.get('header',{}).get('resultMsg','');print(f'API check: code={code} msg={msg} http={r.status_code}')" >> logs\ncis_daily.log 2>&1

echo [%date% %time%] Done. >> logs\ncis_daily.log
endlocal
