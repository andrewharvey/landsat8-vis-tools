/*
 * This file is licenced CC0 http://creativecommons.org/publicdomain/zero/1.0/
 */

/******************************************************************************
   Main Map 
 *****************************************************************************/

/* create the leaflet map */
var map = L.map('map');

/* remove Leaflet attribution */
map.attributionControl.setPrefix('');

/* set the view for GA Landsat 8 archive coverage ( S W N E ) */
map.fitBounds([
        [-44.65, 111.75],
        [-1.05, 155.61]
        ]);

/* use OSM as the base map */
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'Base map &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

$(document).on("click", ".more-attribution-details", function(e) {
    bootbox.alert("Satellite Telemetry Data provided by U.S. Geological Survey (USGS), acquired by Geoscience Australia, <a href='http://tianjara.net/data/ga/LICENSE.pdf'>&copy; Commonwealth of Australia (Geoscience Australia)</a><br>Scene metadata and previews provided by Geoscience Australia.");
});

map.attributionControl.addAttribution("Satellite Data <a href='http://tianjara.net/data/ga/LICENSE.pdf'>&copy; Commonwealth of Australia (Geoscience Australia)</a> | <a class='more-attribution-details' href='#'>more details</a>");


/* hash to keep track of preview L.ImageOverlay layers */
var previewLayers = new Object();

/* layer group of all preview layers */
var previews = new L.LayerGroup();

/* add layer toggle control for non-fixed layers */
var layerControl = new L.control.layers(
        {},
        {
            "Previews": previews
        },
        {
            collapsed: false,
            position: 'topleft'
        }
        ).addTo(map);

/* style scenes by cloudcover or currency */
//var styleControl = new L.control({
//    position: 'topleft'
//}).addTo(map);


/******************************************************************************
   Path/Row Index Layer
 *****************************************************************************/

/* set the style of the scenes from the Path/Row Map */
function pathRowMap_SceneStyle(feature) {
    return {
        fillColor: 'blue',
        weight: 1,
        color: 'black'
    };
}

var pathRowMapLayer;

/* when the feature is no longer hovered reset the style */
function resetPathRowHighlight(e) {
    if (pathRowMapLayer) {
        pathRowMapLayer.resetStyle(e.target);
    }
}

/* when the feature is hovered modify the style */
function highlightPathRowFeature(e) {
    var layer = e.target;

    /* modify the base polygon style with highlight change */
    var highlightStyle = pathRowMap_SceneStyle(layer);
    highlightStyle.fillColor = 'red';

    layer.setStyle(highlightStyle);
}

/* things to do for each row/path feature */
function onEachPathRowFeature(feature, layer) {
    /* create the preview image as a layer */
    /* this is probably not 100% spatially accurate due to projection but good
     * enough for visualisation purposes */
    if (layer && feature && feature.properties && feature.properties.PATH && feature.properties.ROW) {
        /* bind a popup to the feature on click */
        var context = {
            path: feature.properties.PATH,
            row: feature.properties.ROW
        };

        var compiledTemplate = Handlebars.compile(pathRowPopupTemplate);

        layer.bindPopup(compiledTemplate(context));
    }

    /* set the triggers to highlight feature on hover */
    layer.on({
        mouseover: highlightPathRowFeature,
        mouseout: resetPathRowHighlight
    });
}

/* download the Row/Path GeoJSON file and make a Leaflet layer from it */
$.getJSON('data/wrs2_descending.json', function (data) {
    pathRowMapLayer = L.geoJson(data, {
        style: pathRowMap_SceneStyle,
        onEachFeature: onEachPathRowFeature
    });

    /* add to the layer control */
    layerControl.addOverlay(pathRowMapLayer, 'Path/Row Map');
});



/******************************************************************************
   Actual Scenes
 *****************************************************************************/

/* define a mapping from the properties attached to each scene to the name used
 * when displaying that property in the popup */
var scenePropertiesMap = {
    "mdresource_mdfileid": "File ID",
    "image_cloudcoverpercentage": "Cloud Cover"
}

/* FIXME use templating library */
function addProperty(k, v) {
    return '<span class="feature-property-name">' + k + '</span>' + 
           '<span class="feature-property-value">' + v + '</span>' + 
           '<br />';
}

