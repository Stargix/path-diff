import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('arrival_export', Path(__file__).resolve().parents[1]/'tools/repair_arrival_export.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class ArrivalExportTests(unittest.TestCase):
    def record(self, **changes):
        row = dict(task_arrived=True, task_success=True, route_arrived=False,
                   task_success_mean_speed_error_m_s=-.01,
                   route_arrival_mean_speed_m_s=None, requested_speed=.25)
        row.update(changes)
        return row

    def test_task_and_progress_events_remain_distinct(self):
        row = exporter.arrival_fields(self.record())
        self.assertTrue(row['arrived'])
        self.assertFalse(row['route_arrived'])
        self.assertEqual(row['arrival_speed_error_mps'], .01)

    def test_failed_task_can_still_arrive(self):
        self.assertTrue(exporter.arrival_fields(self.record(task_success=False))['arrived'])

    def test_missing_arrival_error_is_rejected(self):
        with self.assertRaises(ValueError):
            exporter.arrival_fields(self.record(task_success_mean_speed_error_m_s=None))
