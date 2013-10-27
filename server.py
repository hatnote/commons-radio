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


def random_oggs(oggs, k=DEFAULT_K):
    ret = [o['img_name'].strip() for o in random.sample(oggs, int(k))]
    return ret


def open_db(db_name):
    ogg_db = sqlite3.connect(db_name)
    ogg_cursor = ogg_db.execute('select %s from audio_metadata' % ', '.join(TARGET_FIELDS))
    all_oggs = [dict(zip(TARGET_FIELDS, ogg)) for ogg in ogg_cursor if not SPOKEN_RE.match(ogg[0])]
    return all_oggs


def main(db_name):
    oggs = open_db(db_name)
    oggs = [f for f in oggs if f['length'] > MIN_OGG_LENGTH]
    render_jsonp = JSONPRender()
    cur_dir = os.path.abspath(os.path.dirname(__file__))
    resources = {'oggs': oggs}

    routes = [('/rand', random_oggs, render_jsonp),
              ('/rand/<k>', random_oggs, render_jsonp)]

    app = Application(routes, resources, middlewares=[GetParamMiddleware('callback')])
    app.serve(static_path=cur_dir)


if __name__ == '__main__':
    prs = ArgumentParser()
    prs.add_argument('--filename', default=DEFAULT_DB_FILENAME)
    args = prs.parse_args()

    main(args.filename)
