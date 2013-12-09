#!/bin/bash

# This script is licensed CC0 by Andrew Harvey <andrew.harvey4@gmail.com>
#
# To the extent possible under law, the person who associated CC0
# with this work has waived all copyright and related or neighboring
# rights to this work.
# http://creativecommons.org/publicdomain/zero/1.0/

scene=$1
output_dir=$2

if [ -z $scene ] || [ -z $output_dir ] ; then
    echo "Usage: $0 SCENE_IDENTIFIER <output_directory>"
    exit 1
fi

output_dir="$output_dir/$scene"

# extract the date from the scene identifier
date=`echo $scene | sed --regexp-extended 's/^.*([0-9]{4})([0-9]{2})([0-9]{2})$/\1-\2-\3/'`

if [ -z $date ] ; then
    echo "Couldn't extract the date from identifier '$scene'\n";
    exit 1
fi

scene_dir="ftp://ftp.ga.gov.au/outgoing-emergency-imagery/$date/$scene"


echo $scene_dir

if [ ! -d $output_dir ] ; then
    mkdir -p $output_dir
fi

function get {
   # try 100 times because ftp.ga.gov.au will frequency drop the connection and
   # wget issues "Data transfer aborted."
   # I have asked GA about this, if this is intentional, if I should rate limit,
   # if I should just keep retrying the connection, or what the deal is, but
   # they didn't reply to my query, so until such time as I know more lets just
   # force it.
   wget --continue --no-clobber --tries=500 --directory-prefix="$output_dir" "$scene_dir/$1"
}

# get LICENSE but give it a more sensible name!
#wget --directory-prefix="$output_dir" --output-document=LICENSE.pdf "$scene_dir/Attribution%20and%20licence%20summary%20for%20generic%20~%20data%20sourced%20from%20Geoscience%20Australia%20under%20CC%20BY%203.0.pdf"

# get checksums
get md5sum.txt

# get metadata
get EODS_metadata.xml
get GA_Metadata.xml
get metadata.xml

# get scene
#get scene01.zip

# change into our target directory to make the next commands simpler
cd $output_dir

    # extract zip
    mkdir "scene01"
    # force files into set directory for added security
    unzip -j -d scene01 scene01.zip

    # print checksum report
    md5sum --check md5sum.txt

    rm -f scene01.zip
