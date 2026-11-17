"""Export the compact, all-seed offline audit; do not alter episode records."""
import argparse
import json
from pathlib import Path


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audit',type=Path,required=True)
    args=parser.parse_args()
    report=json.loads(args.audit.read_text(encoding='utf-8'))
    result={k:report[k] for k in ('schema_version','protocol','groups')}
    result['source_bundle_count']=len(report['source_sha256'])//3
    result['episode_count']=len(report['episodes'])
    result['planned_transition_count']=len(report['events'])
    result['source_sha256']=report['source_sha256']
    output=Path(__file__).resolve().parents[1]/'data'/'transition-audit.json'
    output.write_text(json.dumps(result,allow_nan=False,separators=(',',':')),encoding='utf-8')
    print(output)


if __name__=='__main__':
    main()
