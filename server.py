# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from clastic import Application, Response
from clastic.middleware import GetParamMiddleware
from clastic.render import JSONRender
import codecs
import os
import random

DEFAULT_K = 5
MIN_OGG_LENGTH = 50

class JSONPRender(JSONRender):
    def __call__(self, context, callback):
        data = context
        jsonp_cb = callback
        json_iter = self.json_encoder.iterencode(data)
        if jsonp_cb:
            resp = Response(''.join([jsonp_cb, '(', ''.join([r for r in json_iter]), ')']), 
                            mimetype="application/javascript")
            
        else:
            resp = Response(json_iter, mimetype="application/json")
        resp.mimetype_params['charset'] = self.json_encoder.encoding
        return resp

import json

def random_oggs(request, seed=None, k=DEFAULT_K):
    long_oggs = [f for f in oggs if f['length'] > MIN_OGG_LENGTH]
    random.seed(seed)
    ret = [o['name'].strip() for o in random.sample(long_oggs, int(k))]
    return ret

if __name__ == '__main__':
    with codecs.open('commons_oggs.json', 'r', encoding='utf-8') as f:
        oggs = []
        for line in f:
            oggs.append(json.loads(line))
    render_jsonp = JSONPRender()
    cur_dir = os.path.abspath(os.path.dirname(__file__))
    print cur_dir

    routes = [('/rand', random_oggs, render_jsonp),
              ('/rand/<k>', random_oggs, render_jsonp),
              ('/rands/<seed>', random_oggs, render_jsonp),
              ('/rands/<seed>/<k>', random_oggs, render_jsonp)]

    app = Application(routes, middlewares=[GetParamMiddleware('callback')])
    app.serve(static_path=cur_dir)