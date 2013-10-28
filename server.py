# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os
import re
import json
import codecs
import sqlite3
import random
from argparse import ArgumentParser
from clastic import Application, Response
from clastic.middleware import GetParamMiddleware
from clastic.render import JSONPRender

DEFAULT_DB_FILENAME = 'ogg_table_metadata.db'
DEFAULT_K = 5
MIN_OGG_LENGTH = 50
TARGET_FIELDS = 'img_name, length, img_size, img_user_text, img_timestamp, channels'.split(', ')
SPOKEN_RE = re.compile(r'^[a-zA-Z]{2}\-')


def random_oggs(rand_name_idx_map, rand_oggs, k=DEFAULT_K, name=None):
    idx = random.randrange(len(rand_oggs) + k)
    if name:
        idx = rand_name_idx_map.get(name, 0)
        idx += 1
    ret = [o['img_name'].strip() for o in rand_oggs[idx:idx + k]]
    return ret

def random_by_dur(all_oggs, k=DEFAULT_K, min=None, max=None):
    if not min:
        min = 0
    if not max:
        max = 10800
    sample = random.sample([o['img_name'] for o in all_oggs if o['length'] > int(min) and o['length'] < int(max)], 5)
    return sample


def open_db(db_name):
    ogg_db = sqlite3.connect(db_name)
    ogg_cursor = ogg_db.execute('select %s from audio_metadata' % ', '.join(TARGET_FIELDS))
    all_oggs = [dict(zip(TARGET_FIELDS, ogg)) for ogg in ogg_cursor]
    all_oggs.sort(key=lambda o: o['img_timestamp'], reverse=True)
    return all_oggs


def recent_oggs(name_idx_map, oggs, k=DEFAULT_K, name=None):
    idx = 0
    if name:
        idx = name_idx_map.get(name, 0)
        if idx:
            idx += 1
    return [o['img_name'] for o in oggs[idx:idx + k]]


def main(db_name):
    all_oggs = open_db(db_name)
    oggs = [f for f in all_oggs if f['length'] > MIN_OGG_LENGTH]
    oggs = [f for f in oggs if not SPOKEN_RE.match(f['img_name'])]
    name_idx_map = {name['img_name']: i for i, name in enumerate(oggs)}
    rand_oggs = list(oggs)
    random.shuffle(rand_oggs)
    rand_name_idx_map = {name['img_name']: i for i, name in enumerate(rand_oggs)}
    render_jsonp = JSONPRender()
    cur_dir = os.path.abspath(os.path.dirname(__file__))
    resources = {'oggs': oggs,
                 'rand_oggs': rand_oggs,
                 'all_oggs': all_oggs,
                 'name_idx_map': name_idx_map,
                 'rand_name_idx_map': rand_name_idx_map}

    routes = [('/rand', random_oggs, render_jsonp),
              ('/rand/<int:k>', random_oggs, render_jsonp),
              ('/recent', recent_oggs, render_jsonp),
              ('/recent/<int:k>', recent_oggs, render_jsonp),
              ('/rand_dur', random_by_dur, render_jsonp),
              ('/rand_dur/<int:k>', random_by_dur, render_jsonp)]

    middlewares = [GetParamMiddleware('callback'),
                   GetParamMiddleware('name'),
                   GetParamMiddleware('min'),
                   GetParamMiddleware('max')]

    app = Application(routes, resources, middlewares=middlewares)
    app.serve(static_path=cur_dir)


if __name__ == '__main__':
    prs = ArgumentParser()
    prs.add_argument('--filename', default=DEFAULT_DB_FILENAME)
    args = prs.parse_args()

    main(args.filename)
