"""Add two verified new comparisons without overwriting the old captures."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import imageio.v2 as imageio
import numpy as np

SITE=Path(__file__).resolve().parents[1]
CASES=(('s-curve-horizontal','sweep_s_curve'),)
ACTORS=('wc42','h42','gaussian_bc_42')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--captures',type=Path,required=True)
    p.add_argument('--bank',type=Path,required=True)
    args=p.parse_args()
    manifest_path=SITE/'data/gallery.json'
    gallery=json.loads(manifest_path.read_text(encoding='utf-8'))
    bank=np.load(args.bank,allow_pickle=False)
    additions=[]
    for case_id,family in CASES:
        index=next(i for i,(f,r) in enumerate(zip(bank['family'],bank['repeat'])) if str(f)==family and int(r)==0)
        path=bank['xy'][int(bank['offsets'][index]):int(bank['offsets'][index+1])].round(4).tolist()
        case=dict(id=case_id,title=case_id,family=family,suite='core',speed=.5,path_xy=path,clips=[])
        for actor in ACTORS:
            source=args.captures/case_id/actor
            movie=source/'capture.mp4'; meta_path=source/'capture.capture.json'; metrics_path=source/'capture.metrics.json'
            if not all(p.is_file() for p in (movie,meta_path,metrics_path)):
                raise FileNotFoundError(f'Incomplete capture: {source}')
            meta=json.loads(meta_path.read_text()); metrics=json.loads(metrics_path.read_text())
            if meta['actor_id']!=actor or meta['scenario_id']!=case_id or meta['video_sha256']!=digest(movie) or meta['metrics_sha256']!=digest(metrics_path):
                raise ValueError(f'Capture identity/hash mismatch: {source}')
            if meta['scenario_key']['path_shape']!=family or meta['route_bank_sha256']!=digest(args.bank):
                raise ValueError(f'Unexpected route bank: {source}')
            dst=SITE/'assets/media/comparisons'/case_id/actor
            if dst.exists():
                raise FileExistsError(f'Preserving existing gallery assets: {dst}')
            case['clips'].append(dict(actor=actor,source=source,meta=meta,metrics=metrics,dst=dst))
        additions.append(case)
    for case in additions:
        for clip in case['clips']:
            dst=clip.pop('dst'); source=clip.pop('source'); meta=clip.pop('meta'); metrics=clip.pop('metrics')
            dst.mkdir(parents=True)
            for name in ('capture.mp4','capture.capture.json','capture.metrics.json'):shutil.copy2(source/name,dst/name)
            reader=imageio.get_reader(str(dst/'capture.mp4'))
            try:imageio.imwrite(dst/'poster.jpg',reader.get_data(min(20,len(meta['frame_times_s'])-1)),quality=85)
            finally:reader.close()
            rel=dst.relative_to(SITE).as_posix()
            clip.update(video=rel+'/capture.mp4',poster=rel+'/poster.jpg',metadata=rel+'/capture.capture.json',
                        metrics_file=rel+'/capture.metrics.json',fps=meta['fps'],frame_times_s=meta['frame_times_s'],
                        end_reason=meta['end_reason'],video_sha256=meta['video_sha256'],checkpoint_sha256=meta['checkpoint_sha256'],
                        metrics={k:metrics.get(k) for k in ('task_success','survived','route_arrived','route_arrival_time_s',
                                 'task_success_mean_speed_error_m_s','active_cross_track_rmse_m','active_height_mae_m')})
    existing={c['id'] for c in additions}
    gallery['cases']=[c for c in gallery['cases'] if c['id'] not in existing]+additions
    manifest_path.write_text(json.dumps(gallery,separators=(',',':')),encoding='utf-8')
    print('Imported six new videos; all original comparisons remain available.')


if __name__=='__main__':main()
