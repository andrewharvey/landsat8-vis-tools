#!/bin/bash

output=templates.js

rm -f $output

for f in templates/* ; do
    basename=$(basename $f .mustache.html)
    echo -n "var ${basename}Template = '" >> $output
    cat "$f" | tr -d '\n' >> $output
    echo "';" >> $output
done