/* define the colour ramp used for cloud cover */ 
var bezInterpolator = chroma.interpolate.bezier(['white', 'yellow', 'red', 'black']);

/* function to set the polygon style for each feature */
function scenePolygonStyle(feature) {
    if (feature.properties && feature.properties.image_cloudcoverpercentage) {
        var s = feature.properties.image_cloudcoverpercentage * 1.0 / 100;
        return {
            fillColor: bezInterpolator(s).hex(),
            weight: 1,
            color: 'black',
            fillOpacity: 0.2
        }; /* default style */
    }else{
        return { };
    }
}

/* return the HTML for the popup */
function popupString(p, bounds) {
    if (p && p.mdresource_mdfileid) {
        var id = p.mdresource_mdfileid;

        var date = null;

        var dateParts = id.match(/(\d{4})(\d{2})(\d{2})$/);
        if (dateParts.length == 4) {
            date = dateParts[1] + '-' + dateParts[2] + '-' + dateParts[3];
        }

        var thumb = 'http://tianjara.net/data/ga/ls8/' + id + '/' + id + '.jpg';
        var preview = 'http://tianjara.net/data/ga/ls8/' + id + '/' + id + '_FR.jpg';
        var lvl1 = 'ftp://ftp.ga.gov.au/outgoing-emergency-imagery/' + date + '/' + id + '/scene01.zip';

        var capture = p.extent_temporalto;

        var context = {
            title: "Scene Details",
            cloud: p.image_cloudcoverpercentage,
            sceneid: p.mdresource_mdfileid,
            path: "000",
            row: "000",
            thumb: thumb,
            preview: preview,
            lvl1: lvl1,
            capture: capture + " GMT",
            "capture-human": moment.utc(capture).local().calendar(),
            "capture-human-ago": moment.utc(capture).local().fromNow()
        };

        var scenePopupCompiledTemplate = Handlebars.compile(scenePopupTemplate);

        return scenePopupCompiledTemplate(context);
    }else{
        return 'Details not avaliable';
    }
}

var dateScenes = new Object();

/* when the feature is no longer hovered reset the style */
function resetHighlight(e) {
    if (e.target.feature && e.target.feature.properties && e.target.feature.properties.mdresource_mdfileid) {
        var id = e.target.feature.properties.mdresource_mdfileid;
        var layer = dailyLayers[sceneDate[id]];
        if (layer) {
            layer.resetStyle(e.target);
        }
    }
}

/* when the feature is hovered modify the style */
function highlightFeature(e) {
    var layer = e.target;

    /* derive the highlight style from the original polygon style */
    var highlightStyle = scenePolygonStyle(layer);

    /* modify the base polygon style with highlight change */
    highlightStyle.weight = 4;
    highlightStyle.opacity = 1.0;

    layer.setStyle(highlightStyle);
}

/* for each feature from the GeoJSON do some extra tasks */
function onEachSceneFeature(feature, layer) {
    /* create the preview image as a layer */
    /* this is probably not 100% spatially accurate due to projection but good
     * enough for visualisation purposes */
    if (layer && feature && feature.properties && feature.properties.mdresource_mdfileid) {
        var id = feature.properties.mdresource_mdfileid;
        var previewurl = 'http://tianjara.net/data/ga/ls8/' + id + '/' + id + '.jpg';
        var bounds = layer.getBounds();
        if (bounds) {
            previewLayers[id] = L.imageOverlay(previewurl, bounds);
            previews.addLayer(previewLayers[id]);
        }

        var dateParts = id.match(/(\d{4})(\d{2})(\d{2})$/);
        if (dateParts.length == 4) {
            var date = dateParts[1] + '-' + dateParts[2] + '-' + dateParts[3];
            sceneDate[id] = date;
            //dateScene[date][id] = previewLayers[id];
        }else{
            console.log(id);
            console.log(dateParts);
        }
    }


    /* set the triggers to highlight feature on hover */
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });

    /* bind a popup to the feature on click */
    layer.bindPopup(
            popupString(layer.feature.properties, layer.getBounds()),
            {
                maxWidth: 400
            }
            );
}



/*****************
   dateslider
******************/

/* set default bounds */
var today = new Date();
var epoch = new Date("2013-11-06");

