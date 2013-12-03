/*
 * This file is licenced CC0 http://creativecommons.org/publicdomain/zero/1.0/
 */

var bezInterpolator = chroma.interpolate.bezier(['white', 'yellow', 'red', 'black']);

/* function to set the polygon style for each feature */
function polygonStyle(feature) {
    if (feature.properties && feature.properties.image_cloudcoverpercentage) {
        var s = feature.properties.image_cloudcoverpercentage * 1.0 / 100;
        return {
            fillColor: bezInterpolator(s).hex(),
            weight: 1,
            color: 'black'

        }; /* default style */
    }else{
        return { };
    }
}

/* for each feature from the GeoJSON do some extra tasks */
function onEachFeature(feature, layer) {
    /* highlight feature on highlight */
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });
}

var indexLayer;

function resetHighlight(e) {
    if (indexLayer) {
        indexLayer.resetStyle(e.target);
    }
    info.update();
}

function highlightFeature(e) {
    var layer = e.target;

    var highlightStyle = polygonStyle(layer);

    highlightStyle.fillOpacity = 0.5;

    layer.setStyle(highlightStyle);

    info.update(layer.feature.properties);
}


/* overlay / dateslider */

var today = new Date();
var epoch = new Date("2013-11-06");
//var epoch = new Date("2013-07-06");

var defaultStartDate = new Date();
defaultStartDate.setDate(today.getDate() - 1);
var defaultEndDate = today;

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

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
            tickContainer.addClass("myCustomClass");
        }
    }]
});

function addIndexLayer(map, data, date) {
    /* in the time it took to download, the user may have changed the slider
     * again, so check if we should still map it */
    var min = $("#slider").rangeSlider("min");
    var max = $("#slider").rangeSlider("max");

    dateLayers[date] = L.geoJson(data, {
        style: polygonStyle,
        onEachFeature: onEachFeature
    });

    console.log("layer loaded for " + date);
    if ((date >= min) && (date <= max)) {
        console.log("add layer for " + date);
        map.addLayer(dateLayers[date]);
    }

}

/* format a date object into YYYY-MM-DD */
function dateToString(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + (date.getDate() < 10 ? '0' : '') + date.getDate();;
}

/* keep track of which dates we've already put in the download request for */
var downloadedDates = new Object();

var dateLayers = new Object();

/* download scenes for this given date */
function downloadScenesForDate(date) {
    if (downloadedDates.hasOwnProperty(date)) { // already downloaded
    }else{ //need to download
        console.log("downloading " + date);
        downloadedDates[date] = 1;
        $.getJSON('http://tianjara.net/data/ga/ls8_index/' + date + '.json', function (data) {
            addIndexLayer(map, data, date)
        });
    }
}

function displayScenes(from, to) {
    // for all the date layers we have
    for (var i in dateLayers) {
        // if date within selected range
        if ((new Date(i) >= from) && (new Date(i) <= to)) {
            console.log("add layer " + dateToString(new Date(i)));
            map.addLayer(dateLayers[i]);
        }else{
            console.log("remove layer " + dateToString(new Date(i)));
            map.removeLayer(dateLayers[i]);
        }
    }
}

$("#dateslider").on("valuesChanging", function(e, data){
    //console.log("Something moved. min: " + data.values.min + " max: " + data.values.max);

    /* display/hide all scenes within/outside the selected range */
    displayScenes(data.values.min, data.values.max);

    /* next check which new ones need downloading */
    for (var i = data.values.min; i <= data.values.max; i.setDate(i.getDate() + 1)) {
        downloadScenesForDate(dateToString(i));
    }

});
