#!/usr/bin/env python3
"""
Metro proxy: passes the public tunnel hostname as Host header to Metro,
so Metro generates correct public URLs in the manifest automatically.
"""
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request, urllib.error

METRO_BASE = "http://127.0.0.1:8081"
TUNNEL_HOST = sys.argv[1] if len(sys.argv) > 1 else "localhost"
LISTEN_PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8082

def rewrite(text: str) -> str:
    for old, new in [
        (f"http://{TUNNEL_HOST}:8081",    f"https://{TUNNEL_HOST}"),
        (f"https://{TUNNEL_HOST}:8081",   f"https://{TUNNEL_HOST}"),
        (f"http://127.0.0.1:8081",         f"https://{TUNNEL_HOST}"),
        (f"https://127.0.0.1:8081",        f"https://{TUNNEL_HOST}"),
        (f"http://localhost:8081",          f"https://{TUNNEL_HOST}"),
        (f'"{TUNNEL_HOST}:8081"',          f'"{TUNNEL_HOST}"'),
        (f'"127.0.0.1:8081"',              f'"{TUNNEL_HOST}"'),
    ]:
        text = text.replace(old, new)
    return text

class ProxyHandler(BaseHTTPRequestHandler):
    def _proxy(self, body=None):
        url = f"{METRO_BASE}{self.path}"
        fwd = {}
        for k, v in self.headers.items():
            lk = k.lower()
            if lk not in ("host", "content-length", "transfer-encoding"):
                fwd[k] = v
        # Tell Metro to use the public tunnel hostname in generated URLs
        fwd["Host"] = TUNNEL_HOST
        try:
            req = urllib.request.Request(url, data=body, headers=fwd,
                                         method=self.command)
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
                ct = resp.headers.get("Content-Type", "")
                if any(s in ct for s in ("json", "expo", "javascript")):
                    raw = rewrite(raw.decode("utf-8", errors="replace")).encode("utf-8")
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("content-length","transfer-encoding","connection","keep-alive"):
                        self.send_header(k, v)
                self.send_header("Content-Length", len(raw))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(raw)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.end_headers()
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(str(e).encode())

    def do_GET(self):  self._proxy()
    def do_HEAD(self): self._proxy()
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        self._proxy(self.rfile.read(n) if n else None)
    def log_message(self, *a): pass

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", LISTEN_PORT), ProxyHandler)
    print(f"Proxy :{LISTEN_PORT} → Metro :{METRO_BASE} (Host: {TUNNEL_HOST})")
    server.serve_forever()
