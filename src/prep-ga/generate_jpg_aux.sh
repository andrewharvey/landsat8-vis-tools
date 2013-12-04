#!/bin/bash

# This script will generate a GDAL .aux.xml file associated with a JPEG _FR.jpg
# file. It will pull coordinate system and georeferencing information from an
# EODS_metadata.xml file.

# This script is licensed CC0 by Andrew Harvey <andrew.harvey4@gmail.com>
#
# To the extent possible under law, the person who associated CC0
# with this work has waived all copyright and related or neighboring
# rights to this work.
# http://creativecommons.org/publicdomain/zero/1.0/

# check usage
if [ ! -e "$1" ] || [ ! -e "$2" ] ; then
    echo "Usage: $0 <EODS_metadata.xml> <scene.jpg>" >&2
    exit 1
fi

# parse arguments
metadata_file="$1"
scene="$2"

# extract georeferencing from metadata
ulx=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/GEOREFULPOINT_X' $metadata_file`
uly=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/GEOREFULPOINT_Y' $metadata_file`
lrx=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/GEOREFLRPOINT_X' $metadata_file`
lry=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/GEOREFLRPOINT_Y' $metadata_file`

# You only need these if using -gcp rather than -a_ullr
#llx=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/GEOREFLLPOINT_X' $metadata_file`
#lly=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/GEOREFLLPOINT_Y' $metadata_file`
#urx=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/GEOREFURPOINT_X' $metadata_file`
#ury=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/GEOREFURPOINT_Y' $metadata_file`

#dimx=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/DIMENSION_X/SIZE' $metadata_file`
#dimy=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/DIMENSION_Y/SIZE' $metadata_file`

# extract coordinate system information from metadata
proj=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/PROJECTION' $metadata_file | tr 'A-Z' 'a-z'`
zone=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/ZONE' $metadata_file | tr 'A-Z' 'a-z'`
ellps=`xml_grep --text_only 'EODS_DATASET/GRIDSPATIALREPRESENTATION/GEORECTIFIED/ELLIPSOID' $metadata_file`

# generate proj4 string
srs="+proj=$proj +zone=$zone +south +ellps=$ellps +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"

# make a temp directory
tmp=`mktemp -d`


# it seems to create a .aux.xml file we need to write out the JPEG file again
gdal_translate \
    -of JPEG \
    -a_srs "$srs" \
    -a_ullr $ulx $uly $lrx $lry \
    "$scene" \
    "${tmp}/scene.jpg"

# We would like to use this... except black pixels also appear within exposed area not just the border.
#    -a_nodata 0 \
    
# We could specific GCP points instead of assigning bounds using,
#    -gcp 0 0 $ulx $uly -gcp 0 -$dimy $llx $lly -gcp $dimx 0 $urx $ury -gcp $dimx -$dimy $lrx $lry \

# put the generated .aux.xml in the right place
mv "${tmp}/scene.jpg.aux.xml" "${scene}.aux.xml"

# cleanup
cleanup() {
    rm -rf $tmp
}

trap "cleanup" EXIT
