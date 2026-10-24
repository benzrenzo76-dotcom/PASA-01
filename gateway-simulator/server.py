"""SIMULACIÓN HTTP local. No envía USSD ni se conecta a bancos."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Do not log client addresses or input.

    def do_GET(self):
        if self.path != '/simulated/diagnostic':
            self.send_error(404)
            return
        body = json.dumps({
            'simulation': True, 'transport': 'HTTP_SIMULATED',
            'message': 'SIMULACIÓN: respuesta ficticia del futuro backend. No es USSD extremo a extremo.',
            'financialIntegration': False
        }).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    print('SIMULACIÓN HTTP: http://127.0.0.1:8081/simulated/diagnostic')
    ThreadingHTTPServer(('127.0.0.1', 8081), Handler).serve_forever()
