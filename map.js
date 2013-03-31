window.gdrive = (function(){
    var imgIndex = 0;
    var computeHeading = google.maps.geometry.spherical.computeHeading;
    var interpolate = google.maps.geometry.spherical.interpolate;
    var SPEED = 300;
    var map, directionsService;
    var densityFactor = 1;
    var CURR_INDEX = 0;
    var STOP = false;
    var PAUSE = false;
    var KEY = 'AIzaSyAUuoxYS81W9KvpXJCZX2NjURVMoMCswII';
    var currMarker;
    
    function init(lat, lng){        
        directionsService = new google.maps.DirectionsService();
        if (lat==undefined || lng==undefined){
            lat = 40.7711329;
            lng = -73.9741874;
        }
        var mapOptions = {
          center: new google.maps.LatLng(lat, lng),
          zoom: 14,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        currMarker = new google.maps.Marker({});
        var rendererOptions = {
          map: map,
          suppressMarkers: true
        }
        directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
    }
    function geoCode(address, cb){
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode( { 'address': address}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                cb(results[0].geometry.location);
            }
        });
    }
    function setKey(key){
        KEY = key;
    }
    function centerMap(loc){
        map.setCenter(loc);
    }
    function getDirection(origin, destination, cb_success, cb_failure){
        var request = {
            origin: origin,
            destination: destination,
            travelMode: google.maps.DirectionsTravelMode.DRIVING
        };
        directionsService.route(request, function(response, status){
            if (status == google.maps.DirectionsStatus.OK) {
                cb_success(response);
            } else {
                cb_failure(response);
            }
        });

    }
    function preloadImages(imgs, cb){
        var index=0;
        $('#buffer').load(function(){
            if (index == imgs.length-1) {
                if(cb != undefined) setTimeout(cb, 10);
                return;
            }                
            this.src = imgs[index][0];
            index += 1;
        }).trigger('load');
    }
    function densify(latlons){
        var res = [];
        for(var i=1; i<latlons.length; i++){
            var npoints = [];
            for (var j=0; j<densityFactor; j++){
                res.push(interpolate(latlons[i-1], latlons[i], j/densityFactor))
            }
        }
        return res;
    }
    function populateImages(points){
        var imgs = [];
        var bearing;
        var i;
        for(i=1; i<points.length; i++){
            bearing = computeHeading(points[i-1], points[i]);
            imgs.push(["http://maps.googleapis.com/maps/api/streetview?size=600x300&location="+ points[i-1].lat()+"," + points[i-1].lng() +"&heading="+bearing+"&pitch=-1.62&sensor=false&key="+KEY, points[i-1]]);
        }
        imgs.push(["http://maps.googleapis.com/maps/api/streetview?size=600x300&location="+ points[i-1].lat()+"," + points[i-1].lng() +"&heading="+bearing+"&pitch=-1.62&sensor=false&key="+KEY, points[i-1]]);
        return imgs
    }
    function processDirection(response) {
        directionsDisplay.setDirections(response);
        return densify(response.routes[0].overview_path);
    }
    /* From SO */
    function unique(arr) {        
        var ret = [arr[0]];
        for (var i = 1; i < arr.length; i++) {
            if (! arr[i-1].equals(arr[i])) {
                ret.push(arr[i]);
            }
        }
        return ret;
    }
    function _loop(imgs, index, end_cb){
        $('#video-img').attr('src', imgs[index][0]);
        if (index == imgs.length-1){
            CURR_INDEX=0;
            end_cb();
            return;
        } 
        CURR_INDEX = index;
        currMarker.setPosition(imgs[CURR_INDEX][1]);
        setTimeout(function(){
            if(STOP){
                CURR_INDEX = 0;
                currMarker.setPosition(imgs[CURR_INDEX][1]);
                return;
            }
            if(PAUSE)return;
            _loop(imgs, index+1, end_cb)
        },SPEED);
    }
    function setStart(imgs){
        $('#video-img').attr('src', imgs[0][0]);
        currMarker.setPosition(imgs[0][1]);
    }
    function gstart(imgs, end_cb){
        currMarker.setPosition(imgs[CURR_INDEX][1]);
        _loop(imgs, CURR_INDEX, end_cb);
    }
    var gdrive = {
        init: init,
        geoCode: geoCode,
        setKey: setKey,
        setCenter: function(address){            
            geoCode(address, centerMap);
        },
        createVideo: function(origin, destination, cb_sucess, cb_failure){
            getDirection(origin, destination, function(response){
                var points = processDirection(response);
                var imgs = populateImages(points);
                gdrive.route_points = points;
                gdrive.img_links = imgs;
                currMarker.setMap(map);
                preloadImages(imgs, function(){
                    cb_sucess();
                    setStart(gdrive.img_links);
                });
            }, cb_failure)
        },
        start: function(end_cb){
            STOP = false;
            PAUSE = false;
            gstart(gdrive.img_links, end_cb);
        },
        setSpeed: function(speed){
            SPEED = speed;
        },
        setDensity: function(densityf){
            densityFactor = densityf;
        },
        pause: function(){
            PAUSE = true;
        },
        stop: function(){
            STOP = true;
            CURR_INDEX = 0;
            currMarker.setPosition(gdrive.img_links[0][1]);
            setStart(gdrive.img_links);
        },
        mapHandle:function(){
            return map;
        }
    }
    return gdrive;
}());
