#!/bin/sh

if [ -z "$1" ] || [ -z "$2" ] ; then
    echo "Usage: $0 <directory-prefix> YYYY-MM-DD"
else
    # recursive = download from sub folders
    # no-clobber = don't redownload files we already have
    # accept = only download the EODS_metadata.xml file (use CSV for others)
    # no-parent = don't recurse up outside this directory
    # and finally put the url in quotes so in case $1 uses a glob (*) so wget sees
    # it rather than letting the shell try to expand it
    # P.S. This will break in year 2100!
    echo "$1"
    wget \
        --recursive \
        --no-clobber \
        --accept 'EODS_metadata.xml' \
        --no-parent \
        --directory-prefix="$1" \
        "ftp://ftp.ga.gov.au/outgoing-emergency-imagery/$2"
fi
