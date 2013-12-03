/*
 * This file is licenced CC0 http://creativecommons.org/publicdomain/zero/1.0/
 *
 */

/* create the leaflet map */
var map = L.map('map');

/* remove Leaflet attribution */
map.attributionControl.setPrefix('');

/* set the view for NSW ( S W N E ) */
map.fitBounds([
        [-37.614, 140.756],
        [-28.071, 153.896]
        ]);

/* use OSM as the base map */
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'Base map &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

// control that shows state info on hover
var info = L.control();

info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
};

var propertiesWhilelist = {
    "mdresource_mdfileid": "File ID",
    "image_cloudcoverpercentage": "Cloud Cover"
}

info.update = function (p) {
    var infoString = '';
    /* the box shall contain a list of the feature's attributes */
    for (var k in p) {
        if (k in propertiesWhilelist) {
            var v = p[k];
            printKey = propertiesWhilelist[k];
            infoString += '<span class="feature-property-name">' + printKey + '</span>' + 
                '<span class="feature-property-value">' + v + '</span>' + 
                '<br />';
        }
    }
    this._div.innerHTML = '<h4>Scene Info</h4>' +
        (p ? infoString : '');

};

info.addTo(map);
