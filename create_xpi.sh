#!/bin/bash

set -e

zip -x `basename $0` -x "*/.DS_Store" -x "*.xpi" -r zoterename.zip *
mv zoterename.zip zoterename.xpi

