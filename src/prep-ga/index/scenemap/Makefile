
# This script will help you download and prepare the Landsat 8 scene path/row
# map index for web visualisation.

# To the extent possible under law, the person who associated CC0
# with this work has waived all copyright and related or neighboring
# rights to this work.
# http://creativecommons.org/publicdomain/zero/1.0/

file=wrs2_descending.zip

base=`basename ${file} .zip`

all : clean_all download unzip togeojson clean_source

clean_all : clean_source clean_target

clean_source :
	rm -rf ${file} ${base}
	
clean_target :
	rm -rf ${base}.json

download :
	# This file is public domain because it is a work of the US Government
	wget -O ${file} http://landsat.usgs.gov/documents/${file}

unzip :
	unzip -d ${base} -j ${file}

togeojson :
	# The target file is released to the public domain because it is created
	# from a work of the US Government
	ogr2ogr \
	    -select 'PATH,ROW,PR' \
	    -spat 111.75 -44.65 155.61 -1.05 \
	    -f GeoJSON \
	    ${base}.json \
	    ${base}/${base}.shp

