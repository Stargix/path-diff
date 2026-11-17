"""Serve the project page locally, independent of the current directory."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    site = Path(__file__).resolve().parents[1]
    handler = partial(SimpleHTTPRequestHandler, directory=str(site))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError as error:
        parser.exit(1, f'Cannot start local preview on port {args.port}: {error}\n'
                    'If another preview is already running, reuse it or select --port 8766.\n')
    with server:
        print(f'Path Diff: http://127.0.0.1:{server.server_port}/', flush=True)
        print('Keep this terminal running; Ctrl+C stops the preview.', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
