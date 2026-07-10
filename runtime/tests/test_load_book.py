"""Load-тесты для Book Intelligence через TestClient (без внешнего сервера)."""
import time
from fastapi.testclient import TestClient
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))
from core.main import app

client = TestClient(app)


class TestLoadBook:
    def test_sequential_50_health(self):
        for _ in range(50):
            r = client.get("/book/health")
            assert r.status_code == 200

    def test_sequential_50_layers(self):
        for _ in range(50):
            r = client.get("/book/layers")
            assert r.status_code == 200

    def test_sequential_50_genome(self):
        for _ in range(50):
            r = client.get("/book/genome")
            assert r.status_code in (200, 404)

    def test_mixed_100(self):
        endpoints = ["/book/health", "/book/layers", "/book/drafts", "/book/memory/stats"]
        t0 = time.perf_counter()
        for i in range(100):
            ep = endpoints[i % len(endpoints)]
            r = client.get(ep)
            assert r.status_code == 200
        elapsed = time.perf_counter() - t0
        print(f"\n  100 mixed requests: {elapsed*1000:.0f}ms total, {elapsed/100*1000:.0f}ms avg")
