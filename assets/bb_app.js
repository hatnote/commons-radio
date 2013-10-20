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

var App = {};

function prep_url(url, params) {
    var params_string = '';
    for (var key in params) {
        params_string += '&' + key + '=' + params[key];
    }
    return url + '?' + params_string;
};

App.CommonsInfo = Backbone.Model.extend({
  initialize: function(filename) {
    this.filename = filename.get('title') || filename;
  }
});

App.CommonsInfos = Backbone.Collection.extend({
  model: App.CommonsInfo,
  initialize: function() {
    
  },
  filenames: function() {
    var names = this.map(function(info) {
        return info.filename;
    });
    return names
  },
  url: function() {
    var url_files = this.filenames().join('|File:');
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
      var ret = {};
      var dur = 0;
      //TODO: bug, no [0] item?
      $.map(r['videoinfo'][0]['metadata'], function(i) {
        if (i['name'] == 'length') {
          dur = i['value'];
        }
      });
      ret['url'] = r['videoinfo'][0]['url'];
      ret['title'] = r['title'];
      ret['duration'] = dur;
      ret['pageid'] = r['pageid'];
      ret['usage'] = r['globalusage'];
      ret['categories'] = r['categories'];
      ret['user'] = r['videoinfo'][0]['user'];
      ret['timestamp'] = r['videoinfo'][0]['timestamp'];
      return ret;
    });
    return page_list;
    //this.files = new FileCollection(page_list);
  },
  
});

App.Playlist = Backbone.Model.extend({
  url: 'http://localhost:5000/rand',
  parse: function(resp) {
    var new_files = new App.CommonsInfos(resp);
    new_files.fetch();
    if (!this.files) {
      this.files = new_files;
    } else {
      this.files.add(new_files.models)
    }
  },
  
});


App.File = Backbone.Model.extend({
  initialize: function() {
  }
});

var Files = Backbone.Collection.extend({
  model: File,
});


App.CommonsRadio = Backbone.View.extend({
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

var playlist = new App.Playlist();
playlist.fetch()
console.log(playlist)
