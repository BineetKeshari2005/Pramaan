# Sandbox image for running a pull request's Python tests: python:3.12-slim plus pytest.
# Built once, on the host, with network access. Untrusted code from repositories never runs
# while building; it only runs later inside containers started with --network none.
FROM python:3.12-slim
RUN pip install --no-cache-dir pytest==8.3.3
