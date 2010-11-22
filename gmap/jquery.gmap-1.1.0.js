/**
 * jQuery fancyGmapPopup (name still under consideration)
 *
 * @url		https://github.com/hkirsman/GMBox
 * @author	Hannes Kirsman <hkirsman@gmail.com>
 * @version	0.0.1
 */
/*global window: true, timer: true, document: true, google: true, alert: true, clearTimeout: true, el: true, setInterval: true, jQuery: true */

// global variable for checking if gmap api is loaded
window.gmap_api_loaded = false;
function set_gmap_api_loaded() {
  window.gmap_api_loaded = true;
}
  
(function($) {

  var
	// fancyGmapPopup Default Settings.	
	// See http:// for details.
	defaults = {
    // popup options
    transition:     "elastic",  

    // gmap options
    language:            false,      // false is automatic langauge detection
    region:              false,      // automatic center to country if nothing others set. Try GB. But am I going to use it??
    latitude:				     0,
    longitude:			     0,
    zoom:					       10,
    markers:				     [],
    // roadmap, satellite, hybrid, terrain
    mapTypeId:          "roadmap",
    // gmap events
    onBoundsChanged:     false,
    onCenterChanged:     false,
    onClick:             false,
    onDblclick:          false,
    onDrag:              false,
    onDragend:           false,
    onDragstart:         false,
    onIdle:              false,
    onMaptypeidChanged:  false,
    onMousemove:         false,
    onMouseout:          false,
    onMouseover:         false,
    onProjectionChanged: false,
    // Developers should trigger this event on the map when the div changes size:
    // google.maps.event.trigger(map, 'resize') 
    onResize:            false,
    onRightclick:        false,
    onTilesloaded:       false,
    onZoomChanged:       false
  },

  // Abstracting the HTML and event identifiers for easy rebranding
	fancygmappopup = 'fancyGmapPopup',
	prefix = 'fgmpopup',

  // Events	
  event_open = prefix + '_open',
  event_load = prefix + '_load',
  event_complete = prefix + '_complete',
  event_cleanup = prefix + '_cleanup',
  event_closed = prefix + '_closed',
  event_purge = prefix + '_purge',
  event_loaded = prefix + '_loaded',
  
  // Special Handling for IE
  isIE = $.browser.msie && !$.support.opacity, // feature detection alone gave a false positive on at least one phone browser and on some development versions of Chrome.
	isIE6 = isIE && $.browser.version < 7,
	event_ie6 = prefix + '_IE6',

  // Cached jQuery Object Variables
	$overlay,

  // Variables for cached values or use across multiple functions
	interfaceHeight,
	interfaceWidth,
	loadedHeight,
	loadedWidth,
  geocoder,
  opts,
  map_private, // map instance
  latlng_private, // current latitude, longitude availabe for public functions too
  timer,
    
  publicMethod;

  // ****************
  // HELPER FUNCTIONS
  // ****************
  
  function load_gmap_api() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    // version info http://code.google.com/intl/et/apis/maps/documentation/javascript/basics.html#VersionTypes
    // curently nightly development 3.2
    script.src = "http://maps.google.com/maps/api/js?v=3.2&sensor=false&callback=set_gmap_api_loaded";
    if (opts.language!==false) {
      script.src += "&language="+opts.language;
    }
    if (opts.region!==false) {
      script.src += "&region="+opts.region;
    }
    document.body.appendChild(script);
  }
  
  function get_url_vars(url) {
    var map2 = {};
    url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value ){
      map2[key] = value;
    });
    return map2;
  }

  function get_vars_for_map_from_url(url) {
    if (url.indexOf("http://maps.google.com/")!=-1 ) {
      var vars = get_url_vars(url);
      var latlong = vars.sll.split(",");
      return {
        latitude : latlong[0],
        longitude: latlong[1]
      };
    } else {
      return false;
    }
  }

  function codeAddress() {
    //var address = document.getElementById("address").value;
    geocoder.geocode( { 'address': "Kuusalu"}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        m.setCenter(results[0].geometry.location);
        google.maps.Marker({
            map: map, 
            position: results[0].geometry.location
        });
      } else {
        alert("Geocode was not successful for the following reason: " + status);
      }
    });
  }


  // Init gmap geocoder and map
  // don't know why geocoder is used?
  function initialize(latitude, longitude) {
    geocoder = new google.maps.Geocoder();
    latlng_private = new google.maps.LatLng(latitude, longitude);
    var myOptions = {
      center: latlng_private,
    };

    myOptions = $.extend({}, opts, myOptions);

    if(opts.mapTypeId=="roadmap") {
      myMapTypeOptions = { mapTypeId: google.maps.MapTypeId.ROADMAP }
    } else if(opts.mapTypeId=="satellite") {
      myMapTypeOptions = { mapTypeId: google.maps.MapTypeId.SATELLITE }
    } if(opts.mapTypeId=="hybrid") {
      myMapTypeOptions = { mapTypeId: google.maps.MapTypeId.HYBRID }
    } if(opts.mapTypeId=="terrain") {
      myMapTypeOptions = { mapTypeId: google.maps.MapTypeId.TERRAIN }
    }

    myOptions = $.extend({}, myOptions, myMapTypeOptions);

    map_private = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
  }

  // Set up public aliases for gmap api events
  function initialize_events() {
    if (opts.onBoundsChanged!==false) {
      google.maps.event.addListener(map_private, 'bounds_changed', function() {
        opts.onBoundsChanged();
      });
    }

    if (opts.onCenterChanged!==false) {
      google.maps.event.addListener(map_private, 'center_changed', function() {
        opts.onCenterChanged();
      });
    }

    if (opts.onClick!==false) {
      google.maps.event.addListener(map_private, 'click', function(e) {
        opts.onClick(e);
      });
    }

    if (opts.onDblclick!==false) {
      google.maps.event.addListener(map_private, 'dblclick', function(e) {
        opts.onDblclick(e);
      });
    }

    if (opts.onDrag!==false) {
      google.maps.event.addListener(map_private, 'drag', function() {
        opts.onDrag();
      });
    }

    
    if (opts.onDragend!==false) {
      google.maps.event.addListener(map_private, 'dragend', function() {
        opts.onDragend();
      });
    }

    if (opts.onDragstart!==false) {
      google.maps.event.addListener(map_private, 'dragstart', function() {
        opts.onDragstart();
      });
    }

    if (opts.onIdle!==false) {
      google.maps.event.addListener(map_private, 'idle', function() {
        opts.onIdle();
      });
    }

    if (opts.onMaptypeidChanged!==false) {
      google.maps.event.addListener(map_private, 'maptypeid_changed', function() {
        opts.onMaptypeidChanged();
      });
    }

    if (opts.onMousemove!==false) {
      google.maps.event.addListener(map_private, 'mousemove', function(e) {
        opts.onMousemove(e);
      });
    }

    if (opts.onMouseout!==false) {
      google.maps.event.addListener(map_private, 'mouseout', function(e) {
        opts.onMouseout(e);
      });
    }

    if (opts.onMouseover!==false) {
      google.maps.event.addListener(map_private, 'mouseover', function(e) {
        opts.onMouseover(e);
      });
    }

    if (opts.onProjectionChanged!==false) {
      google.maps.event.addListener(map_private, 'projection_changed', function() {
        opts.onProjectionChanged();
      });
    }

    if (opts.onResize!==false) {
      google.maps.event.addListener(map_private, 'resize', function() {
        opts.onResize();
      });
    }

    if (opts.onRightclick!==false) {
      google.maps.event.addListener(map_private, 'rightclick', function(e) {
        opts.onRightclick(e);
      });
    }

    if (opts.onTilesloaded!==false) {
      google.maps.event.addListener(map_private, 'tilesloaded', function() {
        opts.onTilesloaded();
      });
    }

    if (opts.onZoomChanged!==false) {
      google.maps.event.addListener(map_private, 'zoom_changed', function() {
        opts.onZoomChanged();
      });
    }
  }

  /*
   * Public
   */
  // Main plugin function
  publicMethod = $.fn[fancygmappopup] = $[fancygmappopup] = function(options, callback) {
    // Build main options before element iteration
    opts = $.extend({}, defaults, options);

    load_gmap_api();
    function realFancyGmapPopup() {
      if (window.gmap_api_loaded===true) {
        clearTimeout(timer);
        timer = false;

        // Check if the browser is compatible
        //if (!window.GBrowserIsCompatible || !GBrowserIsCompatible()) return this;

        // Iterate through each element
        return el.each(function() {
          if (this.tagName=="A") {
            var url_params= get_vars_for_map_from_url(this.href);
            if (url_params) {
              initialize(url_params.latitude, url_params.longitude);

              // make map and latitude, longitude avaible for public functions (callbacks ... etc);
              map = map_private;
              latlng = latlng_private;

              initialize_events();

              

              if(callback) {
                callback();
              }
              //codeAddress();
            }
          }
        });
      } else {
        return false;
      }
    }
    timer = setInterval(realFancyGmapPopup, 10);
    el = this;
  };

  // resize gmbox
  // testing for now
  publicMethod.resize = function(options) {
    options = options || {};
    $("#map_canvas").css("width", "900px");
    google.maps.event.trigger(map, 'resize');
  }
  
  // A method for fetching the current element GMBox is referencing.
	// returns a jQuery object.
	publicMethod.element = function () {
		return $(element);
	};

  publicMethod.settings = defaults;

})(jQuery);