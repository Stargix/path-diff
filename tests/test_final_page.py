from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import unittest

ROOT=Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.refs=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        for key in ('href','src','poster'):
            if key in attrs:self.refs.append(attrs[key])


class FinalPageTests(unittest.TestCase):
    def test_local_links_and_unique_ids(self):
        for name in ('index.html','results.html'):
            page=Links();page.feed((ROOT/name).read_text(encoding='utf-8'))
            self.assertEqual(len(page.ids),len(set(page.ids)),name)
            for ref in page.refs:
                u=urlsplit(ref)
                if u.scheme or u.netloc:continue
                target=ROOT/(u.path or name)
                self.assertTrue(target.is_file(),ref)
                if u.fragment:
                    dest=Links();dest.feed(target.read_text(encoding='utf-8'))
                    self.assertIn(u.fragment,dest.ids,ref)

    def test_composition_keeps_both_definitions(self):
        script=(ROOT/'publication.js').read_text(encoding='utf-8')
        self.assertIn('Original task pass (%)',script)
        self.assertIn('All-section check (%)',script)
        self.assertNotIn("['Controller','All sections (%)','Joint task (%)'",script)
        self.assertNotIn("'Command variation','Tilt (°)'",script)
        self.assertIn('tracking-reading',script)
        self.assertIn('composition-reading',script)


if __name__=='__main__':unittest.main()