/* set default selected range */
var defaultStartDate = new Date();
defaultStartDate.setDate(today.getDate() - 5);
var defaultEndDate = today;

/* label the date slider by month */
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

/* create the data slider */
$("#dateslider").dateRangeSlider({
    bounds: {
        min: epoch,
        max: today
    },
    defaultValues: {
        min: defaultStartDate,
        max: defaultEndDate
    },
    range: {
        min: {days: 1}
    },
    scales: [{
        first: function(value){ return value; },
        end: function(value) {return value; },
        next: function(value){
            var next = new Date(value);
            return new Date(next.setMonth(value.getMonth() + 1));
        },
        label: function(value){
            return months[value.getMonth()];
        },
        format: function(tickContainer, tickStart, tickEnd){
            tickContainer.addClass("tickContainer");
        }
    }]
});

/* add a recently downloaded GeoJSON geometry representing all scenes for the
 * chosen date (scene set) to the map */
function addSceneSet(map, data, date) {
    /* create a GeoJSON layer from the GeoJSON data and add it to our set of
     * layers */
    dailyLayers[date] = L.geoJson(data, {
        style: scenePolygonStyle,
        onEachFeature: onEachSceneFeature
    });

    /* in the time it took to download, the user may have changed the slider
     * again, so check if we should still map it */
    var min = $("#slider").rangeSlider("min");
    var max = $("#slider").rangeSlider("max");

    /* if the date of this data is within the current slider range */
    if ((date >= min) && (date <= max)) {
        /* add it to the map */
        map.addLayer(dailyLayers[date]);

        /* now also add the preview image of this scene to our previews layer */
        //for (var scene in dateScene[dateToString(date)]) {
        //    var id = dateScene[dateToString(date)][scene];
        //    previews.addLayer(previewLayers[id]);
        //}
    }
}

/* format a date object into YYYY-MM-DD */
function dateToString(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + (date.getDate() < 10 ? '0' : '') + date.getDate();;
}

/* keep track of which dates we've already put in the download request for */
var downloadedDates = new Object();

/* hash of layers grouping scenes, one per date */
var dailyLayers = new Object();

/* try to download the scene set for this given date */
function downloadScenesForDate(date) {
    if (downloadedDates.hasOwnProperty(date)) { // already downloaded
    }else{ //need to download the scene set
        downloadedDates[date] = 1;
        $.getJSON('http://tianjara.net/data/ga/ls8_index/' + date + '.json', function (data) {
            addSceneSet(map, data, date)
        });
    }
}

var sceneDate = new Object();

/* display all scenes within the date range and hide all others */
function displayScenes(from, to) {
    // for all the daily scene set layers we have...
    for (var i in dailyLayers) {
        // if date of the scene set is within selected range...
        if ((new Date(i) >= from) && (new Date(i) <= to)) {
            // if the scene set isn't already added to the map...
            if (!map.hasLayer(dailyLayers[i])) {
                // ...then add it to the map.
                map.addLayer(dailyLayers[i]);
            }
        }else{
            // if the scene set is already added to the map...
            if (map.hasLayer(dailyLayers[i])) {
                // ...then remove it to the map.
                map.removeLayer(dailyLayers[i]);
            }
        }
    }
    
    /* for all the preview layers */
    for (var i in previewLayers) {
        if ((new Date(sceneDate[i]) >= from) && (new Date(sceneDate[i]) <= to)) {
        }else{
            previews.removeLayer(previewLayers[i]);
        }
    }
}

function sliderValuesChanged(min, max) {
    /* display/hide all scene sets already downloaded which are within/outside
     * the selected range */
    displayScenes(min, max);

    /* next check which new ones need downloading and download those */
    for (var i = min; i <= max; i.setDate(i.getDate() + 1)) {
        downloadScenesForDate(dateToString(i));
    }
}

/* action to take when the date slider is changed */
$("#dateslider").on("valuesChanging", function(e, data){
    sliderValuesChanged(data.values.min, data.values.max);
});

/* since the valuesChanging trigger isn't fired upon initialisation of the
 * datetime slider, shortcut it so that data is loaded on the map for the
 * default state */
//map.on('load', function() {
map.whenReady(function () {
    sliderValuesChanged(defaultStartDate, defaultEndDate);
});
