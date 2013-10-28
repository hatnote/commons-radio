
// rep -v 'Deletion_requests' commonswiki-latest-all-titles | grep '\.ogg$' > ../commons_ogg.txt
// based on http://blog.lastrose.com/html5-audio-video-playlist/
// equalizar visualization based on: http://jsbin.com/acolet/70/edit
var TRACK_PADDING = 500;
var DEBUG = true;
var PLAYLIST_MODE = 'random'; /* random/recent */
var TUNE_MIN = 45;
var TUNE_MAX = 900;
var INC_UNUSED = true;
var INC_SPOKEN = true;
// =====================//
var RadioC = new Audio();
var Playlist = [];
var Playing = 0;
var analyser;
var analyser_array;
var source_node;

// check if there is AudioContext support
var context;

if (typeof AudioContext !== "undefined") {
  context = new AudioContext();
} else if (typeof webkitAudioContext !== "undefined") {
  context = new webkitAudioContext();
} else {
  console.log('Audio visualization is not possible in your current browser...');
  context = false;
}

function setup_audio_nodes() {
  source_node =  (source_node || context.createMediaElementSource(RadioC));
  analyser = (analyser || context.createAnalyser());
  analyser_array = new Uint8Array(analyser.frequencyBinCount);
  analyser.smoothingTimeConstant = 0.92;
  analyser.fftSize = 512;
  source_node.connect(analyser);
  source_node.connect(context.destination);
  draw_spectrum();
}

function draw_spectrum() {
  var canvas = $('#songcanvas')[0];
  var w = canvas.width;
  var h = canvas.height;
  var ctx = canvas.getContext("2d");
  var audio_animation = requestAnimationFrame(draw_spectrum);
  var gradient = ctx.createLinearGradient(0,0,0, h);

  gradient.addColorStop(1,'#6ECFF5');
  gradient.addColorStop(0,'#EF4D6D');
  ctx.fillStyle = gradient;
  if ($('#play-button').hasClass('active')) {
    analyser.getByteFrequencyData(analyser_array);
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < (analyser_array.length); i++ ) {
      var analyser_value = analyser_array[i];
      ctx.fillRect(i * 4, h - (analyser_value / 5), 2, h * 3);
    }
  }
}

// templating
var playlist_element = $('<a class="item" href="#"></a>');
var track_title = $('<a href="" target="_blank"></a>');
var use_element = $('<span class="use"><a href="" target="_blank" class="ui use-link"></a> <span class="use-label"></span></span>');
var user_title = $('<a href="" target="_blank"></a>');
var use_title = $('<span>Used on </span> ');
var category_link = $('<a class="ui small label cat white" href="#" target="_blank"></a>');
var category_header = $('<h3 class="ui header">Categories</h3>');

function make_title_element(filename) {
  var name = filename.replace('File:', '').replace('.ogg', '');
  var ret = track_title.clone();
  ret.attr('href', 'https://commons.wikimedia.org/wiki/File:' + name + '.ogg');
  ret.text(name);
  return ret;
}

function make_use_element(url, title, wiki) {
  var ret = use_element.clone();
  $('.use-label', ret).text('(' + wiki + ')');
  $('.use-link', ret).attr('href', url);
  $('.use-link', ret).text(title);
  return ret;
}

function make_user_title(username) {
  var ret = user_title.clone();
  ret.attr('href', 'https://commons.wikimedia.org/wiki/User:' + username);
  ret.text(username);
  return ret;
}

function make_use_title() {
  return use_title.clone();
}

function make_category_element(title) {
  if (title.indexOf('Category:') === 0) {
    title = title.replace('Category:', '');
  }
  var ret = category_link.clone();
  ret.attr('href', 'https://commons.wikimedia.org/wiki/Category:' + title);
  ret.text(title);
  return ret;
}

function random_color() {
  var colors = ['black',
                'green',
                'red',
                'blue',
                'purple',
                'teal'];
  var rand_i = Math.floor(Math.random() * colors.length);
  return colors[rand_i];
}

function make_playlist_element(filename, url, duration) {
  var name = filename.replace('File:', '').replace('.ogg', '');
  var ret = playlist_element.clone();
  ret.attr('href', url).prepend(name);
  return ret;
}

function normalize_name_underscore(title) {
  return title.replace(/ /g, '_').replace('File:', '');
}

function normalize_name(title) {
  return title.replace(/_/g, ' ').replace('File:', '');
}

function append_playlist(tunes) {
  for(var i = 0; i < tunes.length; i++) {
    Playlist.push(tunes[i]);
  }
  Playlist = _.uniq(Playlist, false, function(item) { return item['title']; });
}

