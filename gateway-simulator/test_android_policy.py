"""Static checks complement compilation; they do not replace device tests."""
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

class AndroidPolicyTest(unittest.TestCase):
    def test_diagnostic_has_only_required_normal_runtime_permissions(self):
        manifest = ET.parse(ROOT / 'android/app/src/main/AndroidManifest.xml')
        name = '{http://schemas.android.com/apk/res/android}name'
        permissions = {item.attrib[name] for item in manifest.findall('uses-permission')}
        self.assertEqual(permissions, {
            'android.permission.CALL_PHONE', 'android.permission.READ_PHONE_STATE',
            'android.permission.ACCESS_NETWORK_STATE'
        })
        self.assertEqual(manifest.findall('.//service'), [])

if __name__ == '__main__':
    unittest.main()
