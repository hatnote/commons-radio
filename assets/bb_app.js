/*
- load the page
- get track names from clastic server
  - get file details from WP api for each track name
- play first song
  - set now playing title and description in the now playing UI
  - get the image for playing song
- on the songs end
  - play the next song
  - put this song in the play history UI
  - check if it's next to the last song
  - if the play list is about to run out, get another set of tracks from clastic

  APIs
   - clastic -> list of filenames
   - Commons API -> url, title, duration, categories, user, timestamp, etc
   - WP API -> image?
*/

function prep_url(url, params) {
    var params_string = '';
    for (var key in params) {
        params_string += '&' + key + '=' + params[key];
    }
    return url + '?' + params_string;
};

var PlaylistInfo = Backbone.Model.extend({
  initialize: function() {
    this.fetch();
  },
  url: function() {
    console.log('fetched')
    var url_files = this.get('filenames').join('|File:')
    url_files = 'File:' + url_files;
    var api_url = 'http://commons.wikipedia.org/w/api.php';
    var params = {
        'action': 'query',
        'titles': url_files,
        'prop': 'videoinfo|globalusage|categories',
        'viprop': 'url|mediatype|metadata|user|timestamp',
        'vilimit': 500,
        'gulimit': 500,
        'cllimit': 500,
        'format': 'json',
        'callback': '?'
    };
    return prep_url(api_url, params);
  },
  parse: function(response) {
    var pages = response['query']['pages'];

    var page_list = $.map(pages, function(r) {
      return r
    })
    var ret = new Tracks(page_list);
    return ret;
  },
  get_tracks: function() {

  }
});

var Playlist = Backbone.Model.extend({
  initialize: function() {
    this.fetch();
  },
  url: 'http://localhost:5000/rand',
  parse: function(response) {
    ret = new PlaylistInfo({"filenames": response})
    // playlist_info.fetch()
  }
});

var Track = Backbone.Model.extend({
  initialize: function() {
    console.log(this)
    var dur = 0;
    //TODO: bug, no [0] item?
    $.map(this.get('videoinfo')[0]['metadata'], function(r) {
      if (r['name'] == 'length') {
        dur = r['value'];
      }
    });
      this.url = ret_pages[page_id]['videoinfo'][0]['url'],
      this.title: ret_pages[page_id]['title'],
      'duration': dur,
      'pageid': ret_pages[page_id]['pageid'],
      'usage': ret_pages[page_id]['globalusage'],
      'categories': ret_pages[page_id]['categories'],
      'user': ret_pages[page_id]['videoinfo'][0]['user'],
      'timestamp': ret_pages[page_id]['videoinfo'][0]['timestamp'],

  }
})

var Tracks = Backbone.Collection.extend({
  model: Track,
})




var Playlists = Backbone.Collection.extend({
  model: Playlist,

});

var CommonsRadio = Backbone.View.extend({
  initialize: function() {

  }

});

//var playlist = new Playlist();

//var commons_radio_view = new CommonsRadio({ el: $('#container') });

// var playlist_info = new PlaylistInfo({filenames: [
//   "Cinq_semaines_en_ballon_36_Verne.ogg", 
//   "Inför_omskärelsen1.ogg", 
//   "Regentessekerk_van_Den_Haag,_luiden_en_uitluiden_van_klokken_-_SoundCloud_-_Beeld_en_Geluid.ogg", 
//   "Mozart_-_Bassoon_Concerto_in_Bb_major_-_Allegro.ogg", 
//   "Pinechas-m_(Nevuchadnezzar).ogg"
// ]})

var playlist = new Playlist();