function append_specific_tune(url) {
  var name = url.slice(url.indexOf('File:'), url.length);
  console.log(name);
  var norm_name = 'File:' + normalize_name(name);
  var found = false;
  for (var i = 0; i < Playlist.length; i++) {
    var pl_title = Playlist[i]['title'];
    if (pl_title === norm_name) {
      found = true;
      break;
    }
  }
  if (found) {
    play_tune(i);
  } else {
    get_file_props([name], function(tunes) {
      append_playlist(tunes);
    }, function() {
      play_tune(Playlist.length - 1);
      fetch_more(append_playlist);
    });
  }
}

function prepend_playhistory(tune_id) {
  if (!Playlist[tune_id]) {
    // failsafe back to random
    console.log('reverting to random');
    PLAYLIST_MODE = 'random';
    Playing = Playlist.length - 2;
    fetch_more(append_playlist, function() {}, true);
  }
  var url = Playlist[tune_id]['url'];
  var title = Playlist[tune_id]['title'];
  var dur = Playlist[tune_id]['duration'];
  if ($('#playhistory').find('a[href="' + url + '"]').length === 0) {
    $('#playhistory').prepend(make_playlist_element(title, url, dur));
  } else {
    // pass
  }
}

$(function init(){
  url = gen_url();
  $.getJSON(url, function(data, textStatus, jqXHR) {
      get_file_props(data, function(tunes) {
          append_playlist(tunes);
      }, function() { play_tune(Playing); });
  });
  $('#playhistory').on('click', 'a', function() {
    var tune_index = $('#playhistory a').length - $(this).index() - 1;
    play_tune(tune_index);
    return false;
  });

  // radio events
  $(RadioC).on({
    'ended': function(e) {
        RadioC.transition = next_tune_transition();
    },
    'timeupdate': function (){
        //var elapsed = parseFloat(RadioC[0].duration - RadioC[0].currentTime, 10)
        var pos = (RadioC.currentTime / RadioC.duration) * 100;
        $('#progress-bar').attr('style', 'width: ' + pos + '%;');
        $('#time-display').html(fancy_time(RadioC.currentTime) + ' / ' + fancy_time(RadioC.duration));
    },
    'pause': function() {

    },
    'play': function() {
        $('#play-button').addClass('active').hide();
        $('#pause-button').removeClass('active').show();
        RadioC.transition_paused = false;
    },
    'loadstart': function() {
        $('#progress-bar').attr('style', 'width: 0%');
        $('.radio-loader').fadeIn();
    },
    'loadeddata': function() {
        $('.radio-loader').fadeOut();
        //visualization
        if (context) {
            setup_audio_nodes();
        }
    },
    'error': function(e) {
        console.log(e);
        RadioC.transition = next_tune_transition();
    },
    'stalled': function() {
        console.log('stalled!');
        RadioC.transition = next_tune_transition();
    }
  });

  //RadioC.volume = 0; // for polite debugging

  // custom controls
  $('#play-button').click(function() {
    $('#pause-button').removeClass('active').show();
    $('#play-button').addClass('active').hide();
    if (RadioC.transition_paused) {
      RadioC.transition = next_tune_transition();
      RadioC.transition_paused = false;
    } else {
      $(RadioC)[0].play();
    }
  });
  $('#pause-button').click(function() {
    $('#play-button').removeClass('active').show();
    $('#pause-button').addClass('active').hide();
    clearTimeout(RadioC.transition);
    if (RadioC.transition) {
      RadioC.transition_paused = true;
    } else {
      $(RadioC)[0].pause();
    }
  });
  $('#next-button').click(function() {
    check_next_tune();
  });
  $('#prev-button').click(function() {
    play_tune(Playing - 1); // does it exist?
  });
  $('#load-button').click(function() {
    fetch_more(append_playlist);
  });
  $('#progress-bar-container').click(function(e) {
    if (RadioC.duration) {
      RadioC.currentTime = (e.offsetX / this.offsetWidth) * RadioC.duration;
    }
  });
  $('#min-dur').change(function() {
    var min_str = $(this).val();
    // yuk
    if (min_str === '15 seconds') {
      TUNE_MIN = 15;
    } else if (min_str === '45 seconds') {
      TUNE_MIN = 45;
    } else if (min_str === 'any length') {
      TUNE_MIN = 1;
    }
  });
  $('#max-dur').change(function() {
    var max_str = $(this).val();
    // eww
    if (max_str === '15 minutes') {
      TUNE_MAX = 900;
    } else if (max_str === '5 minutes') {
      TUNE_MAX = 300;
    } else if (max_str === '1 minute') {
      TUNE_MAX = 60;
    } else if (max_str === 'any length') {
      TUNE_MAX = 10800;
    }
    console.log($(this).val());
  });
  $('#choice').change(function() {
    var choice = $(this).val()
    if (choice == 'randomly') {
      $('#min-dur').prop('disabled', false);
      $('#max-dur').prop('disabled', false);
      start_random();
    } else if (choice == 'by most recent') {
      start_most_recent();
      // resetting
      $('#min-dur').val('45 seconds').prop('disabled', 'disabled');
      $('#max-dur').val('15 minutes').prop('disabled', 'disabled');
    }
  });
  $('#spoken').change(function() {
    console.log($(this).is(':checked'));
  });
  $('#unused').change(function() {
    console.log($(this).is(':checked'));
  });
  $('#settings-area').hide();
  $('#load-area').hide();
  $('#settings').click(function() {
    $('#settings-area').slideToggle();
  });
  $('#load').click(function() {
    $('#load-area').slideToggle();
  });
  $('#load-submit').click(function() {
    var load_url = $('#load-area input').val();
    if (!load_url) {
      $('#load-area input').parent().addClass('error');
      $('#load-area input').parent().append('<div class="ui red pointing above ui label" id="load-error">Please include a URL to a file on Wikimedia Commons</div>')
    } else {
      $('#load-area input').parent().removeClass('error');
      $('#load-error').remove();
      try {
        append_specific_tune(load_url);
      } catch (e) {
        $('#load-area input').parent().addClass('error');
        $('#load-area input').parent().append('<div class="ui red pointing above ui label" id="load-error">Please include a URL to a file on Wikimedia Commons</div>')
      }
    }
  });
  // viz stuff
  if (!context) {
    $('#songcanvas').hide();
  }
});

