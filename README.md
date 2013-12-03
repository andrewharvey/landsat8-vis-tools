# About
Tools to visualise Landsat 8 data.

This effort is currently in heavy development.

# License
All files within this repository are licensed by the author,
Andrew Harvey<andrew.harvey4@gmail.com> as follows.

    To the extent possible under law, the person who associated CC0
    with this work has waived all copyright and related or neighboring
    rights to this work.
    http://creativecommons.org/publicdomain/zero/1.0/

# Using the scripts
## prep-*
This will prepare the Landsat data we need for the next steps, sourcing the data
from,

* ga - Geoscience Australia
* usgs - USGS

   ./src/prep-SOURCE/scene-downloader.sh SCENE_IDENTIFIER original_scenes

You can use the process from prep-ga/index to work out which SCENE_IDENTIFIER to
use.

### prep-ga/index
This will generate an index of LS8 scenes available from Geoscience Australia.
The code consists of three parts, mirroring code to download the index from GA
onto your local system, code to process that mirror, and code to visualise the
index via the web.

#### prep-ga/index/mirror

You can mirror the metadata for all scenes on a given date using,

    ./src/prep-ga/index/mirror/get-metadata-by-day.sh MIRROR_DIRECTORY YYYY-MM-DD

If you want to automate this to run everyday the provided cron.daily script may help you.

#### prep-ga/index/process

    ./process/generate-geojson-index.pl MIRROR_DIRECTORY index.json

This will produce a GeoJSON index file of all the scenes downloaded using the
mirror script.

The script in cron.daily will also automate this processing step to produce a
daily index GeoJSON file.

#### prep-ga/index/www

This contains a simple web application to visualise a series of dated index.json
files. Such as those produced by the scripts previous described.

## vis-scene-*
This will take a Level 1 Landsat 8 scene obtained from the previous prep step
and produce a set of visualisation data files using either GDAL or OTB.

By running,

    ./src/vis-scene-YOUR_METHOD/visualise-scene.sh 

### vis-scene-gdal
If you use the GDAL based pipeline for the visualisation step,
* the imagery can be processed quickly with minimal system resources,
* and without needing to install other applications, just GDAL tools,
* but the quality of the output isn't as great as it could be. 

### vis-scene-otb
If you use the OTB based pipeline for the visualisation step,
* processing the imagery can take a while and will consume your system resources,
* and requires the OTB Applications to be installed,
* however the quality of the output is better. 

