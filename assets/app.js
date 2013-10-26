
// rep -v 'Deletion_requests' commonswiki-latest-all-titles | grep '\.ogg$' > ../commons_ogg.txt
// based on http://blog.lastrose.com/html5-audio-video-playlist/
// equalizar visualization based on: http://jsbin.com/acolet/70/edit    
var TRACK_PADDING = 500;
var DEBUG = true;
// =====================//
var RadioC = new Audio();
var Playlist = [];
var Playing = 0;
var analyser;
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
  var analyser_array =  new Uint8Array(analyser.frequencyBinCount);
  var audio_animation = requestAnimationFrame(draw_spectrum);
  var gradient = ctx.createLinearGradient(0,0,0, h);

  gradient.addColorStop(1,'#6ECFF5');
  gradient.addColorStop(0,'#EF4D6D');
  ctx.fillStyle = gradient;
  analyser.getByteFrequencyData(analyser_array);
  ctx.clearRect(0, 0, w, h);
  for (var i = 0; i < (analyser_array.length); i++ ) {      
    var analyser_value = analyser_array[i];
    ctx.fillRect(i * 4, h - (analyser_value / 5), 2, h * 3);
  }
}

// templating
var playlist_element = $('<a class="item" href="#"></a>');
var track_title = $('<a href="" target="_blank"></a>');
var use_element = $('<li><a href="#" class="ui blue label small use-label"></a> <a href="" target="_new" class="use-link"></a></li>');
var user_title = $('<a href="" target="_new"></a>');
var use_title = $('<h3 class="ui header">Used on</h3>');
var category_link = $('<a class="ui small label cat white" href="#" target="_new"></a>');
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
  $('.use-label', ret).text(wiki);
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

function append_playlist(tunes) {
  for(var i = 0; i < tunes.length; i++) {
      Playlist.push(tunes[i]);
  }
}

function prepend_playhistory(tune_id) {
    var url = Playlist[tune_id]['url'];
    var title = Playlist[tune_id]['title'];
    var dur = Playlist[tune_id]['duration'];
    if (!$('#playhistory').find('a[href="' + url + '"]').length > 0) {
        $('#playhistory').prepend(make_playlist_element(title, url, dur));
    } else {
        // pass
    }
}

$(function init(){
    $.getJSON('http://localhost:5000/rand/5?callback=?', function(data, textStatus, jqXHR) {
        get_file_props(data, function(tunes) {
            append_playlist(tunes);
        }, function() { play_tune(Playing); });
    });
    $('#playhistory').on('click', 'a', function() {
      var tune_index = $('#playhistory a').length - $(this).index() - 1;
      console.log(tune_index)
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
    cb(ret_urls);
    if (final_cb) {
      final_cb();
    }
  });
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
  $.getJSON(api_query_url, function(data, textStatus, jqXHR) {
    if (data['query']) {
      var ret_pages = data['query']['pages'];
      for (var page_id in ret_pages) {
        if (ret_pages.hasOwnProperty(page_id)) {
          var cur_page = ret_pages[page_id];
          if (cur_page['imageinfo'] && cur_page['imageinfo'][0]['mime'] == 'image/jpeg' && cur_page['imagerepository'] == 'shared') {
            // TODO: generate thumb from local images
            // TODO: check image size -- if it's smaller than 200px, we can't generate a thumbnail
            var cur_url = cur_page['imageinfo'][0]['url'];
            console.log(cur_url);
            // 0_0
            var split_spot = cur_url.lastIndexOf('commons/');
            var first_half = cur_url.substring(0, split_spot);
            var last_half = cur_url.substring(split_spot + 8);
            var filename = cur_url.substring(cur_url.lastIndexOf('/') + 1);
            var thumb_url = first_half + 'commons/thumb/' + last_half + '/200px-' + filename;
            // TODO: template?
            $('#cp-cover').html('<img src="' + thumb_url + '" class="ui rounded right floated image">');
            return true;
          }
        }
      }   
    }
  });
}

function play_tune(tune_id) {
  Playing = tune_id;
  var url = Playlist[tune_id]['url'];
  var title = Playlist[tune_id]['title'];
  var dur = Playlist[tune_id]['duration'];
 
  //tune_li.addClass('active').siblings().removeClass('active');
  $(RadioC).attr('src', url);
  $(RadioC).load();
  $(RadioC)[0].play();
  
  //adjust cp ui
  $('#cp-cover').empty();
  $('#cp-more').empty();
  $('#cp-cats').hide();
  $('#cp-cats .cat').remove();
  // TODO: template?
  $('#cp-title').html(make_title_element(title));
  $('#cp-desc').html(make_user_title(Playlist[tune_id]['user']));
  if (Playlist[tune_id]['usage'].length > 0) {
    $.map(Playlist[tune_id]['usage'], function(r) {
      $('#cp-more').append(make_use_element(r['url'], r['title'], r['wiki']));
      if ($('#cp-cover').children().length === 0) {
        // only get the first image
        get_image_from_pg(r['title'], r['wiki']);
      }
    });
    $('#cp-more').prepend(make_use_title());
      
  }
  var wikis = (Playlist[tune_id]['usage'].length == 1) ? 'wiki' : 'wikis';
  //on ' + Playlist[tune_id]['timestamp'] + ', and used on ' + Playlist[tune_id]['usage'].length + ' ' + wikis + '.
  if (Playlist[tune_id]['categories']) {
      $.map(Playlist[tune_id]['categories'], function(r) {
          $('#cp-cats').append(make_category_element(r['title']));
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
  prepend_playhistory(Playing);
  var tune_id = Playing + 1;
  return play_tune(tune_id);
}

function check_next_tune() {
  if (Playing + 2 >= $('#playlist a').length) {
    fetch_more(append_playlist, play_next_tune);
  } else {
    play_next_tune();
  }
}

function fetch_more(cb, final_cb) {
  $.getJSON('http://localhost:5000/rand/5?callback=?', function(data, textStatus, jqXHR) {
      get_file_props(data, function(tunes) {
        cb(tunes);
      }, final_cb);
  });
}