function fancy_time(sec) {
  var minutes = Math.floor(sec / 60);
  if (minutes <= 9) { minutes = ("0" + minutes); }
  sec -= minutes * 60;
  var seconds = parseInt(sec % 60, 10);
  if (seconds <= 9) { seconds = ("0" + seconds); }
  return minutes + ':' + seconds;
}

function prep_url(url, params) {
  var params_string = '';
  for (var key in params) {
    params_string += '&' + key + '=' + params[key];
  }
  return url + '?' + params_string;
}

function get_file_props(filenames, cb, final_cb) {
  var filestr = '';
  for (var i = 0; i < filenames.length; i++) {
    var file = filenames[i];
    if (file.indexOf('File:') !== 0) {
      file = 'File:' + file;
    }
    if (filestr) {
      filestr += '|' + file;
    } else {
      filestr = file;
    }
  }
  var api_url = 'http://commons.wikimedia.org/w/api.php';
  var params = {
    'action': 'query',
    'titles': filestr,
    'prop': 'videoinfo|globalusage|categories',
    'guprop': 'namespace',
    'viprop': 'url|mediatype|metadata|user|timestamp',
    'vilimit': 500,
    'gulimit': 500,
    'cllimit': 500,
    'format': 'json',
    'callback': '?'
  };
  var api_query_url = prep_url(api_url, params);
  $.getJSON(api_query_url, function(data, textStatus, jqXHR) {
    var ret_pages = data['query']['pages'];
    var ret_urls = [];
    for (var page_id in ret_pages) {
      if (ret_pages.hasOwnProperty(page_id)) {
        var dur = 0;
        //TODO: bug, no [0] item?
        if (ret_pages[page_id]['videoinfo']) {
          $.map(ret_pages[page_id]['videoinfo'][0]['metadata'], function(r) {
            if (r['name'] == 'length') {
              dur = r['value'];
            }
          });
          ret_urls.push({
            'url': ret_pages[page_id]['videoinfo'][0]['url'],
            'title': ret_pages[page_id]['title'],
            'duration': dur,
            'pageid': ret_pages[page_id]['pageid'],
            'usage': ret_pages[page_id]['globalusage'],
            'categories': ret_pages[page_id]['categories'],
            'user': ret_pages[page_id]['videoinfo'][0]['user'],
            'timestamp': ret_pages[page_id]['videoinfo'][0]['timestamp'],
          });
        }
      }
    }
    cb(ret_urls);
    if (final_cb) {
      final_cb();
    }
  });
}

