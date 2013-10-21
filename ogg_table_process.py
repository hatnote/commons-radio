import sqlite3
import json
from collections import Counter
from argparse import ArgumentParser

def load_oggs(filename):
    ogg_db = sqlite3.connect(filename)
    ogg_cursor = ogg_db.execute('select img_name, length, img_size, img_user_text, img_timestamp, channels from audio_metadata')
    all_oggs = ogg_cursor.fetchall()
    unique_users = Counter([o[3] for o in all_oggs])
    
    import pdb;pdb.set_trace()


if __name__ == '__main__':
    prs = ArgumentParser()
    prs.add_argument('filename')
    prs.add_argument('output')
    args = prs.parse_args()

    res = load_oggs(args.filename)

    import pdb; pdb.set_trace()