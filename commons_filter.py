import sys
import StringIO
import json
from phpserialize import loads
from collections import namedtuple
import codecs
import re

image_info = namedtuple('image_info', 'name, \
                                       size, \
                                       width, \
                                       height, \
                                       metadata, \
                                       bits, \
                                       media_type, \
                                       major_mime, \
                                       minor_mime, \
                                       description, \
                                       user, \
                                       user_text, \
                                       timestamp, \
                                       sha1')

# lexical token symbols
DQUOTED, SQUOTED, UNQUOTED, COMMA, NEWLINE = xrange(5)

_pattern_tuples = (
    (r'"[^"]*"', DQUOTED),
    (r"'[^']*'", SQUOTED),
    (r",", COMMA),
    (r"$", NEWLINE), # matches end of string OR \n just before end of string
    (r"[^,\n]+", UNQUOTED), # order in the above list is important
    )
_matcher = re.compile(
    '(' + ')|('.join([i[0] for i in _pattern_tuples]) + ')',
    ).match
_toktype = [None] + [i[1] for i in _pattern_tuples]
# need dummy at start because re.MatchObject.lastindex counts from 1 

def csv_split(text):
    """Split a csv string into a list of fields.
    Fields may be quoted with " or ' or be unquoted.
    An unquoted string can contain both a " and a ', provided neither is at
    the start of the string.
    A trailing \n will be ignored if present.
    """
    fields = []
    pos = 0
    want_field = True
    while 1:
        m = _matcher(text, pos)
        if not m:
            raise ValueError("Problem at offset %d in %r" % (pos, text))
        ttype = _toktype[m.lastindex]
        if want_field:
            if ttype in (DQUOTED, SQUOTED):
                fields.append(m.group(0)[1:-1])
                want_field = False
            elif ttype == UNQUOTED:
                fields.append(m.group(0))
                want_field = False
            elif ttype == COMMA:
                fields.append("")
            else:
                assert ttype == NEWLINE
                fields.append("")
                break
        else:
            if ttype == COMMA:
                want_field = True
            elif ttype == NEWLINE:
                break
            else:
                print "*** Error dump ***" #, ttype, repr(m.group(0)), fields
                #raise ValueError("Missing comma at offset %d in %r" % (pos, text))
        pos = m.end(0)
    return fields


class LineReader:
    def __init__(self):
        self.line = ''
        self.seperator = "\n"
        self.window = []

    def add(self, character):
        self.window.append(character)
        self.line += character
        if len(self.window) > len(self.seperator):
            self.window.pop(0)

    def found_line(self):
        if ''.join(self.window) == self.seperator:
            rv = self.line
            self.line = ''
            return rv
        else:
            return False

from pprint import pprint

def process(row):
    ret = {}
    try:
        cur_file = image_info(*row)
    except TypeError:
        print 'could not open row'
        return ret
    if '.ogg' in cur_file.name:
        try:
            cur_metadata = loads(cur_file.metadata.replace('\\"', '\"'))
        except:
            cur_metadata = {}
        ret = {'name': cur_file.name.replace('\\', ''),
               'length': cur_metadata.get('length'),
               'type': cur_file.media_type,
               'user': cur_file.user_text,
               'timestamp': cur_file.timestamp,
               }
    return ret

reader = LineReader()
inside_insert = False
search = 'INSERT INTO `image` VALUES'
err_ogg = 0

output_file = codecs.open('commons_oggs.json', 'w', 'utf-8')

while True:
    c = sys.stdin.read(1)
    if not len(c) > 0:
        break
    reader.add(c)
    line = reader.found_line()
    if len(reader.line) > len(search) and reader.line.startswith(search):
        inside_insert = True
        reader.line = ''
        reader.seperator = '),'
    if not inside_insert:
        continue
    if not line:
        continue
    
    # strip out '(' at beginning and '),' at end
    string = line[1:-2]
    # print line[1:-2]
    try:
        split_image = csv_split(string)
        #pprint(split)
    except Exception as e:
        err_ogg += 1
        print err_ogg
        continue
    else: 
        rv = process(split_image)
    #string_array = string.split(',')
    
    if len(rv.keys()) > 0:
        output_file.write(json.dumps(rv))
        output_file.write('\n')
    elif '.ogg' in line:
        err_ogg += 1
        print err_ogg