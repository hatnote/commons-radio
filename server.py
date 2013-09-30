# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from clastic import Application, Response
from clastic.render import JSONRender
import codecs
import os
import random

DEFAULT_K = 5

class JSONPRender(JSONRender):
    def __call__(self, context):
        data, jsonp_cb = context
        json_iter = self.json_encoder.iterencode(data)
        if jsonp_cb:
            resp = Response(''.join([jsonp_cb, '(', ''.join([r for r in json_iter]), ')']), 
                            mimetype="application/javascript")
            
        else:
            resp = Response(json_iter, mimetype="application/json")
        resp.mimetype_params['charset'] = self.json_encoder.encoding
        return resp

def random_oggs(request, seed=None, k=DEFAULT_K):
    callback = request.values.get('callback')
    oggs = codecs.open('commons_oggs_Sept_2013.txt', 'r', encoding='utf-8')
    ogg_lines = oggs.readlines()
    random.seed(seed)
    ret = [o.strip() for o in random.sample(ogg_lines, int(k))]
    oggs.close()
    return ret, callback

if __name__ == '__main__':
    render_jsonp = JSONPRender()
    cur_dir = os.path.abspath(os.path.dirname(__file__))
    print cur_dir

    routes = [('/rand', random_oggs, render_jsonp),
              ('/rand/<k>', random_oggs, render_jsonp),
              ('/rands/<seed>', random_oggs, render_jsonp),
              ('/rands/<seed>/<k>', random_oggs, render_jsonp)]

    app = Application(routes)
    app.serve(static_path=cur_dir)