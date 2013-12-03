#!/usr/bin/perl -w

# This script is licensed CC0 by Andrew Harvey <andrew.harvey4@gmail.com>
#
# To the extent possible under law, the person who associated CC0
# with this work has waived all copyright and related or neighboring
# rights to this work.
# http://creativecommons.org/publicdomain/zero/1.0/

use strict;

use Path::Class;

use Log::Log4perl qw(:easy);
Log::Log4perl->easy_init($INFO); #DEBUG, INFO, WARN, ERROR, FATAL

# to parse the source metadata.xml files
use XML::XPath;
use XML::XPath::XMLParser;

# to generate the geojson index file
use JSON;

# check usage
if (scalar @ARGV < 2) {
    print "Usage: $0 <path to ftp.ga.gov.au> <index.geojson> [date_filter]\n";
    exit 1;
}

# this should be the /path/to/ftp.ga.gov.au directory
my $ftp_mirror_dir = $ARGV[0];
$ftp_mirror_dir = dir($ftp_mirror_dir, 'ftp.ga.gov.au');

# location of GeoJSON index file to write
my $geojson_file = $ARGV[1];

my $date_filter = undef;
if (scalar @ARGV >= 3) {
    $date_filter = $ARGV[2];
    print "Applying date filter ^$date_filter\$\n";
}

# perl structure to store GeoJSON features
my @features;

my $imagery_dir = dir($ftp_mirror_dir, 'outgoing-emergency-imagery');

if (!-d $imagery_dir) {
    die "$imagery_dir doesn't exist, so not writing out an index file.\n";
}

# find out which dates are available from the outgoing-emergency-imagery
# directory
opendir(my $idh, $imagery_dir) or die "Can't list contents of $imagery_dir\n";
my @dates = readdir($idh) or die $!;
closedir $idh or die;

# weed out any directories we may have picked up which don't look like a date
@dates = grep(/^\d{4}-\d{2}-\d{2}$/, @dates);

# if we were given a date filter then apply it now
if (defined $date_filter) {
    @dates = grep(/^$date_filter$/, @dates);
    #@dates = grep {$_ eq $date_filter} @dates;
}

for my $date (@dates) {
    print "$date\n";

    my $date_dir = dir($ftp_mirror_dir, 'outgoing-emergency-imagery', $date);

    # get a list of imagery scenes available
    opendir(my $dh, $date_dir) or die $!;
    my @scenes = readdir($dh) or die $!;
    closedir $dh or die $!;

    for my $scene (@scenes) {
        # we are only interested in Landsat 8 scenes
        if ($scene =~ /^(LS8)/) {
            DEBUG "$scene\n";
            my $localFile = file($date_dir, $scene, 'EODS_metadata.xml');

            if ( -e $localFile ) {
                my $xp = XML::XPath->new(filename => $localFile);
                my @bounds;
                for my $corner ('UL', 'UR', 'LR', 'LL', 'UL') {
                    my $lon = $xp->findvalue("/EODS_DATASET/EXEXTENT/${corner}_LONG/text()")->value();
                    my $lat = $xp->findvalue("/EODS_DATASET/EXEXTENT/${corner}_LAT/text()")->value();
                    push @bounds, [ $lon, $lat ];
                }
                my $bounding_polygon = {
                    'type' => 'Polygon',
                    'coordinates' => [ \@bounds ]
                };

                my %properties = ();

                $properties{'extent_temporalfrom'} = $xp->findvalue("/EODS_DATASET/EXEXTENT/TEMPORALEXTENTFROM/text()")->value();
                $properties{'extent_temporalto'} = $xp->findvalue("/EODS_DATASET/EXEXTENT/TEMPORALEXTENTTO/text()")->value();

                $properties{'mdresource_mdfileid'} = $xp->findvalue("/EODS_DATASET/MDRESOURCE/MDFILEID/text()")->value();
                $properties{'mdresource_filesize'} = $xp->findvalue("/EODS_DATASET/MDRESOURCE/FILESIZE/text()")->value();
                $properties{'mdresource_citation_title'} = $xp->findvalue("/EODS_DATASET/MDRESOURCE/CITATION/TITLE/text()")->value();

                $properties{'image_cloudcoverpercentage'} = $xp->findvalue("/EODS_DATASET/IMAGEDESCRIPTION/CLOUDCOVERPERCENTAGE/text()")->value();

                my %feature = (
                    'type' => 'Feature',
                    'properties' => \%properties,
                    'geometry' => \%{$bounding_polygon}
                );

                push @features, \%feature;
            }
        }
    }
}

my $geojson = { 'type' => "FeatureCollection" };
$geojson->{'features'} = \@features;

print "writing $geojson_file...\n";

open (my $geojson_fh, ">", $geojson_file) or die "Can't open '$geojson_file' for writting.\n";
print $geojson_fh encode_json($geojson) . "\n";
