import os
import requests

GHS_URLS = {
    'GHS01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/GHS-pictogram-explos.svg/120px-GHS-pictogram-explos.svg.png',
    'GHS02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/GHS-pictogram-flamme.svg/120px-GHS-pictogram-flamme.svg.png',
    'GHS03': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/GHS-pictogram-rondflam.svg/120px-GHS-pictogram-rondflam.svg.png',
    'GHS04': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/GHS-pictogram-bottle.svg/120px-GHS-pictogram-bottle.svg.png',
    'GHS05': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/GHS-pictogram-acid.svg/120px-GHS-pictogram-acid.svg.png',
    'GHS06': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/GHS-pictogram-skull.svg/120px-GHS-pictogram-skull.svg.png',
    'GHS07': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/GHS-pictogram-exclam.svg/120px-GHS-pictogram-exclam.svg.png',
    'GHS08': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/GHS-pictogram-silhouette.svg/120px-GHS-pictogram-silhouette.svg.png',
    'GHS09': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/GHS-pictogram-pollu.svg/120px-GHS-pictogram-pollu.svg.png',
}

SAVE_DIR = "frontend/public/images/ghs"

def download_images():
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)
        print(f"Created directory: {SAVE_DIR}")

    for code, url in GHS_URLS.items():
        filename = f"{code}.png"
        path = os.path.join(SAVE_DIR, filename)
        
        try:
            print(f"Downloading {code} from {url}...")
            # Use a proper user agent to avoid blocking
            headers = {'User-Agent': 'Mozilla/5.0'}
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                with open(path, 'wb') as f:
                    f.write(res.content)
                print(f"  Saved to {path}")
            else:
                print(f"  Failed: {res.status_code}")
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    download_images()