function resized_url(url, size) {
  // 0_0
  // there must be ... a better way
  var split_spot = url.lastIndexOf('commons/');
  // TODO: assumes commons, generate thumb from local images
  var first_half = url.substring(0, split_spot);
  var last_half = url.substring(split_spot + 8);
  var filename = url.substring(url.lastIndexOf('/') + 1);
  var thumb_url = first_half + 'commons/thumb/' + last_half + '/' + size + 'px-' + filename;
  return thumb_url;
}

function insert_imgs(urls, tried) {
  var url;
  if (urls.length === tried.length) {
    return false;
  }
  for (var i = 0; i < urls.length; i++) {
    url = urls[i];
    if (tried.indexOf(url) < 0) {
      tried.push(url);
      break;
    }
  }
  var thumb_url = resized_url(url, 300);
  $('#cp-cover').html('<img src="' + thumb_url + '" class="ui rounded right floated image">');
  $('#cp-cover img').error(function() {
    console.log('error loading image');
    insert_imgs(urls, tried);

  });
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function get_image_from_pg(title, wiki) {
  var api_url = 'http://' + wiki + '/w/api.php';
  var params = {
    'action': 'query',
    'generator': 'images',
    'titles': title,
    'prop': 'imageinfo',
    'iiprop': 'url|size|mime',
    'format': 'json',
    'callback': '?'
  };
  var api_query_url = prep_url(api_url, params);
  var found_img = false;
  var urls = [];
  $.getJSON(api_query_url, function(data, textStatus, jqXHR) {
    if (data['query']) {
      var ret_pages = data['query']['pages'];
      for (var page_id in ret_pages) {
        if (ret_pages.hasOwnProperty(page_id)) {
          var cur_page = ret_pages[page_id];
          if (cur_page['imageinfo'] && cur_page['imageinfo'][0]['mime'] == 'image/jpeg' && cur_page['imagerepository'] == 'shared') {
            urls.push(cur_page['imageinfo'][0]['url']);
            
          }
        }
      }
    }
    urls = shuffle(urls);
    insert_imgs(urls, []);
  });
}

function get_summary(wikis) {
  var top_wikis = ['en.wikipedia',
                   'de.wikipedia',
                   'nl.wikipedia',
                   'fr.wikipedia',
                   'it.wikipedia',
                   'es.wikipedia',
                   'ru.wikipedia',
                   'sv.wikipedia',
                   'pl.wikipedia',
                   'ja.wikipedia',
                   'pt.wikipedia',
                   'zh.wikipedia',
                   'vi.wikipedia',
                   'uk.wikipedia',
                   'ca.wikipedia'];
  var wiki = false;
  $('#cp-more').empty();
  top_wiki_loop:
  for (var i = 0; i < top_wikis.length; i++) {
    var top_wiki = top_wikis[i];
    usage_loop:
    for (var j = 0; j < wikis.length; j++) {
      // check if on a top wiki
      wiki = wikis[j];
      if (wiki['wiki'].indexOf(top_wiki) === 0 && wiki['ns'] == 0) {
        // check if not outside main namespace
        break top_wiki_loop;
      } else {
        wiki = false;
      }
    }
  }
  if (!wiki) {
    // look again
    for (var k = 0; k < wikis.length; k++) {
       if (wikis[k]['ns'] === 0) {
         wiki = wikis[k];
       }
    }
  }
  if (wiki) {
    var api_url = 'http://' + wiki['wiki'] + '/w/api.php';
    var params = {
      'action': 'query',
      'prop': 'extracts',
      'titles': wiki['title'],
      'exchars': '300',
      'explaintext': 'true',
      'exsectionformat': 'plain',
      'format': 'json',
      'callback': '?'
    };
    var api_query_url = prep_url(api_url, params);
    $.getJSON(api_query_url, function(data, textStatus, jqXHR) {
      if (data['query']) {
        var ret_pages = data['query']['pages'];
        for (var page_id in ret_pages) {
          if (ret_pages.hasOwnProperty(page_id)) {
            var cur_page = ret_pages[page_id];
            // headings?
            $('#cp-more').prepend('<h4 class="ui header">From <a href="http://' + wiki['wiki'] + '/wiki/' + wiki['title'] + '">' + wiki['title'] + '</a> on ' + wiki['wiki'] + ':</h4><div class="ui segment top extract"> <p class="extract">' + cur_page['extract'] + '</p></div>');
          }
        }
      }
    });
  }
}

function play_tune(tune_id) {
  Playing = tune_id;
  if (!INC_UNUSED) {
    console.log('no unused')
    if (!Playlist[tune_id]['usage'] || Playlist[tune_id]['usage'].length === 0) {
      setTimeout(function() {
        Playing + 1;
        fetch_more(append_playlist, play_next_tune);
        console.log(tune_id)
      }, TRACK_PADDING * 3);
      return;
    }
  }
  prepend_playhistory(Playing);
  var url = Playlist[tune_id]['url'];
  var title = Playlist[tune_id]['title'];
  var dur = Playlist[tune_id]['duration'];
  var tune_i = $('#playhistory').find('a[href="' + url + '"]');
  tune_i.addClass('active').siblings().removeClass('active');
  $(RadioC).attr('src', url);
  $(RadioC).load();
  $(RadioC)[0].play();

  //adjust cp ui
  $('#cp-cover').empty();
  $('#cp-more').empty();
  $('#cp-cats').hide();
  $('#cp-cats .cat').remove();
  $('#cp-title').html(make_title_element(title));
  $('#cp-desc').html(make_user_title(Playlist[tune_id]['user']));
  // TODO: add date the file was uploaded
  var wikis = [];
  if (Playlist[tune_id]['usage'].length > 0) {
    get_summary(Playlist[tune_id]['usage']);
    $.map(Playlist[tune_id]['usage'], function(r) {
      r['url'] = 'https://' + r['wiki'] + '/wiki/' + r['title'];
      r['title'] = r['title'].replace(/_/g, ' ');
      wikis.push([r['title'], r['wiki']]);
      $('#cp-more').append(make_use_element(r['url'], r['title'], r['wiki']));
      if ($('#cp-cover').children().length === 0) {
        // only get the first image
        if ($('#cp-cover img').length !== 1) {
          get_image_from_pg(r['title'], r['wiki']);
        }
      }
    });
    $('#cp-more').prepend(make_use_title());

  }
  var wikis = (Playlist[tune_id]['usage'].length == 1) ? 'wiki' : 'wikis';
  // move this up to the templating function?
  var MAX_USAGE = 3;
  var usages = $('#cp-more span.use');
  if (usages.length > MAX_USAGE) {
    var remainder = usages.length - MAX_USAGE;
    $('#cp-more span.use').remove();
    $('#cp-more').append(usages.slice(0, MAX_USAGE));
    $('#cp-more').append('<span class="use"><a href="https://commons.wikimedia.org/wiki/' + title + '#globalusage" target="_new">and ' + remainder + ' more</a>...</span>')
  }
  $('#cp-more .use:not(:last)').after(', ');
  if (Playlist[tune_id]['categories']) {
      $.map(Playlist[tune_id]['categories'], function(r) {
          $('#cp-cats-c').append(make_category_element(r['title']));
      });
      $('#cp-cats').show();
  }
}

function next_tune_transition() {
  return setTimeout(function () {
    check_next_tune();
    RadioC.transition = false;
  }, TRACK_PADDING);
}

function play_next_tune() {
  var tune_id = Playing + 1;
  return play_tune(tune_id);
}

function check_next_tune() {
  if (Playing + 4 >= Playlist.length) {
    fetch_more(append_playlist, play_next_tune);
  } else {
    play_next_tune();
  }
}

function start_most_recent() {
  PLAYLIST_MODE = 'recent';
  console.log('starting recent mode');
  fetch_more(append_playlist, function() {}, '');
}

function start_random() {
  PLAYLIST_MODE = 'random';
  console.log('starting random mode');
  fetch_more(append_playlist, function() {}, '');
}

function gen_url(cursor) {
  // there must be a better way
  var host = 'http://localhost:5000/';
  var route;
  var name = '';
  var k = '6';
  var rmin = '';
  var rmax = '';
  var cb = '&callback=?';
  if (PLAYLIST_MODE == 'random') {
    route = 'rand/';
  } else if (PLAYLIST_MODE == 'recent') {
    route = 'recent/';
  }
  if (cursor) {
    name = '&name=' + cursor;
  }
  if (TUNE_MIN && TUNE_MIN !== 45) {
    route = 'rand_dur/';
    name = '';
    rmin = '&min=' + TUNE_MIN;
  }
  if (TUNE_MAX && TUNE_MAX !== 900) {
    route = 'rand_dur/';
    name = '';
    rmax = '&max=' + TUNE_MAX;
  }
  return host + route + k + '?' + name + rmin + rmax + cb;
}

function fetch_more(cb, final_cb, reset_cursor) {
  var url;
  var cursor;
  if (reset_cursor) {
    cursor = '';
  } else {
    cursor = normalize_name_underscore(Playlist[Playlist.length - 1]['title']);
  }
  url = gen_url(cursor);
  $.getJSON(url, function(data, textStatus, jqXHR) {
      get_file_props(data, function(tunes) {
        cb(tunes);
      }, final_cb);
  });
}
