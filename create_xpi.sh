#!/bin/bash

set -e

zip -x `basename $0` -r zoterename.zip *
mv zoterename.zip zoterename.xpi

