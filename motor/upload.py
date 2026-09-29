# Sobe arquivos para o GitHub (repo público) e devolve o link raw.
import sys, base64, json, urllib.request, os
TOKEN = os.environ.get('GH_TOKEN') or open(next(p for p in [os.path.expanduser('~/.secrets/gh'),'/home/claude/.secrets/gh'] if os.path.exists(p))).read().strip()
REPO = os.environ.get('GH_REPO', 'eduardocalafell/mindset-media')
def api(method, url, data=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(data).encode() if data else None,
        headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'mindset-motor'})
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'{}')
def up(local, dest):
    url = f'https://api.github.com/repos/{REPO}/contents/{dest}'
    st, cur = api('GET', url); sha = cur.get('sha') if st == 200 else None
    body = {'message': f'post: {dest}', 'content': base64.b64encode(open(local, 'rb').read()).decode()}
    if sha: body['sha'] = sha
    st, res = api('PUT', url, body)
    if st not in (200, 201): raise SystemExit(f'erro {st}: {res.get("message")}')
    br = res['commit'] and api('GET', f'https://api.github.com/repos/{REPO}')[1].get('default_branch', 'main')
    return f'https://raw.githubusercontent.com/{REPO}/{br}/{dest}'
if __name__ == '__main__':
    out = {}
    for pair in sys.argv[1:]:
        local, dest = pair.split('=', 1); out[dest] = up(local, dest)
    print(json.dumps(out, indent=1))
