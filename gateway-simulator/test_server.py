import json
import threading
import unittest
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer
from server import Handler

class SimulatorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = 'http://127.0.0.1:' + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_explicit_simulation_over_http(self):
        with urllib.request.urlopen(self.url + '/simulated/diagnostic') as response:
            body = json.load(response)
        self.assertIs(body['simulation'], True)
        self.assertEqual(body['transport'], 'HTTP_SIMULATED')
        self.assertIs(body['financialIntegration'], False)

    def test_unknown_route(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(self.url + '/unknown')
        self.assertEqual(error.exception.code, 404)

if __name__ == '__main__':
    unittest.main()
