import importlib.util
from pathlib import Path
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'tools/import_completed_seeds.py'
spec=importlib.util.spec_from_file_location('seed_import',SCRIPT)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SeedImportTests(unittest.TestCase):
    def fixtures(self):
        reference=[dict(actor='wc42',key=['core' if i<168 else 'composition',i],success=True) for i in range(252)]
        extra=[dict(row,actor=actor) for actor in ('wc43','wc44') for row in reference]
        return reference,extra

    def test_requires_both_complete_matched_actors(self):
        base,extra=self.fixtures()
        with self.assertRaises(ValueError):module.merge(base,extra[:-1])
        with self.assertRaises(ValueError):module.merge(base,extra[:252])
        wrong=[dict(r,key=['different',i]) if i==0 else r for i,r in enumerate(extra)]
        with self.assertRaises(ValueError):module.merge(base,wrong)

    def test_preserves_existing_rows_and_import_is_idempotent(self):
        base,extra=self.fixtures()
        base.append(dict(actor='h42',key=['other'],success=False))
        merged=module.merge(base,extra)
        self.assertEqual(merged[:len(base)],base)
        self.assertEqual(len(merged),757)
        self.assertEqual(module.merge(merged,extra),merged)


if __name__=='__main__':unittest.main()
